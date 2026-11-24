"""Deterministic capsule geometry and an independent CPU painter for validation."""
from functools import lru_cache
from math import ceil, cos, floor, pi, sin, sqrt
from random import Random
import struct


SEGMENT = struct.Struct("<6fi")
PALETTE = ((215, 124, 104), (223, 176, 124), (151, 108, 137), (104, 165, 156))
LINKS = 24


@lru_cache(maxsize=1)
def organisms():
    rng = Random(21367)
    return [tuple(rng.random() for _ in range(7)) for _ in range(256)]


def scene(width, height, worms, time, focus=(0.5, 0.51)):
    segments = []
    for worm, (phase, layer, kink, gait, twist, size, offset) in enumerate(organisms()[:worms]):
        direction = 1 if worm % 4 else -1
        head = 2 * pi * phase + direction * time * (0.11 + 0.14 * gait)
        loop = 0.08 + 0.37 * sqrt(layer)
        centre_x = width * (focus[0] + 0.075 * sin(offset * 17 + time * 0.18))
        centre_y = height * (focus[1] + 0.08 * cos(offset * 12 + time * 0.12))
        for joint in range(LINKS + 1):
            u = joint / LINKS
            a = head - direction * u * (0.54 + 1.4 * twist)
            wave = 5.5 * u - time * (1.1 + gait) + kink * 2 * pi
            radius = loop + 0.044 * sin(3 * a + kink * 8) + (0.018 + 0.03 * gait) * sin(wave)
            x = centre_x + width * 0.91 * radius * cos(a)
            y = centre_y + height * 0.92 * radius * sin(a)
            if joint:
                mid = (joint - 0.5) / LINKS
                girth = (0.28 + 0.72 * sin(pi * mid) ** 0.56) * height * (0.005 + 0.010 * size)
                segments.append((ax, ay, x, y, max(0.55, girth), float(joint - 1), worm % 4))
            ax, ay = x, y
    return segments


def pack(segments):
    return b"".join(SEGMENT.pack(*s) for s in segments)


def projection(s, x, y):
    ax, ay, bx, by, radius, arc, _ = s
    dx, dy = bx - ax, by - ay
    px, py = x - ax, y - ay
    t = min(1.0, max(0.0, (px * dx + py * dy) / max(0.000001, dx * dx + dy * dy)))
    sx, sy = px - t * dx, py - t * dy
    distance2 = sx * sx + sy * sy
    if distance2 > radius * radius:
        return None
    side = -1 if dx * sy - dy * sx < 0 else 1
    return side * sqrt(distance2) / radius, arc + t


def slow_id(segments, x, y):
    for i in range(len(segments) - 1, -1, -1):
        if projection(segments[i], x + 0.5, y + 0.5) is not None:
            return i + 1
    return 0


@lru_cache(maxsize=1)
def background(w, h):
    buf = bytearray(3 * w * h)
    for y in range(h):
        for x in range(w):
            u, v = (x + 0.5) / w - 0.5, (y + 0.5) / h - 0.45
            k = x * 73856093 ^ y * 19349663
            g, light = (k & 255) / 255, max(0.0, 1 - 2.6 * (u * u + v * v))
            spark = (55, 61, 60) if k & 8191 == 27 else (0, 0, 0)
            rgb = (8 + 7 * light + 4 * g, 14 + 19 * light + 5 * g, 20 + 24 * light + 7 * g)
            i = 3 * (y * w + x)
            buf[i:i + 3] = bytes(int(c + a) for c, a in zip(rgb, spark))
    return bytes(buf)


def cpu_render(segments, w, h, view):
    # Painter's algorithm traverses capsules once, writing only their footprints.
    buf = bytearray(background(w, h)) if view == 0 else bytearray(3 * w * h)
    for index, s in enumerate(segments):
        ax, ay, bx, by, radius, _, material = s
        left = max(0, ceil(min(ax, bx) - radius - 0.5))
        right = min(w - 1, floor(max(ax, bx) + radius - 0.5))
        top = max(0, ceil(min(ay, by) - radius - 0.5))
        bottom = min(h - 1, floor(max(ay, by) + radius - 0.5))
        color_id = (index + 1).to_bytes(3, "little")
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                hit = projection(s, x + 0.5, y + 0.5)
                if hit is None:
                    continue
                at = 3 * (y * w + x)
                if view == 1:
                    buf[at:at + 3] = color_id
                    continue
                n, along = hit
                diffuse = (0.24 + 0.7 * sqrt(max(0, 1 - n * n)) - 0.16 * n) * (0.85 + 0.15 * cos(7.1 * along))
                shine = max(0, 1 - 3.4 * abs(n + 0.38)) ** 2 * 55
                buf[at:at + 3] = bytes(min(255, max(0, int(c * diffuse + shine))) for c in PALETTE[material])
    return bytes(buf)
