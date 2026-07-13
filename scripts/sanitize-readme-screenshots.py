#!/usr/bin/env python3
"""Redact personal name, email, and profile photo areas in README screenshots."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError as exc:  # pragma: no cover - runtime helper
    raise SystemExit(
        "Pillow is required. Install with: python3 -m pip install pillow"
    ) from exc


def redact_box(image: Image.Image, box: tuple[int, int, int, int], blur_radius: int = 18) -> None:
    x0, y0, x1, y1 = box
    region = image.crop((x0, y0, x1, y1))
    small = region.resize(
        (max(1, region.width // 6), max(1, region.height // 6)),
        Image.Resampling.BILINEAR,
    )
    pixelated = small.resize(region.size, Image.Resampling.NEAREST)
    blurred = pixelated.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    image.paste(blurred, (x0, y0))


def redact_relative(image: Image.Image, regions: list[tuple[float, float, float, float]]) -> None:
    width, height = image.size
    for left, top, right, bottom in regions:
        box = (
            int(width * left),
            int(height * top),
            int(width * right),
            int(height * bottom),
        )
        redact_box(image, box)


MOBILE_SIDEBAR_IDENTITY = (0.03, 0.612, 0.40, 0.712)
MOBILE_HEADER_AVATAR = (0.71, 0.010, 0.82, 0.050)
DESKTOP_SIDEBAR_IDENTITY = (0.018, 0.775, 0.205, 0.835)
DESKTOP_HEADER_AVATAR = (0.918, 0.018, 0.982, 0.072)

SIDEBAR_SCREENSHOTS = {
    "dandi-usage-dashboard.png",
    "dandi-dashboard.png",
}

HEADER_SCREENSHOTS = {
    "dandi-rag-chat.png",
    "dandi-billing.png",
    "dandi-account-integrations.png",
    "dandi-account-api.png",
    "dandi-playground-summarize.png",
    "dandi-repository-summary.png",
    "dandi-repository-summary-result.png",
}


def rules_for_image(filename: str, size: tuple[int, int]) -> list[tuple[float, float, float, float]]:
    _width, height = size
    mobile = height > 1200

    if filename in SIDEBAR_SCREENSHOTS:
        return [MOBILE_SIDEBAR_IDENTITY if mobile else DESKTOP_SIDEBAR_IDENTITY]

    if filename in HEADER_SCREENSHOTS:
        return [MOBILE_HEADER_AVATAR if mobile else DESKTOP_HEADER_AVATAR]

    return []


def sanitize_file(path: Path) -> bool:
    image = Image.open(path).convert("RGB")
    rules = rules_for_image(path.name, image.size)
    if not rules:
        return False

    redact_relative(image, rules)
    image.save(path, format="PNG", optimize=True)
    return True


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: sanitize-readme-screenshots.py <image> [<image>...]")
        return 1

    changed = 0
    for arg in argv[1:]:
        path = Path(arg)
        if not path.exists():
            print(f"skip missing file: {path}")
            continue
        if sanitize_file(path):
            print(f"sanitized {path.name}")
            changed += 1
        else:
            print(f"no rules for {path.name}")

    return 0 if changed else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
