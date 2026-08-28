#!/usr/bin/env python3
import os
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

def make_macos_xshell_icon():
    canvas_size = 1024
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    
    # Rounded squircle container
    # macOS app icon safe area is roughly 824x824 inside 1024x1024 (padding 100px)
    box_padding = 100
    box_size = canvas_size - (box_padding * 2) # 824x824
    corner_radius = 180
    
    # 1. Base Squircle with modern macOS dark glass / gradient
    base_mask = Image.new("L", (box_size, box_size), 0)
    mask_draw = ImageDraw.Draw(base_mask)
    mask_draw.rounded_rectangle([0, 0, box_size, box_size], radius=corner_radius, fill=255)
    
    # Gradient background: Dark Titanium Slate to Deep Ruby Black
    base_layer = Image.new("RGBA", (box_size, box_size), (0, 0, 0, 0))
    draw_base = ImageDraw.Draw(base_layer)
    for y in range(box_size):
        ratio = y / float(box_size)
        # Deep charcoal (#181824) to subtle dark crimson (#2a1215)
        r = int(24 + (48 - 24) * ratio)
        g = int(26 + (16 - 26) * ratio)
        b = int(36 + (22 - 36) * ratio)
        draw_base.line([(0, y), (box_size, y)], fill=(r, g, b, 255))
    
    # Subtle inner border
    border_draw = ImageDraw.Draw(base_layer)
    border_draw.rounded_rectangle([1, 1, box_size - 2, box_size - 2], radius=corner_radius, outline=(255, 255, 255, 30), width=3)
    
    # Composite squircle onto main canvas
    # Drop shadow
    shadow_mask = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.rounded_rectangle([box_padding, box_padding + 16, box_padding + box_size, box_padding + box_size + 16], radius=corner_radius, fill=(0, 0, 0, 140))
    shadow_blurred = shadow_mask.filter(ImageFilter.GaussianBlur(radius=20))
    
    img.paste(shadow_blurred, (0, 0), shadow_blurred)
    img.paste(base_layer, (box_padding, box_padding), base_mask)
    
    # 2. Add Xshell Logo in the center
    xshell_raw_path = "/tmp/xshell_app_icon.png"
    if os.path.exists(xshell_raw_path):
        xshell_img = Image.open(xshell_raw_path).convert("RGBA")
        # Resize Xshell logo nicely into the center (approx 560x560)
        target_logo_size = 560
        xshell_resized = xshell_img.resize((target_logo_size, target_logo_size), Image.Resampling.LANCZOS)
        
        # Position in center of squircle
        logo_x = (canvas_size - target_logo_size) // 2
        logo_y = (canvas_size - target_logo_size) // 2 - 10
        img.paste(xshell_resized, (logo_x, logo_y), xshell_resized)
    else:
        # Fallback drawing of Xshell signature X and terminal prompt
        pass
    
    # Save master 1024x1024 PNG
    res_dir = "/Users/lijt/項目/SSH-terminal/macOS-native/Resources"
    os.makedirs(res_dir, exist_ok=True)
    master_png = os.path.join(res_dir, "AppIcon-1024.png")
    img.save(master_png, "PNG")
    print(f"Created master icon: {master_png}")
    
    # Generate .iconset for iconutil
    iconset_dir = "/tmp/AppIcon.iconset"
    os.makedirs(iconset_dir, exist_ok=True)
    
    sizes = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    
    for s, name in sizes:
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, name))
        
    icns_path = os.path.join(res_dir, "AppIcon.icns")
    subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_path], check=True)
    print(f"Generated ICNS: {icns_path}")

if __name__ == "__main__":
    make_macos_xshell_icon()
