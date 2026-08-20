#!/usr/bin/env python3
"""生成「黑底 Joker 扑克牌」风格 PWA 图标。
黑色圆角底 + 居中白色扑克牌，牌面绘制小丑帽（Joker 标志）+ 四角 J 索引。
输出到 public/：icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png(180), favicon.png(64)
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(OUT, exist_ok=True)

# 品牌三色（用于小丑帽三个角，呼应原品牌渐变）
C1 = (109, 139, 255)  # #6d8bff 蓝紫
C2 = (154, 107, 255)  # #9a6bff 紫
C3 = (255, 92, 138)   # #ff5c8a 品红
GOLD = (240, 200, 90)  # 铃铛
BG = (10, 10, 13)      # 近黑背景 #0a0a0d
CARD = (245, 245, 240)  # 牌面米白
INK = (24, 24, 30)      # 牌面深色描边/文字


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def load_font(size, bold=True):
    candidates = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
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


def draw_jester(d, cx, cy, w, h):
    """在 (cx, cy) 上方绘制三角小丑帽 + 铃铛，三个角用品牌三色。"""
    # 三个尖角三角形（底边在 cy 附近，尖端带铃铛）
    base_y = cy + h * 0.10
    # 左、中、右尖端
    tips = [
        (cx - w * 0.50, cy - h * 0.10, C1),   # 左
        (cx,            cy - h * 0.62, C2),    # 中（最高）
        (cx + w * 0.50, cy - h * 0.10, C3),    # 右
    ]
    # 帽底左右锚点
    bl = (cx - w * 0.42, base_y)
    br = (cx + w * 0.42, base_y)
    mid = (cx, base_y - h * 0.04)
    # 左角三角
    d.polygon([bl, mid, tips[0][:2]], fill=tips[0][2])
    # 右角三角
    d.polygon([br, mid, tips[2][:2]], fill=tips[2][2])
    # 中角三角
    d.polygon([(cx - w * 0.22, base_y), (cx + w * 0.22, base_y), tips[1][:2]],
              fill=tips[1][2])
    # 帽檐/衣领
    band_h = h * 0.16
    d.rounded_rectangle(
        [cx - w * 0.5, base_y, cx + w * 0.5, base_y + band_h],
        radius=band_h / 2, fill=INK)
    # 铃铛
    r = max(2, int(w * 0.09))
    for (tx, ty, _c) in tips:
        d.ellipse([tx - r, ty - r, tx + r, ty + r], fill=GOLD, outline=INK)


def draw_diamond(d, cx, cy, r, color):
    """绘制一个小菱形（扑克花色感）。"""
    d.polygon([(cx, cy - r), (cx + r * 0.72, cy), (cx, cy + r),
               (cx - r * 0.72, cy)], fill=color)


def draw_card_face(base, size):
    """在图标中央绘制白色扑克牌（含小丑帽与四角 J）。"""
    d = ImageDraw.Draw(base)
    # 牌面尺寸（竖版矩形，居中）
    cw = size * 0.60
    ch = size * 0.80
    x0 = (size - cw) / 2
    y0 = (size - ch) / 2
    x1 = x0 + cw
    y1 = y0 + ch
    radius = max(4, int(size * 0.06))
    # 牌阴影
    d.rounded_rectangle([x0 + size * 0.015, y0 + size * 0.02, x1 + size * 0.015,
                         y1 + size * 0.02], radius=radius, fill=(0, 0, 0, 120))
    # 牌面
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=CARD)
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=INK,
                        width=max(1, int(size * 0.006)))
    # 四角 J 索引（左上、右下旋转）
    idx_font = load_font(int(size * 0.11))
    pad = size * 0.035
    d.text((x0 + pad, y0 + pad * 0.6), 'J', font=idx_font, fill=INK)
    draw_diamond(d, x0 + pad + size * 0.028, y0 + pad * 0.6 + size * 0.145,
                 size * 0.028, C3)
    # 右下角（旋转 180°）用单独图层
    tag = Image.new('RGBA', (int(size * 0.2), int(size * 0.28)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    td.text((2, 0), 'J', font=idx_font, fill=INK)
    draw_diamond(td, 2 + size * 0.028, size * 0.145, size * 0.028, C3)
    tag = tag.rotate(180, expand=True)
    base.paste(tag, (int(x1 - tag.width - pad * 0.6),
                     int(y1 - tag.height - pad * 0.6)), tag)
    # 中央小丑帽
    draw_jester(d, size / 2, size * 0.44, cw * 0.62, ch * 0.42)
    # 底部 JOKER 文案
    jf = load_font(int(size * 0.07))
    text = 'JOKER'
    bbox = d.textbbox((0, 0), text, font=jf)
    tw = bbox[2] - bbox[0]
    d.text(((size - tw) / 2 - bbox[0], y1 - size * 0.14), text, font=jf, fill=INK)


def make_icon(size, radius_ratio=0.22, maskable=False):
    # 黑色背景（maskable 铺满，普通版带圆角）
    if maskable:
        base = Image.new('RGBA', (size, size), BG + (255,))
    else:
        base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        bg = Image.new('RGBA', (size, size), BG + (255,))
        base.paste(bg, (0, 0), rounded_mask(size, int(size * radius_ratio)))
    draw_card_face(base, size)
    return base


make_icon(192).save(os.path.join(OUT, 'icon-192.png'))
make_icon(512).save(os.path.join(OUT, 'icon-512.png'))
make_icon(512, maskable=True).save(os.path.join(OUT, 'icon-512-maskable.png'))
# apple-touch：iOS 自动加圆角，输出满幅黑底
apple = Image.new('RGBA', (180, 180), BG + (255,))
draw_card_face(apple, 180)
apple.save(os.path.join(OUT, 'apple-touch-icon.png'))
make_icon(64, radius_ratio=0.2).save(os.path.join(OUT, 'favicon.png'))

print('icons written to', OUT)
for f in sorted(os.listdir(OUT)):
    if f.endswith('.png'):
        print(' -', f)
