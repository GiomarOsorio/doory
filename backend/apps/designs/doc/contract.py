"""The cases the frontend checks the builders against (`backendBuilders.test.ts`).

Each case is an object built here, the kind the editor must recognise it as and, where the editor has a
factory that makes the same object, the factory call. The frontend loads every object through the real
engine and checks it survives unchanged and, for factory cases, comes out exactly like the editor's own.

Regenerate the fixture after changing a builder:

    python -m apps.designs.doc.contract > ../frontend/src/editor/engine/fixtures/backend-builders.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from . import builders
from .builders import Page

FIXTURE = Path(__file__).resolve().parents[4] / "frontend/src/editor/engine/fixtures/backend-builders.json"
PAGE = Page(800, 600)


def _cases() -> list[dict]:
    return [
        {
            "name": "heading text",
            "kind": "text",
            "factory": {"fn": "createTextbox", "opts": {"text": "Hello world", "preset": "heading"}},
            "object": builders.build_text(PAGE, text="Hello world", preset="heading"),
        },
        {
            "name": "styled body text",
            "kind": "text",
            "factory": {
                "fn": "createTextbox",
                "opts": {
                    "text": "Summer sale on everything",
                    "preset": "body",
                    "width": 300,
                    "fontFamily": '"Playfair Display", serif',
                    "fontSize": 28,
                    "fontWeight": 600,
                    "fill": "#ff0000",
                    "textAlign": "left",
                },
            },
            "object": builders.build_text(
                PAGE,
                text="Summer sale on everything",
                x=250,
                width=300,
                font_family="Playfair Display",
                font_category="serif",
                font_size=28,
                font_weight=600,
                color="#ff0000",
                align="left",
            ),
            # The factory centres on the page; this one only fixes x, so its top is the estimate's.
            "ignore": ["top"],
        },
        {
            "name": "rounded rectangle",
            "kind": "shape",
            "factory": {"fn": "createRect", "size": 120, "radius": 12},
            "object": builders.build_shape(PAGE, shape="rect", width=120, height=120, corner_radius=12),
        },
        {
            "name": "circle",
            "kind": "shape",
            "factory": {"fn": "createEllipse", "size": 90},
            "object": builders.build_shape(PAGE, shape="ellipse", width=90, height=90),
        },
        {
            "name": "triangle",
            "kind": "shape",
            "factory": {"fn": "createTriangle", "size": 80},
            "object": builders.build_shape(PAGE, shape="triangle", width=80),
        },
        {
            "name": "hexagon",
            "kind": "shape",
            "factory": {"fn": "createPolygon", "size": 100, "sides": 6},
            "object": builders.build_shape(PAGE, shape="polygon", width=100, height=100, sides=6),
        },
        {
            "name": "star",
            "kind": "shape",
            "factory": {"fn": "createStar", "size": 150, "points": 7, "innerRatio": 0.4},
            "object": builders.build_shape(
                PAGE, shape="star", width=150, height=150, star_tips=7, inner_ratio=0.4
            ),
        },
        {
            "name": "stretched octagon with a border",
            "kind": "shape",
            "object": builders.build_shape(
                PAGE,
                shape="polygon",
                x=10,
                y=20,
                width=300,
                height=120,
                sides=8,
                stroke="#000000",
                stroke_width=4,
            ),
        },
        {
            "name": "arrow",
            "kind": "line",
            "factory": {"fn": "createLine", "opts": {"length": 200, "arrowEnd": "triangle"}},
            "object": builders.build_line(x1=300, y1=300, x2=500, y2=300, arrow_end="triangle"),
        },
        {
            "name": "dashed diagonal line",
            "kind": "line",
            "object": builders.build_line(x1=0, y1=0, x2=300, y2=400, color="#3366ff", width=3, dash=[12, 6]),
        },
        {
            "name": "image",
            "kind": "image",
            # The test's image stub decodes every picture as 10 x 10 pixels.
            "factory": {"fn": "createImage", "src": "/media/assets/a/b.png", "fit": 100},
            "object": builders.build_image(
                PAGE, src="/media/assets/a/b.png", natural_width=10, natural_height=10, width=100, height=100
            ),
        },
        {
            "name": "uploaded photo",
            "kind": "image",
            "object": builders.build_image(
                PAGE,
                src="https://cdn.example.com/photo.jpg",
                natural_width=10,
                natural_height=10,
                x=0,
                y=0,
                width=800,
                asset_id="0b5e7a46-6f1e-4cf0-9f0e-6b3cf7f1d001",
                name="Beach",
            ),
        },
        {
            "name": "qr code",
            "kind": "qr",
            "object": builders.build_qr(PAGE, text="https://doory.example/menu", size=200),
        },
        {
            "name": "text with effects",
            "kind": "text",
            "object": _with_effects(
                builders.build_text(PAGE, text="Glow up", preset="heading"),
                {
                    "glow": {"color": "#7a64e0", "blur": 18},
                    "outline": {"color": "#ff0000", "width": 3},
                    "background": {"color": "#fde047"},
                },
                text=True,
            ),
            # What the editor must have drawn once the object is loaded.
            "expect": {"shadow": True, "stroke": "#ff0000", "textBackgroundColor": "#fde047"},
        },
        {
            "name": "curved text",
            "kind": "text",
            "object": _curved(builders.build_text(PAGE, text="Curved", preset="heading"), -150),
            "expect": {"path": True},
        },
        {
            "name": "shape with a shadow",
            "kind": "shape",
            "object": _with_effects(
                builders.build_shape(PAGE, shape="rect", width=120, height=80),
                {"shadow": {"color": "#00000066", "blur": 12, "offsetX": 4, "offsetY": 6}},
                text=False,
            ),
            "expect": {"shadow": True},
        },
    ]


def _with_effects(obj: dict, effects: dict, *, text: bool) -> dict:
    builders.apply_effects(obj, effects, text=text)
    return obj


def _curved(obj: dict, amount: float) -> dict:
    builders.apply_curve(obj, amount)
    return obj


def build_fixture() -> list[dict]:
    """The cases with stable ids (builders make random ones)."""
    cases = _cases()
    for number, case in enumerate(cases, start=1):
        case["object"]["id"] = f"case-{number}"
    return cases


def render_fixture() -> str:
    return json.dumps(build_fixture(), indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    sys.stdout.write(render_fixture())
