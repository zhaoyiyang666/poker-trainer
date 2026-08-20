#!/usr/bin/env python3
"""生成 TRAE 风格 PWA 图标：蓝紫→紫→品红 对角渐变圆角方块 + 白色 T 字。
输出到 public/：icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png(180)
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(OUT, exist_ok=True)

# 品牌渐变三个锚点色
C1 = (109, 139, 255)  # #6d8bff 蓝紫
C2 = (154, 107, 255)  # #9a6bff 紫
C3 = (255, 92, 138)   # #ff5c8a 品红


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def brand_gradient(size):
    """对角(左上->右下)三段渐变。"""
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))  # 0..1 对角
            if t < 0.5:
                c = lerp(C1, C2, t / 0.5)
            else:
                c = lerp(C2, C3, (t - 0.5) / 0.5)
            px[x, y] = c
    return img


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def load_font(size):
    candidates = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_letter(img, size):
    d = ImageDraw.Draw(img)
    font = load_font(int(size * 0.56))
    text = 'T'
    bbox = d.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1]
    # 轻微阴影提升立体感
    d.text((x + size * 0.01, y + size * 0.01), text, font=font, fill=(0, 0, 0, 90))
    d.text((x, y), text, font=font, fill=(255, 255, 255))


def make_icon(size, radius_ratio=0.22, letter=True, bg_pad=0.0):
    """bg_pad: maskable 安全区留白比例（渐变充满，圆角减弱）。"""
    grad = brand_gradient(size)
    if bg_pad > 0:
        # maskable：渐变铺满整块（无透明圆角），字缩小
        out = grad.convert('RGBA')
        if letter:
            draw_letter(out, size)
        return out
    radius = int(size * radius_ratio)
    mask = rounded_mask(size, radius)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    if letter:
        draw_letter(out, size)
    return out


def apple_icon(size=180):
    # iOS 自动加圆角，这里输出满幅渐变+字（不预留透明圆角）
    grad = brand_gradient(size).convert('RGBA')
    draw_letter(grad, size)
    return grad


make_icon(192).save(os.path.join(OUT, 'icon-192.png'))
make_icon(512).save(os.path.join(OUT, 'icon-512.png'))
make_icon(512, bg_pad=0.1).save(os.path.join(OUT, 'icon-512-maskable.png'))
apple_icon(180).save(os.path.join(OUT, 'apple-touch-icon.png'))
# favicon 小图
make_icon(64, radius_ratio=0.2).save(os.path.join(OUT, 'favicon.png'))

print('icons written to', OUT)
for f in sorted(os.listdir(OUT)):
    print(' -', f)
