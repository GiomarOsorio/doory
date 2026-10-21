"""The export pipelines.

* PDF: sanitise every page SVG the browser sent, build one HTML document, print it.
* Image: draw pages of a saved design on the server with the editor's own engine (the frontend's headless
  render page), one at a time, then convert each PNG to the requested format; several pages go into a ZIP.
"""

from __future__ import annotations

import io
import json
import logging
import re
import zipfile
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field, replace
from datetime import datetime
from typing import Any

from django.conf import settings
from django.db.models.functions import Lower
from PIL import Image, UnidentifiedImageError, features

from apps.core.svg import SvgError, sanitize_svg
from apps.designs.edits import current_document
from apps.fonts.models import FontFamily
from apps.fonts.serializers import FontFamilySerializer, with_variants
from apps.fonts.usage import font_names_in_document, uploaded_fonts_used_by

from . import optimizers
from .exceptions import ExportFailed, ExportUnavailable, ImageExportDisabled, InvalidExport, PayloadTooLarge
from .filenames import export_filename, page_filename
from .fonts import load_fonts
from .layout import PageGeometry, build_document_html, prepare_page_svg
from .pdfmeta import finalize_pdf
from .renderer import RenderResult, allowed_origins, render_image, render_pdf, render_slot

logger = logging.getLogger("doory.exports")


@dataclass(frozen=True)
class ExportRequest:
    pages: Sequence[bytes]
    width: float
    height: float
    sizes: Sequence[tuple[float, float]] | None = None  # trim size per page; None: `width` x `height`
    bleed_mm: float = 0.0
    crop_marks: bool = False
    title: str = ""
    lang: str = "en"
    fonts: Sequence[dict] = ()
    owner: object = None  # the account asking; it may have one render at a time

    def page_sizes(self) -> list[tuple[float, float]]:
        """The trim size of every page, in px."""
        if self.sizes is None:
            return [(self.width, self.height)] * len(self.pages)
        return list(self.sizes)


def sanitize_pages(pages: Sequence[bytes]) -> list[bytes]:
    """Every page goes through the shared SVG sanitiser; one unusable page rejects the whole request."""
    clean: list[bytes] = []
    for number, data in enumerate(pages, start=1):
        try:
            clean.append(sanitize_svg(data, allow_links=True))
        except SvgError:
            raise InvalidExport("invalid_svg", f"Page {number} is not a valid, safe SVG.")
    return clean


def export_pdf(request: ExportRequest) -> RenderResult:
    """Run the whole pipeline; the browser part holds one render slot (`ExportBusy` when none is free)."""
    sizes = request.page_sizes()
    if len(sizes) != len(request.pages):
        raise InvalidExport("invalid_sizes", "Give exactly one size per page.")
    geometries = [
        PageGeometry.create(width, height, request.bleed_mm, request.crop_marks) for width, height in sizes
    ]
    with render_slot(request.owner):
        sanitized = sanitize_pages(request.pages)
        fonts = load_fonts(request.fonts, allowed_origins())
        document = build_document_html(
            [prepare_page_svg(svg, geometry) for svg, geometry in zip(sanitized, geometries, strict=True)],
            geometries,
            request.title,
            fonts,
            request.lang,
        )
        result = render_pdf(document, width_px=geometries[0].page_width, height_px=geometries[0].page_height)
    pdf = finalize_pdf(result.pdf, geometries, title=request.title, lang=request.lang)
    logger.info(
        "PDF export: %d page(s), %d byte(s), %d blocked request(s)",
        len(sanitized),
        len(pdf),
        result.blocked_total,
    )
    return replace(result, data=pdf)


# ---- image export ------------------------------------------------------------------------------

IMAGE_FORMATS = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "avif": "image/avif"}
FORMAT_ALIASES = {"jpeg": "jpg"}
AUTO = "auto"  # every format this server makes; the smallest file wins
ZIP_MIME = "application/zip"
MIN_SCALE, MAX_SCALE = 0.1, 4.0
QUALITY_PRESETS = {"small": 65, "balanced": 82, "best": 95, "original": 100}
# AVIF is slow to encode: above this many pixels it uses speed 6 instead of 4 (much faster, a little bigger).
AVIF_FAST_PIXELS = 8_000_000
_SIZE = re.compile(r"^\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>[xwh])\s*$", re.IGNORECASE)
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_PNG_METADATA = frozenset({b"tEXt", b"zTXt", b"iTXt", b"tIME", b"eXIf"})  # left out by `strip_metadata`
_PNG_PROFILE = frozenset({b"iCCP"})  # left out by `srgb`


@dataclass(frozen=True)
class ImageResult:
    data: bytes
    format: str  # png, jpg, webp or avif
    mime: str
    width: int
    height: int
    page_id: str
    page_index: int
    placeholders: int = 0
    missing_fonts: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()
    blocked_total: int = 0
    # What the download name is made of (`filenames.page_filename`): the page's own size, the design's page
    # count and its size preset.
    page_width: float = 0
    page_height: float = 0
    page_count: int = 1
    preset: str = ""
    bytes_before: int = 0  # the PNG as drawn, before it was converted
    # How the file was made: format, quality (after a `max_bytes` search), scale and the other options, and
    # for `auto` the size of every format it compared.
    options_used: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ImageBundle:
    """What `export_images` made: the file of one page, or a ZIP of several."""

    data: bytes
    format: str  # the image format, or "zip"
    mime: str
    filename: str
    images: tuple[ImageResult, ...]  # one per page, in order
    filenames: tuple[str, ...]  # the name of each page's file (inside the ZIP)

    @property
    def placeholders(self) -> int:
        return sum(image.placeholders for image in self.images)

    @property
    def warnings(self) -> tuple[str, ...]:
        if len(self.images) == 1:
            return self.images[0].warnings
        return tuple(
            f"Page {image.page_index + 1}: {text}" for image in self.images for text in image.warnings
        )


@dataclass(frozen=True)
class Encoding:
    """How the drawn PNG becomes the file (`export_image`'s options, checked)."""

    format: str  # one of IMAGE_FORMATS, or AUTO
    quality: int = 90
    transparent: bool = False
    max_bytes: int | None = None
    png_colors: int | None = None
    strip_metadata: bool = True
    srgb: bool = True
    progressive: bool = False


@dataclass(frozen=True)
class Converted:
    data: bytes
    format: str
    options: dict[str, Any]
    warnings: tuple[str, ...] = ()


def image_formats() -> tuple[str, ...]:
    """The formats this server makes: AVIF needs a Pillow built with libavif."""
    return tuple(fmt for fmt in IMAGE_FORMATS if fmt != "avif" or features.check("avif"))


def avif_speed(width: int, height: int) -> int:
    return 6 if width * height > AVIF_FAST_PIXELS else 4


def parse_size(size: str, width: float, height: float) -> float:
    """The scale a `size` means for a page of `width` x `height`: "2x" (a scale), "1080w" (that many pixels
    wide) or "1350h" (that many pixels high)."""
    match = _SIZE.match(size) if isinstance(size, str) else None
    if match is None or (match["unit"].lower() != "x" and not float(match["value"]).is_integer()):
        raise InvalidExport("invalid_size", 'The size must look like "2x", "1080w" or "1350h".')
    value, unit = float(match["value"]), match["unit"].lower()
    scale = value if unit == "x" else value / (width if unit == "w" else height)
    if not MIN_SCALE <= scale <= MAX_SCALE:
        side = height if unit == "h" else width
        raise InvalidExport(
            "invalid_size",
            f"{size.strip()} is {scale:.2f}x this page; the size must be between {MIN_SCALE:g}x and "
            f"{MAX_SCALE:g}x ({round(side * MIN_SCALE)} to {round(side * MAX_SCALE)} px "
            f"{'high' if unit == 'h' else 'wide'}).",
        )
    return scale


def _quality(quality: int | str) -> int:
    if isinstance(quality, str) and quality.strip().lower() in QUALITY_PRESETS:
        return QUALITY_PRESETS[quality.strip().lower()]
    if isinstance(quality, bool) or not isinstance(quality, int) or not 1 <= quality <= 100:
        raise InvalidExport(
            "invalid_quality",
            "The quality must be a whole number from 1 to 100, or one of " + ", ".join(QUALITY_PRESETS) + ".",
        )
    return quality


def _whole(value, low: int, high: int | None = None) -> bool:
    return (
        not isinstance(value, bool)
        and isinstance(value, int)
        and value >= low
        and (high is None or value <= high)
    )


def _encoding(
    format: str,
    quality: int | str,
    *,
    transparent: bool,
    max_bytes: int | None,
    png_colors: int | None,
    strip_metadata: bool,
    srgb: bool,
    progressive: bool,
) -> Encoding:
    """The checked `Encoding` of an export's options; InvalidExport for one that is out of range."""
    fmt = FORMAT_ALIASES.get(str(format).lower(), str(format).lower())
    if fmt not in (*IMAGE_FORMATS, AUTO):
        raise InvalidExport("invalid_format", "The format must be png, jpg, webp, avif or auto.")
    if fmt != AUTO and fmt not in image_formats():
        raise InvalidExport("format_unavailable", f"This server can't make {fmt.upper()} images.")
    quality = _quality(quality)
    if max_bytes is not None and not _whole(max_bytes, 1):
        raise InvalidExport("invalid_max_bytes", "max_bytes must be a whole number of bytes, 1 or more.")
    if png_colors is not None and not _whole(png_colors, 2, 256):
        raise InvalidExport("invalid_png_colors", "png_colors must be a whole number from 2 to 256.")
    return Encoding(
        format=fmt,
        quality=quality,
        transparent=bool(transparent) and fmt != "jpg",
        max_bytes=max_bytes,
        png_colors=png_colors,
        strip_metadata=bool(strip_metadata),
        srgb=bool(srgb),
        progressive=bool(progressive),
    )


def page_index(page: int | str | None) -> int | str | None:
    """A page as the API and MCP name it (its id, or its number counting from 1) as `export_image` takes it
    (its id, or its 0-based index)."""
    if isinstance(page, int) and not isinstance(page, bool):
        if page < 1:
            raise InvalidExport("page_not_found", "Pages are numbered from 1.")
        return page - 1
    return page


def _pick_page(document: dict, page: int | str | None) -> tuple[dict, int]:
    pages = document.get("pages") if isinstance(document, dict) else None
    if not isinstance(pages, list) or not pages:
        raise InvalidExport("invalid_document", "The design has no pages.")
    if page is None:
        index = 0
    elif isinstance(page, int) and not isinstance(page, bool):
        index = page
    elif isinstance(page, str):
        index = next((i for i, p in enumerate(pages) if isinstance(p, dict) and p.get("id") == page), -1)
    else:
        index = -1
    if not 0 <= index < len(pages) or not isinstance(pages[index], dict):
        raise InvalidExport("page_not_found", f"The design has no page {page!r}.")
    return pages[index], index


def _preset_id(document: dict) -> str:
    meta = document.get("meta")
    preset = meta.get("presetId") if isinstance(meta, dict) else None
    return preset if isinstance(preset, str) else ""


def _page_size(document: dict, page: dict) -> tuple[float, float]:
    """`pageSize` of the editor: the page's own size, else the design's."""
    try:
        width = float(page.get("width") or document.get("width") or 0)
        height = float(page.get("height") or document.get("height") or 0)
    except (TypeError, ValueError):
        width = height = 0
    if not (width > 0 and height > 0):
        raise InvalidExport("invalid_document", "The page has no size.")
    return width, height


def font_manifest(page: dict, owner) -> list[dict[str, Any]]:
    """The font families `page` names, in the fonts API's shape: the owner's uploaded ones (which win, as in
    the editor) and the catalogue's."""
    single = {"pages": [page]}
    uploaded = uploaded_fonts_used_by(single, owner)
    taken = {family.family.casefold() for family in uploaded}
    wanted = [name.casefold() for name in font_names_in_document(single) if name.casefold() not in taken]
    catalogue = (
        list(
            FontFamily.objects.filter(owner__isnull=True, is_published=True)
            .annotate(folded=Lower("family"))
            .filter(folded__in=wanted)
            .prefetch_related(with_variants())
            .order_by("family", "id")
        )
        if wanted
        else []
    )
    return json.loads(json.dumps(FontFamilySerializer([*uploaded, *catalogue], many=True).data))


def _convert(png: bytes, encoding: Encoding) -> Converted:
    """PNG as drawn (or with fewer colours); JPG flattened on white (no alpha); WebP and AVIF with alpha only
    for a transparent export. `auto` makes every format that fits and keeps the smallest file."""
    image, info = None, {}
    if encoding.format != "png" or encoding.png_colors:  # a PNG as drawn is not decoded at all
        with Image.open(io.BytesIO(png)) as source:
            image, info = source.convert("RGBA"), dict(source.info)
        image.info = {}  # metadata goes in only on request (`_metadata`)
    if encoding.format != AUTO:
        return _convert_to(png, image, info, encoding)
    formats = [fmt for fmt in image_formats() if not (fmt == "jpg" and encoding.transparent)]
    tried = [_convert_to(png, image, info, replace(encoding, format=fmt)) for fmt in formats]
    best = min(tried, key=lambda converted: len(converted.data))
    return replace(best, options=best.options | {"compared": {c.format: len(c.data) for c in tried}})


def _convert_to(png: bytes, image: Image.Image | None, info: dict, encoding: Encoding) -> Converted:
    fmt = encoding.format
    if fmt == "png":
        return _to_png(png, image, info, encoding)
    if fmt == "jpg" or not encoding.transparent:
        flat = Image.new("RGBA", image.size, (255, 255, 255, 255))
        flat.alpha_composite(image)
        image = flat.convert("RGB")
    extra = _metadata(info, encoding)
    options: dict[str, Any] = {"format": fmt}
    if fmt == "jpg":
        options["progressive"] = encoding.progressive
        extra |= {"optimize": True, "progressive": encoding.progressive}
    elif fmt == "webp":
        extra["method"] = 4
    else:
        options["speed"] = extra["speed"] = avif_speed(*image.size)
    kind = {"jpg": "JPEG", "webp": "WEBP", "avif": "AVIF"}[fmt]

    def encode(quality: int) -> bytes:
        out = io.BytesIO()
        image.save(out, kind, quality=quality, **extra)
        return out.getvalue()

    data, quality = encode(encoding.quality), encoding.quality
    warnings: tuple[str, ...] = ()
    if encoding.max_bytes is not None and len(data) > encoding.max_bytes:
        data, quality = _fit(encode, encoding.quality, encoding.max_bytes, data)
        if len(data) > encoding.max_bytes:
            warnings = (
                f"Even at quality {quality} the {fmt.upper()} is {len(data)} bytes, more than max_bytes "
                f"({encoding.max_bytes}); use a smaller size.",
            )
    return Converted(data, fmt, options | {"quality": quality}, warnings)


def _fit(encode, quality: int, max_bytes: int, first: bytes) -> tuple[bytes, int]:
    """The highest quality below `quality` whose file is at most `max_bytes` (a binary search, at most seven
    encodes), else the smallest file tried."""
    fitting, smallest = None, (first, quality)
    low, high = 1, quality - 1
    while low <= high:
        middle = (low + high) // 2
        data = encode(middle)
        if len(data) <= max_bytes:
            fitting, low = (data, middle), middle + 1
        else:
            high = middle - 1
            if len(data) < len(smallest[0]):
                smallest = (data, middle)
    return fitting or smallest


def _optimized(
    converted: Converted,
    optimizer: optimizers.Optimizer | None,
    encoding: Encoding,
    *,
    source: bytes,
    width: int,
    height: int,
) -> Converted:
    """`converted` made smaller by `optimizer` (None: as it is). The options say which optimizer ran and how
    large the file was before; a `max_bytes` warning goes when the optimized file fits after all."""
    if optimizer is None:
        return converted
    result = optimizers.optimize(
        optimizer,
        optimizers.Job(
            converted.data,
            converted.format,
            width,
            height,
            quality=converted.options.get("quality"),
            strip_metadata=encoding.strip_metadata,
            srgb=encoding.srgb,
            progressive=encoding.progressive,
            source=source,
        ),
    )
    fits = encoding.max_bytes is not None and len(result.data) <= encoding.max_bytes
    return Converted(
        result.data,
        converted.format,
        converted.options
        | {
            "optimizer": result.optimizer or None,
            "optimized": result.optimized,
            "bytes_before_optimizing": result.bytes_before,
        },
        (() if fits else converted.warnings) + result.warnings,
    )


def _to_png(png: bytes, image: Image.Image | None, info: dict, encoding: Encoding) -> Converted:
    """The PNG as drawn, without the chunks `strip_metadata` and `srgb` leave out; with `png_colors`, a
    palette PNG instead when that is smaller (never bigger than the PNG as drawn)."""
    data = _strip_png(png, encoding)
    options: dict[str, Any] = {"format": "png", "png_colors": None}
    if encoding.png_colors:
        method = (
            Image.Quantize.LIBIMAGEQUANT
            if features.check_feature("libimagequant")
            else Image.Quantize.FASTOCTREE
        )
        source = image if encoding.transparent else image.convert("RGB")
        out = io.BytesIO()
        source.quantize(colors=encoding.png_colors, method=method).save(
            out, "PNG", optimize=True, **_metadata(info, encoding)
        )
        if len(out.getvalue()) < len(data):
            data, options["png_colors"] = out.getvalue(), encoding.png_colors
    warnings: tuple[str, ...] = ()
    if encoding.max_bytes is not None and len(data) > encoding.max_bytes:
        warnings = (
            f"The PNG is {len(data)} bytes, more than max_bytes ({encoding.max_bytes}); a PNG has no quality "
            "to lower. Use png_colors, a smaller size or another format.",
        )
    return Converted(data, "png", options, warnings)


def _metadata(info: dict, encoding: Encoding) -> dict[str, Any]:
    """What the drawn PNG carried and the export keeps: its colour profile without `srgb`, its Exif data
    without `strip_metadata`."""
    extra = {}
    if not encoding.srgb and info.get("icc_profile"):
        extra["icc_profile"] = info["icc_profile"]
    if not encoding.strip_metadata and info.get("exif"):
        extra["exif"] = info["exif"]
    return extra


def _strip_png(png: bytes, encoding: Encoding) -> bytes:
    """`png` without its text, time and Exif chunks (`strip_metadata`) and its ICC profile (`srgb`); the same
    bytes when it has none, or when it can't be read chunk by chunk."""
    drop = (_PNG_METADATA if encoding.strip_metadata else frozenset()) | (
        _PNG_PROFILE if encoding.srgb else frozenset()
    )
    if not drop or not png.startswith(_PNG_SIGNATURE):
        return png
    kept, at = [_PNG_SIGNATURE], len(_PNG_SIGNATURE)
    while at + 12 <= len(png):
        end = at + 12 + int.from_bytes(png[at : at + 4], "big")
        if png[at + 4 : at + 8] not in drop:
            kept.append(png[at:end])
        at = end
    return b"".join(kept) if at == len(png) else png


def export_image(
    design,
    *,
    page: int | str | None = None,
    format: str = "png",
    quality: int | str = 90,
    scale: float = 1,
    transparent: bool = False,
    size: str | None = None,
    max_bytes: int | None = None,
    png_colors: int | None = None,
    strip_metadata: bool = True,
    srgb: bool = True,
    progressive: bool = False,
    optimize: bool | str = False,
) -> ImageResult:
    """Draw one page of `design` (its live editor state when it is open, else the saved document) as PNG, JPG,
    WebP or AVIF, or `auto`: the smallest of those. `page` is an index or a page id (default: the first page);
    `transparent` leaves the page background out (not for JPG).

    `size` ("2x", "1080w", "1350h") replaces `scale`. `quality` is 1-100 or a preset (small, balanced, best,
    original); with `max_bytes`, JPG, WebP and AVIF are made at the highest quality up to `quality` that fits.
    `png_colors` (2-256) makes a palette PNG when that is smaller. `strip_metadata` and `srgb` leave the drawn
    PNG's metadata and colour profile out; `progressive` is for JPG. `optimize` makes the file smaller
    afterwards: True (the server's default optimizer) or an optimizer's id (`apps.exports.optimizers`). Raises
    `InvalidExport`, `PayloadTooLarge` and the `Export*` exceptions."""
    if not settings.SERVER_IMAGE_EXPORT_ENABLED:
        raise ImageExportDisabled
    if not settings.EXPORT_RENDER_PAGE_URL:
        raise ExportUnavailable
    encoding = _encoding(
        format,
        quality,
        transparent=transparent,
        max_bytes=max_bytes,
        png_colors=png_colors,
        strip_metadata=strip_metadata,
        srgb=srgb,
        progressive=progressive,
    )
    optimizer = optimizers.choose(optimize)
    if size is None:
        try:
            scale = float(scale)
        except (TypeError, ValueError):
            scale = 0.0
        if not MIN_SCALE <= scale <= MAX_SCALE:
            raise InvalidExport(
                "invalid_scale", f"The scale must be between {MIN_SCALE:g} and {MAX_SCALE:g}."
            )
    transparent = encoding.transparent

    document = current_document(design)
    if len(json.dumps(document, separators=(",", ":"))) > settings.EXPORT_IMAGE_MAX_DOCUMENT_BYTES:
        raise PayloadTooLarge("The design is too large to export as an image on the server.")
    page_obj, index = _pick_page(document, page)
    width, height = _page_size(document, page_obj)
    if size is not None:
        scale = parse_size(size, width, height)
    if round(width * scale) * round(height * scale) > settings.EXPORT_IMAGE_MAX_PIXELS:
        raise InvalidExport(
            "too_large",
            f"{round(width * scale)} x {round(height * scale)} px is more than this server exports "
            f"({settings.EXPORT_IMAGE_MAX_PIXELS} pixels); use a smaller scale.",
        )
    payload = {
        "document": document,
        "page": index,
        "multiplier": scale,
        "transparent": transparent,
        "fonts": font_manifest(page_obj, design.owner),
    }
    with render_slot(design.owner_id):
        result = render_image(payload, render_url=settings.EXPORT_RENDER_PAGE_URL)
    try:
        converted = _convert(result.data, encoding)
    except (OSError, ValueError) as exc:
        logger.error("Image export: the render page sent an unreadable PNG (%s)", exc)
        raise ExportFailed from exc
    converted = _optimized(
        converted, optimizer, encoding, source=result.data, width=result.width, height=result.height
    )
    warnings = []
    if result.placeholders:
        warnings.append(
            f"{result.placeholders} object(s) could not be loaded (usually a picture) and are drawn as "
            "grey boxes."
        )
    if result.missing_fonts:
        warnings.append("Drawn in a fallback font: " + ", ".join(result.missing_fonts) + ".")
    warnings.extend(converted.warnings)
    data = converted.data
    logger.info(
        "Image export: design=%s page=%d %s %dx%d, %d byte(s) (drawn: %d), %d placeholder(s), "
        "%d blocked request(s)",
        design.pk,
        result.page_index,
        converted.format,
        result.width,
        result.height,
        len(data),
        len(result.data),
        result.placeholders,
        result.blocked_total,
    )
    return ImageResult(
        data=data,
        format=converted.format,
        mime=IMAGE_FORMATS[converted.format],
        width=result.width,
        height=result.height,
        page_id=result.page_id,
        page_index=result.page_index,
        placeholders=result.placeholders,
        missing_fonts=result.missing_fonts,
        warnings=tuple(warnings),
        blocked_total=result.blocked_total,
        page_width=width,
        page_height=height,
        page_count=len(document["pages"]),
        preset=_preset_id(document) or design.preset,
        bytes_before=len(result.data),
        options_used={
            **converted.options,
            "scale": scale,
            "transparent": transparent,
            "strip_metadata": encoding.strip_metadata,
            "srgb": encoding.srgb,
            **({"max_bytes": max_bytes} if max_bytes is not None else {}),
        },
    )


@dataclass(frozen=True)
class OptimizedImage:
    """What `optimize_image` made of a PNG the browser drew."""

    data: bytes
    format: str
    mime: str
    width: int
    height: int
    bytes_in: int  # the PNG that was sent
    bytes_before_optimizing: int  # the converted file, before the optimizer
    optimizer: str  # the optimizer asked ("" for none)
    optimized: bool  # whether its smaller file was kept
    warnings: tuple[str, ...] = ()
    options_used: dict[str, Any] = field(default_factory=dict)


def optimize_image(
    png: bytes,
    *,
    format: str = "png",
    quality: int | str = 90,
    transparent: bool = False,
    max_bytes: int | None = None,
    png_colors: int | None = None,
    strip_metadata: bool = True,
    srgb: bool = True,
    progressive: bool = False,
    optimize: bool | str = True,
    owner: object = None,
) -> OptimizedImage:
    """Convert a PNG the browser drew as `export_image` converts the PNG the server drew (same options), then
    optimize it. For browser downloads: AVIF, WebP where the browser can't make it, and the optimizers. The
    image must be a PNG of at most `EXPORT_IMAGE_MAX_PIXELS` (Pillow's decompression-bomb limit stays on);
    one conversion holds a render slot of `owner`. Raises `InvalidExport` and `ExportBusy`."""
    encoding = _encoding(
        format,
        quality,
        transparent=transparent,
        max_bytes=max_bytes,
        png_colors=png_colors,
        strip_metadata=strip_metadata,
        srgb=srgb,
        progressive=progressive,
    )
    optimizer = optimizers.choose(optimize)
    unreadable = InvalidExport("invalid_image", "The file is not a readable PNG image.")
    try:
        with Image.open(io.BytesIO(png)) as image:
            if image.format != "PNG":
                raise InvalidExport("invalid_image", "Send the image as a PNG.")
            width, height = image.size
            if width * height > settings.EXPORT_IMAGE_MAX_PIXELS:
                raise InvalidExport(
                    "too_large",
                    f"{width} x {height} px is more than this server converts "
                    f"({settings.EXPORT_IMAGE_MAX_PIXELS} pixels).",
                )
            image.load()  # a truncated or broken file fails here, not halfway through an optimizer
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, SyntaxError) as exc:
        raise unreadable from exc
    with render_slot(owner):
        try:
            converted = _convert(png, encoding)
        except (OSError, ValueError) as exc:
            raise unreadable from exc
        converted = _optimized(converted, optimizer, encoding, source=png, width=width, height=height)
    options = converted.options
    logger.info(
        "Image optimize: %s %dx%d, %d byte(s) in, %d out, optimizer=%s",
        converted.format,
        width,
        height,
        len(png),
        len(converted.data),
        options.get("optimizer"),
    )
    return OptimizedImage(
        data=converted.data,
        format=converted.format,
        mime=IMAGE_FORMATS[converted.format],
        width=width,
        height=height,
        bytes_in=len(png),
        bytes_before_optimizing=options.get("bytes_before_optimizing", len(converted.data)),
        optimizer=options.get("optimizer") or "",
        optimized=bool(options.get("optimized")),
        warnings=converted.warnings,
        options_used={
            **options,
            "transparent": encoding.transparent,
            "strip_metadata": encoding.strip_metadata,
            "srgb": encoding.srgb,
        },
    )


def pick_pages(design, pages: str | Sequence[int | str | None] | None) -> list[int]:
    """The 0-based indexes of `pages` in the design as it is now: "all", or indexes and page ids as
    `export_image` takes them (None: the first page). Repeats are dropped; more than `EXPORT_IMAGE_MAX_PAGES`
    pages are refused."""
    document = current_document(design)
    if pages is None:
        pages = [None]
    if isinstance(pages, str) and pages.strip().lower() == "all":
        _pick_page(document, None)  # refuses a design without pages
        indexes = list(range(len(document["pages"])))
    elif isinstance(pages, list | tuple) and pages:
        indexes = list(dict.fromkeys(_pick_page(document, page)[1] for page in pages))
    else:
        raise InvalidExport("invalid_pages", 'Give "all" or a list of pages.')
    if len(indexes) > settings.EXPORT_IMAGE_MAX_PAGES:
        raise InvalidExport(
            "too_many_pages",
            f"This server exports at most {settings.EXPORT_IMAGE_MAX_PAGES} pages at once, "
            f"not {len(indexes)}.",
        )
    return indexes


def export_images(
    design,
    *,
    pages: str | Sequence[int | str | None] | None = None,
    filename_style: str | None = None,
    unix: int | None = None,
    charge: Callable[[int], None] | None = None,
    **options: Any,
) -> ImageBundle:
    """Draw `pages` (see `pick_pages`) of `design` with `export_image` and its `options`, one render at a
    time, and pack them into a ZIP; a single page comes back as its own file. Before anything is drawn,
    `charge` is called with the number of pages after the first (to count them against a rate limit). The
    files are named by `filenames.page_filename` in `filename_style` (default `EXPORT_FILENAME_STYLE`), the
    ZIP after the design's title."""
    indexes = pick_pages(design, pages)
    if charge is not None and len(indexes) > 1:
        charge(len(indexes) - 1)
    style = filename_style or settings.EXPORT_FILENAME_STYLE
    images = tuple(export_image(design, page=index, **options) for index in indexes)
    names = tuple(page_filename(design.title, image, style=style, unix=unix) for image in images)
    if len(images) == 1:
        return ImageBundle(images[0].data, images[0].format, images[0].mime, names[0], images, names)
    out = io.BytesIO()
    made = datetime.now().timetuple()[:6]
    with zipfile.ZipFile(out, "w") as archive:
        for name, image in zip(names, images, strict=True):
            entry = zipfile.ZipInfo(name, date_time=made)
            entry.compress_type = zipfile.ZIP_STORED  # PNG, JPG, WebP and AVIF are compressed already
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, image.data)
    return ImageBundle(out.getvalue(), "zip", ZIP_MIME, export_filename(design.title, "zip"), images, names)
