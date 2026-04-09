"""
카테고리 이미지의 흰 배경 (또는 단색 가까운 배경)을 알파로 변환.

flood-fill 방식: 모서리에서 시작해 인접한 거의 흰색 픽셀을 투명화.
이미지 내부의 흰색은 보존 (얼굴, 종이 등).
"""
import sys
from pathlib import Path
from PIL import Image
from collections import deque

THRESHOLD = 18  # 흰색 기준 (255 - 이 값 이상이면 흰색)

def flood_fill_transparent(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = [[False] * h for _ in range(w)]
    q = deque()

    # 모서리에서 시작 (모든 가장자리 픽셀)
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))

    def is_bg(r, g, b, a):
        # 거의 흰색이거나 거의 투명이면 배경
        return (r >= 255 - THRESHOLD and g >= 255 - THRESHOLD and b >= 255 - THRESHOLD) or a < 16

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        if visited[x][y]:
            continue
        visited[x][y] = True
        r, g, b, a = px[x, y]
        if not is_bg(r, g, b, a):
            continue
        px[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q.append((x + dx, y + dy))

    return img

def main():
    paths = sys.argv[1:]
    if not paths:
        print("usage: make-transparent.py <png>...")
        sys.exit(1)
    for p in paths:
        path = Path(p)
        if not path.exists():
            print(f"  ❌ not found: {p}")
            continue
        img = Image.open(path)
        out = flood_fill_transparent(img)
        out.save(path, "PNG")
        # 알파가 있는 픽셀 비율
        alpha = out.split()[-1]
        bbox = alpha.getbbox()
        print(f"  ✅ {path.name} bbox={bbox}")

if __name__ == "__main__":
    main()
