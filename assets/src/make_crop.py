"""Builds the Karim photo crop used by assets/src/banner.html.

Two problems with cropping the source frame (assets/src/karim_thumbnail.jpg)
straight: it carries the YouTube-thumbnail vignette over the right half of the
photo, which reads as a muddy dark column, and its right side holds the baked-in
title text. The illumination pass below flattens the falloff, and the gain field
is frozen past ILLUS_FREEZE so the baked text cannot skew it — that strip is
where the banner's gradient mask goes opaque anyway.

    python3 assets/src/make_crop.py
"""

from PIL import Image, ImageFilter
import numpy as np

SRC = "assets/src/karim_thumbnail.jpg"
OUT = "assets/src/karim_crop.jpg"

# Banner photo panel is 760x500; the crop matches that aspect so the face lands
# left of centre and clears the gradient mask. The window deliberately runs past
# the baked-in title text (starts around x=1145) — the mask covers it.
PANEL_ASPECT = 760 / 500
BOX = (432, 20, 1450, 690)

FLATTEN = 1.0       # 0 = leave the vignette alone, 1 = fully flat
BLUR_PX = 150       # radius of the illumination field, in source pixels
ILLUM_FREEZE = 0.66  # fraction of the crop width after which the gain is held flat
LIFT = 1.06
GAIN_CAP = 3.4


def main() -> None:
    im = Image.open(SRC).convert("RGB").crop(BOX)
    w, h = im.size
    assert abs(w / h - PANEL_ASPECT) < 0.02, f"crop aspect {w/h:.3f} != panel {PANEL_ASPECT:.3f}"

    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

    small = max(w, h) // BLUR_PX + 1
    illum = (
        Image.fromarray((lum * 255).astype(np.uint8))
        .resize((small, small), Image.BOX)
        .filter(ImageFilter.GaussianBlur(small / 2))
        .resize((w, h), Image.BILINEAR)
    )
    illum = np.asarray(illum).astype(np.float32) / 255.0
    illum = np.maximum(illum, illum.max() * 0.12)
    illum[:, int(w * ILLUM_FREEZE):] = illum[:, int(w * ILLUM_FREEZE) - 1][:, None]

    gain = illum.mean() / illum
    gain = 1.0 + (np.clip(gain, 1.0 / GAIN_CAP, GAIN_CAP) - 1.0) * FLATTEN
    out = np.clip(a * gain[..., None] * LIFT, 0.0, 1.0)

    Image.fromarray((out * 255).astype(np.uint8)).save(OUT, quality=96)
    print(f"wrote {OUT} {im.size} aspect {w/h:.4f}")


if __name__ == "__main__":
    main()

