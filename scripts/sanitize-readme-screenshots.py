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


def redact_box(image: Image.Image, box: tuple[int, int, int, int], blur_radius: int = 24) -> None:
    x0, y0, x1, y1 = box
    region = image.crop((x0, y0, x1, y1))
    small = region.resize(
        (max(1, region.width // 16), max(1, region.height // 16)),
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


SANITIZATION_RULES: dict[str, list[tuple[float, float, float, float]]] = {
    # Sidebar profile card: avatar, name, email, and sign-out row.
    "dandi-usage-dashboard.png": [
        (0.02, 0.48, 0.37, 0.71),
    ],
    # Header profile photo on compact layouts.
    "dandi-rag-chat.png": [
        (0.88, 0.012, 0.985, 0.055),
    ],
    "dandi-billing.png": [
        (0.76, 0.012, 0.90, 0.055),
    ],
    "dandi-account-integrations.png": [
        (0.76, 0.012, 0.90, 0.055),
    ],
}


def sanitize_file(path: Path) -> bool:
    rules = SANITIZATION_RULES.get(path.name)
    if not rules:
        return False

    image = Image.open(path).convert("RGB")
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
