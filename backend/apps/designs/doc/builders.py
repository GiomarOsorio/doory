"""Objects built the way the editor's "Add …" actions build them (`objects/factories.ts`).

Positions given to the builders are the top-left corner of the object's box in page pixels; the objects
themselves are centred on their position (`originX/Y: center`), like every object the editor makes.
"""

from __future__ import annotations

import copy
import json
import math
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

SHAPE_FILL = "#7a64e0"
TEXT_COLOR = "#1c1517"
HEADING_FONT = '"Plus Jakarta Sans", sans-serif'
BODY_FONT = '"Inter", sans-serif'
PRESET_PAGE_SIDE = 559  # the page side the text presets are specified for (A5 at 96 dpi)
FONT_SIZE_MULT = 1.13  # Fabric's `_fontSizeMult`: a line of text is this many font sizes tall
QR_SIDE = 512  # the QR code SVG the editor renders is 512 px square
QR_MAX_TEXT = 1000

TextPreset = Literal["heading", "subheading", "body"]
TextAlign = Literal["left", "center", "right", "justify"]
ShapeKind = Literal["rect", "ellipse", "triangle", "polygon", "star", "path"]

# The editor's catalogue shapes (`shapeGeometry.ts` PATH_SHAPES) as Fabric stores them: the parsed path and
# the size of its exact bounding box. Taken from the editor; the contract test fails if they drift apart.
PATH_SHAPES: dict[str, dict] = json.loads((Path(__file__).with_name("path_shapes.json")).read_text())
PathShapeId = Literal[tuple(PATH_SHAPES)]  # type: ignore[valid-type]
ArrowHead = Literal["none", "triangle", "open", "circle", "diamond"]
FontCategory = Literal["sans-serif", "serif", "display", "handwriting", "monospace"]


@dataclass(frozen=True)
class TextPresetSpec:
    size: int
    color: str
    weight: int
    font: str
    width: float
    line_height: float


TEXT_PRESETS: dict[str, TextPresetSpec] = {
    "heading": TextPresetSpec(36, "#1a1a2e", 700, HEADING_FONT, 0.72, 1.16),
    "subheading": TextPresetSpec(22, "#334155", 600, BODY_FONT, 0.62, 1.16),
    "body": TextPresetSpec(16, "#475569", 400, BODY_FONT, 0.5, 1.16),
}


@dataclass(frozen=True)
class Page:
    width: int
    height: int


def new_id() -> str:
    return str(uuid.uuid4())


def text_scale(page: Page) -> float:
    """`textScale`: preset sizes grow with the page so text starts out readable on any format."""
    return min(5.0, max(0.5, min(page.width, page.height) / PRESET_PAGE_SIDE))


def default_shape_size(page: Page) -> int:
    return round(min(page.width, page.height) * 0.28)


GENERIC_FAMILY = {
    "sans-serif": "sans-serif",
    "serif": "serif",
    "display": "sans-serif",
    "handwriting": "cursive",
    "monospace": "monospace",
}


def primary_family(stack: str) -> str:
    """`primaryFamily`: the first family of a CSS font stack, unquoted."""
    return stack.split(",")[0].strip().strip("\"'")


def font_stack(family: str, category: str | None = None) -> str:
    """`fontStack`: `"Name", generic`, so text stays legible while the web font loads (or if it fails)."""
    name = primary_family(family).replace('"', "")
    return f'"{name}", {GENERIC_FAMILY.get(category or "sans-serif", "sans-serif")}'


def js_round(value: float) -> int:
    """`Math.round` (halves round up, unlike Python's banker's rounding)."""
    return math.floor(value + 0.5)


def _num(value: float) -> int | float:
    """Whole floats as ints, others to three decimals (the precision Fabric serialises with)."""
    rounded = round(value, 3)
    return int(rounded) if float(rounded).is_integer() else rounded


def _centred(x: float, y: float, width: float, height: float) -> dict:
    return {
        "originX": "center",
        "originY": "center",
        "left": _num(x + width / 2),
        "top": _num(y + height / 2),
    }


# ---------------------------------------------------------------------------------------------
# Text
# ---------------------------------------------------------------------------------------------

AVERAGE_GLYPH_WIDTH = 0.52  # of the font size; Latin text in the catalogue's sans fonts averages about this


def estimate_text_lines(text: str, width: float, font_size: float, weight: int = 400) -> int:
    """How many lines a textbox wraps to: an estimate (the editor measures with real font metrics)."""
    glyph = font_size * AVERAGE_GLYPH_WIDTH * (1.06 if weight >= 600 else 1.0)
    per_line = max(1, int(width // max(glyph, 0.1)))
    lines = 0
    for paragraph in text.split("\n"):
        length, count = 0, 1
        for word in paragraph.split(" "):
            needed = len(word) if length == 0 else length + 1 + len(word)
            if needed <= per_line:
                length = needed
                continue
            count += 1 if length else 0
            length = len(word)
            while length > per_line:  # a word longer than a line breaks inside the word
                count += 1
                length -= per_line
        lines += count
    return max(1, lines)


def text_height(lines: int, font_size: float, line_height: float) -> float:
    """Fabric's textbox height: every line is `fontSize * 1.13` tall, all but the last times `lineHeight`."""
    return font_size * FONT_SIZE_MULT * (1 + (lines - 1) * line_height)


def build_text(
    page: Page,
    *,
    text: str,
    x: float | None = None,
    y: float | None = None,
    width: float | None = None,
    preset: TextPreset = "body",
    font_family: str | None = None,
    font_category: str | None = None,
    font_size: float | None = None,
    font_weight: int | None = None,
    color: str | None = None,
    align: TextAlign = "center",
    line_height: float | None = None,
) -> dict:
    spec = TEXT_PRESETS[preset]
    box_width = width if width is not None else js_round(page.width * spec.width)
    size = font_size if font_size is not None else js_round(spec.size * text_scale(page))
    weight = font_weight if font_weight is not None else spec.weight
    leading = line_height if line_height is not None else spec.line_height
    height = text_height(estimate_text_lines(text, box_width, size, weight), size, leading)
    left = x if x is not None else (page.width - box_width) / 2
    top = y if y is not None else (page.height - height) / 2
    return {
        "id": new_id(),
        "type": "textbox",
        "text": text,
        **_centred(left, top, box_width, height),
        "width": _num(box_width),
        "height": _num(height),
        "fontFamily": font_stack(font_family, font_category) if font_family else spec.font,
        "fontSize": _num(size),
        "fontWeight": weight,
        "fill": color or spec.color,
        "textAlign": align,
        "lineHeight": leading,
        "splitByGrapheme": False,
        "strokeUniform": True,
    }


CURVE_MAX = 400  # frontend/src/editor/engine/text/curve.ts


def apply_curve(obj: dict, amount: float) -> None:
    """Bend a text's baseline into an arc (negative = arch, positive = valley), as the editor stores it: only
    `curveAmount`; the editor rebuilds the arc when it loads the text. 0 straightens it."""
    amount = max(-CURVE_MAX, min(CURVE_MAX, amount))
    if amount:
        obj["curveAmount"] = _num(amount)
    else:
        obj.pop("curveAmount", None)


MaskShape = Literal[
    "circle", "rounded", "triangle", "diamond", "hexagon", "star", "heart", "blob", "arch", "cross"
]


def apply_mask(obj: dict, shape: str | None, radius: float | None = None) -> None:
    """Crop a picture to a shape (`masks.ts`): the editor rebuilds the clip from `maskShape` when it loads
    the picture. `radius` is the corner radius of `rounded`, as a fraction of the shorter side. None removes
    the mask."""
    obj.pop("clipPath", None)
    if shape:
        obj["maskShape"] = shape
    else:
        obj.pop("maskShape", None)
    if shape == "rounded" and radius is not None:
        obj["maskRadius"] = _num(max(0.0, min(0.5, radius)))
    elif shape != "rounded":
        obj.pop("maskRadius", None)


def apply_effects(obj: dict, effects: dict, *, text: bool) -> None:
    """Set an object's effects (`effects.ts` `applyEffects`): the declarative `effects` the editor reads,
    plus the native text props they imply, so an outline or highlight that is removed does not linger.
    The editor recreates the shadow from `effects` when it loads the object."""
    if effects:
        obj["effects"] = effects
    else:
        obj.pop("effects", None)
    obj.pop("shadow", None)
    if not text:
        return
    outline = effects.get("outline")
    if outline:
        obj.update(
            stroke=outline["color"],
            strokeWidth=_num(outline["width"]),
            paintFirst="stroke",
            strokeLineJoin="round",
            strokeUniform=True,
        )
    elif obj.get("stroke") is not None:
        obj.update(stroke=None, strokeWidth=0)
    background = effects.get("background")
    if background:
        obj["textBackgroundColor"] = background["color"]
    else:
        obj.pop("textBackgroundColor", None)


# ---------------------------------------------------------------------------------------------
# Shapes
# ---------------------------------------------------------------------------------------------


def _js_round3(value: float) -> float:
    return math.floor(value * 1000 + 0.5) / 1000


def _normalise(points: list[tuple[float, float]], size: float = 100) -> list[dict]:
    """`normalizePoints`: fit the points tightly into [0, size]² so the shape fills its box."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x, min_y = min(xs), min(ys)
    w = (max(xs) - min_x) or 1
    h = (max(ys) - min_y) or 1
    return [
        {"x": _num(_js_round3((px - min_x) / w * size)), "y": _num(_js_round3((py - min_y) / h * size))}
        for px, py in points
    ]


def regular_polygon_points(sides: int, size: float = 100) -> list[dict]:
    n = max(3, min(12, js_round(sides)))
    r = size / 2
    pts = []
    for i in range(n):
        a = -math.pi / 2 + i * 2 * math.pi / n
        pts.append((r + r * math.cos(a), r + r * math.sin(a)))
    return _normalise(pts, size)


def star_points(points: int, inner_ratio: float, size: float = 100) -> list[dict]:
    n = max(3, min(24, js_round(points)))
    ratio = max(0.1, min(0.95, inner_ratio))
    r = size / 2
    pts = []
    for i in range(n * 2):
        radius = r if i % 2 == 0 else r * ratio
        a = -math.pi / 2 + i * math.pi / n
        pts.append((r + radius * math.cos(a), r + radius * math.sin(a)))
    return _normalise(pts, size)


def build_shape(
    page: Page,
    *,
    shape: ShapeKind,
    x: float | None = None,
    y: float | None = None,
    width: float | None = None,
    height: float | None = None,
    fill: str | None = None,
    stroke: str | None = None,
    stroke_width: float = 0,
    corner_radius: float = 0,
    sides: int = 6,
    star_tips: int = 5,
    inner_ratio: float = 0.45,
    path_shape: str | None = None,
) -> dict:
    size = default_shape_size(page)
    if shape == "path":
        return _build_path_shape(
            page, path_shape or "", x, y, width, height, fill, stroke, stroke_width, size
        )
    w = width if width is not None else (size if shape != "triangle" or height is None else height / 0.9)
    h = height if height is not None else (w * 0.9 if shape == "triangle" else w)
    left = x if x is not None else (page.width - w) / 2
    top = y if y is not None else (page.height - h) / 2
    obj: dict = {
        "id": new_id(),
        "type": shape if shape in ("rect", "ellipse", "triangle") else "polygon",
        **_centred(left, top, w, h),
        "fill": fill or SHAPE_FILL,
        "stroke": stroke,
        "strokeWidth": _num(stroke_width if stroke else 0),
        "strokeUniform": True,
        "shapeKind": shape,
    }
    if shape in ("rect", "ellipse", "triangle"):
        obj["width"], obj["height"] = _num(w), _num(h)
    if shape == "rect":
        obj["rx"] = obj["ry"] = _num(corner_radius)
    elif shape == "ellipse":
        obj["rx"], obj["ry"] = _num(w / 2), _num(h / 2)
    elif shape in ("polygon", "star"):
        # Points live in a 100 x 100 box; scaling stretches it to the requested size (like `polygonFrom`).
        obj.update(width=100, height=100, scaleX=_num(w / 100), scaleY=_num(h / 100))
        if shape == "polygon":
            obj["sides"] = max(3, min(12, sides))
            obj["points"] = regular_polygon_points(obj["sides"])
        else:
            obj["starPoints"] = max(3, min(24, star_tips))
            obj["innerRatio"] = max(0.1, min(0.95, inner_ratio))
            obj["points"] = star_points(obj["starPoints"], obj["innerRatio"])
    return obj


def _build_path_shape(page, shape_id, x, y, width, height, fill, stroke, stroke_width, size) -> dict:
    """`createPathShape`: a catalogue shape, scaled so its longer side is `size` unless a box is given."""
    if shape_id not in PATH_SHAPES:
        raise ValueError(f"Unknown shape {shape_id!r}; choose one of {', '.join(PATH_SHAPES)}.")
    data = PATH_SHAPES[shape_id]
    natural_w, natural_h = data["width"], data["height"]
    if width is not None and height is not None:
        scale_x, scale_y = width / natural_w, height / natural_h
    elif width is not None or height is not None:
        scale_x = scale_y = width / natural_w if width is not None else height / natural_h
    else:
        scale_x = scale_y = size / max(natural_w, natural_h)
    w, h = natural_w * scale_x, natural_h * scale_y
    left = x if x is not None else (page.width - w) / 2
    top = y if y is not None else (page.height - h) / 2
    return {
        "id": new_id(),
        "type": "path",
        **_centred(left, top, w, h),
        "width": natural_w,
        "height": natural_h,
        "scaleX": round(scale_x, 6),
        "scaleY": round(scale_y, 6),
        "path": copy.deepcopy(data["path"]),
        "fillRule": data["fillRule"],
        "fill": fill or SHAPE_FILL,
        "stroke": stroke,
        "strokeWidth": _num(stroke_width if stroke else 0),
        "strokeUniform": True,
        "shapeKind": "path",
        "shapeId": shape_id,
    }


# ---------------------------------------------------------------------------------------------
# Lines
# ---------------------------------------------------------------------------------------------


def build_line(
    *,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    color: str = TEXT_COLOR,
    width: float = 6,
    arrow_start: ArrowHead = "none",
    arrow_end: ArrowHead = "none",
    dash: list[float] | None = None,
) -> dict:
    """A straight line from (x1, y1) to (x2, y2): a horizontal segment centred between them, rotated."""
    length = math.hypot(x2 - x1, y2 - y1)
    angle = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 360
    return {
        "id": new_id(),
        "type": "doryline",
        "originX": "center",
        "originY": "center",
        "left": _num((x1 + x2) / 2),
        "top": _num((y1 + y2) / 2),
        "width": _num(max(length, 1)),
        "height": 0,
        "angle": _num(angle),
        "stroke": color,
        "strokeWidth": _num(width),
        "strokeDashArray": dash or None,
        "arrowStart": arrow_start,
        "arrowEnd": arrow_end,
    }


# ---------------------------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------------------------


def build_image(
    page: Page,
    *,
    src: str,
    natural_width: float,
    natural_height: float,
    x: float | None = None,
    y: float | None = None,
    width: float | None = None,
    height: float | None = None,
    asset_id: str | None = None,
    name: str | None = None,
) -> dict:
    """An image scaled to fit inside the requested box, proportions kept (default: half the page's shorter
    side)."""
    nat_w, nat_h = max(natural_width, 1), max(natural_height, 1)
    if width is None and height is None:
        side = min(page.width, page.height) * 0.5
        width = height = side
    if width is None:
        width = height * nat_w / nat_h  # type: ignore[operator]
    if height is None:
        height = width * nat_h / nat_w
    scale = min(width / nat_w, height / nat_h)
    w, h = nat_w * scale, nat_h * scale
    left = x if x is not None else (page.width - w) / 2
    top = y if y is not None else (page.height - h) / 2
    obj = {
        "id": new_id(),
        "type": "image",
        "src": src,
        **_centred(left, top, w, h),
        "width": _num(nat_w),
        "height": _num(nat_h),
        "scaleX": _num(scale),
        "scaleY": _num(scale),
        "strokeUniform": True,
    }
    if asset_id:
        obj["assetId"] = asset_id
    if name:
        obj["name"] = name
    return obj


def build_qr(
    page: Page,
    *,
    text: str,
    x: float | None = None,
    y: float | None = None,
    size: float | None = None,
    color: str = "#000000",
    background: str = "#ffffff",
) -> dict:
    """A QR code. The editor renders the picture from `qr` on load, so no `src` is stored."""
    side = size if size is not None else min(page.width, page.height) * 0.25
    left = x if x is not None else (page.width - side) / 2
    top = y if y is not None else (page.height - side) / 2
    return {
        "id": new_id(),
        "type": "image",
        "name": "QR code",
        "qr": {"text": text[:QR_MAX_TEXT], "fg": color, "bg": background},
        **_centred(left, top, side, side),
        "width": QR_SIDE,
        "height": QR_SIDE,
        "scaleX": _num(side / QR_SIDE),
        "scaleY": _num(side / QR_SIDE),
    }
