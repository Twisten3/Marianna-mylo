import argparse
import math
import os
import random
import shutil
import sys
import time


RESET = "\033[0m"
PINK = "\033[38;2;244;112;136m"
ROSE = "\033[38;2;210;64;87m"
LIGHT_ROSE = "\033[38;2;255;157;174m"
GREEN = "\033[38;2;93;173;113m"
LIGHT_GREEN = "\033[38;2;133;205;148m"
GOLD = "\033[38;2;230;202;116m"
DIM = "\033[38;2;121;111;133m"
WHITE = "\033[38;2;205;194;208m"


def distance_to_segment(point, start, end):
    px, py = point
    ax, ay = start
    bx, by = end
    dx = bx - ax
    dy = by - ay
    length = dx * dx + dy * dy
    if length == 0:
        return math.hypot(px - ax, py - ay)
    amount = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / length))
    return math.hypot(px - (ax + amount * dx), py - (ay + amount * dy))


def rose_at(x, y, center, time_value, scale, width, height):
    center_x, center_y = center
    dx = (x - center_x * width) / (width * 0.13 * scale)
    dy = (y - center_y * height) / (height * 0.16 * scale)
    radius = math.hypot(dx, dy)
    angle = math.atan2(dy, dx)
    edge = 0.82 + 0.12 * math.sin(angle * 7 + radius * 11 - time_value * 0.7)
    edge += 0.06 * math.sin(angle * 13 - radius * 18)
    if radius >= edge:
        return None
    glow = max(0, 1 - radius / 0.38)
    highlight = abs(math.sin(angle * 2.2 + radius * 13 - time_value * 0.5)) > 0.94
    return "rose", glow, highlight


def leaf_at(x, y, center, direction, width, height):
    center_x, center_y = center
    dx = x - center_x * width
    dy = y - center_y * height
    angle = direction * 0.58
    local_x = (dx * math.cos(angle) + dy * math.sin(angle)) / (width * 0.065)
    local_y = (-dx * math.sin(angle) + dy * math.cos(angle)) / (width * 0.032)
    edge = abs(local_x) + abs(local_y) * 0.76
    if edge > 1 or abs(local_y) < 0.08:
        return None
    return "leaf", max(0, 1 - edge), abs(local_y - local_x * 0.32 * direction) < 0.08


def growth_at(time_value):
    progress = max(0, min(1, (time_value - 0.8) / 10))
    return progress * progress * (3 - 2 * progress)


def sample_bouquet(x, y, time_value, width, height, growth):
    roses = [
        ((0.405, 0.34), 0.88),
        ((0.5, 0.29), 1.08),
        ((0.595, 0.35), 0.85),
        ((0.32, 0.41), 0.55),
        ((0.68, 0.42), 0.54),
    ]

    for center, scale in roses:
        if growth < 0.04:
            break
        grown_center = (
            0.5 + (center[0] - 0.5) * growth,
            0.28 + (center[1] - 0.28) * growth,
        )
        shape = rose_at(x, y, grown_center, time_value, scale * growth, width, height)
        if shape:
            return shape

    tie_y = height * 0.72
    for center, _ in roses:
        flower_x = (0.5 + (center[0] - 0.5) * growth) * width
        flower_y = (0.28 + (center[1] - 0.28) * growth + 0.1 * growth) * height
        stem_x = (0.5 + (center[0] - 0.5) * growth * 0.28) * width
        if distance_to_segment((x, y), (flower_x, flower_y), (stem_x, tie_y)) < width * (0.002 + growth * 0.004):
            return "leaf", 0.55, random.random() > 0.85

    if growth > 0.14:
        leaves = [
            ((0.34, 0.55), -1),
            ((0.39, 0.62), 1),
            ((0.44, 0.53), -1),
            ((0.56, 0.54), 1),
            ((0.61, 0.62), -1),
            ((0.66, 0.54), 1),
            ((0.49, 0.59), 1),
            ((0.54, 0.65), -1),
        ]
        for center, direction in leaves:
            grown_center = (
                0.5 + (center[0] - 0.5) * growth,
                0.72 + (center[1] - 0.72) * growth,
            )
            shape = leaf_at(x, y, grown_center, direction, width * growth, height)
            if shape:
                return shape

    if growth > 0.3 and tie_y - 1 < y < tie_y + 1 and 0.455 * width < x < 0.545 * width:
        return "gold", 0.75, abs(x - width * 0.5) < width * 0.015

    if growth > 0.3:
        trails = [
            ((width * (0.5 - 0.03 * growth), tie_y), (width * (0.5 - 0.11 * growth), height * (0.72 + 0.18 * growth))),
            ((width * (0.5 + 0.03 * growth), tie_y), (width * (0.5 + 0.11 * growth), height * (0.72 + 0.17 * growth))),
        ]
        for start, end in trails:
            if distance_to_segment((x, y), start, end) < width * 0.006 * growth:
                return "gold", 0.55, random.random() > 0.9

    if growth > 0.14:
        wrapper = [
            ((0.27, 0.35), (0.2, 0.61)),
            ((0.73, 0.36), (0.8, 0.61)),
            ((0.2, 0.61), (0.48, 0.75)),
            ((0.8, 0.61), (0.52, 0.75)),
        ]
        for start, end in wrapper:
            start = (
                width * (0.5 + (start[0] - 0.5) * growth),
                height * (0.72 + (start[1] - 0.72) * growth),
            )
            end = (
                width * (0.5 + (end[0] - 0.5) * growth),
                height * (0.72 + (end[1] - 0.72) * growth),
            )
            if distance_to_segment((x, y), start, end) < width * 0.004 * growth:
                return "paper", 0.5, random.random() > 0.8

    if growth > 0.08:
        radius = math.hypot(
            (x - width * 0.5) / (width * 0.31 * growth),
            (y - height * 0.42) / (height * 0.28 * growth),
        )
        if 0.88 < radius < 1.08:
            return "halo", 0.55, random.random() > 0.985

    return None


def colorize(glyph, shape, bright, enabled):
    if not enabled:
        return glyph
    kind, glow, highlight = shape
    if kind == "rose":
        color = LIGHT_ROSE if highlight or glow > 0.78 else ROSE if bright else PINK
    elif kind == "leaf":
        color = LIGHT_GREEN if highlight else GREEN
    elif kind == "gold":
        color = GOLD
    elif kind == "halo":
        color = WHITE if highlight else DIM
    else:
        color = WHITE if highlight else DIM
    return f"{color}{glyph}{RESET}"


def render_frame(width, height, time_value, petals, enabled):
    grid = [[" " for _ in range(width)] for _ in range(height)]
    growth = growth_at(time_value)

    for _ in range(max(16, width * height // 170)):
        x = random.randrange(width)
        y = random.randrange(height)
        grid[y][x] = random.choice(["·", "+", "˙"])

    roses = {"rose"}
    for row in range(height):
        for column in range(width):
            shape = sample_bouquet(column, row, time_value, width, height, growth)
            if not shape:
                continue
            kind, glow, highlight = shape
            if kind in roses:
                glyph = random.choice("@%*&+;:.")
            elif kind == "leaf":
                glyph = random.choice("&%+=-.")
            elif kind == "gold":
                glyph = random.choice("$*+=.")
            else:
                glyph = random.choice("/\\|:.*")
            grid[row][column] = colorize(glyph, shape, random.random() > 0.5, enabled)

    for petal in petals:
        x = round(petal["x"])
        y = round(petal["y"])
        if 0 <= y < height and 0 <= x < width:
            grid[y][x] = f"{PINK}{petal['glyph']}{RESET}" if enabled else petal["glyph"]

    if growth > 0.94 and height > 2:
        message = "F O R  Y O U,  M A R I A N N A  <3"
        message_row = min(height - 1, round(height * 0.83))
        message_start = max(0, (width - len(message)) // 2)
        for index, character in enumerate(message[:width]):
            grid[message_row][message_start + index] = f"{PINK}{character}{RESET}" if enabled else character

    letters = sum(character.strip() != "" for row in grid for character in row)
    lines = ["".join(row).rstrip() for row in grid]
    dedication = f"{PINK}For you, Marianna ♡{RESET}" if enabled else "For you, Marianna"
    status = f"{DIM}growing {growth * 100:4.1f}%  ·  letters {letters:,}{RESET}" if enabled else f"growing {growth * 100:4.1f}%  ·  letters {letters:,}"
    return "\n".join(
        [
            f"{DIM}✦  a little bouquet in ASCII  ✦{RESET}" if enabled else "✦  a little bouquet in ASCII  ✦",
            *lines,
            "",
            f"  {dedication}",
            f"  {status}",
            f"{DIM}  press SPACE to send more petals · Q to close{RESET}" if enabled else "  press SPACE to send more petals · Q to close",
        ]
    )


def run_animation(once, no_color):
    if once:
        size = shutil.get_terminal_size(fallback=(82, 34))
        width = min(82, max(48, size.columns - 2))
        height = min(29, max(18, size.lines - 7))
        print(render_frame(width, height, 11, [], not no_color))
        return

    if not sys.stdin.isatty():
        raise SystemExit("Use --once to print one frame when output is redirected.")

    import select
    import termios
    import tty

    original_terminal = termios.tcgetattr(sys.stdin.fileno())
    term_rows, term_columns = shutil.get_terminal_size(fallback=(82, 34))
    width = min(82, max(48, term_columns - 2))
    height = min(29, max(18, term_rows - 7))
    petals = []
    started = time.monotonic()
    last_spawn = 0
    color = not no_color

    try:
        tty.setcbreak(sys.stdin.fileno())
        sys.stdout.write("\033[?25l")
        while True:
            now = time.monotonic()
            elapsed = now - started
            if elapsed - last_spawn > 0.72:
                last_spawn = elapsed
                petals.append({
                    "x": random.uniform(width * 0.32, width * 0.68),
                    "y": random.uniform(height * 0.25, height * 0.46),
                    "speed": random.uniform(0.35, 0.8),
                    "drift": random.uniform(-0.2, 0.2),
                    "glyph": random.choice(["*", "✧", "·", "°"]),
                })

            for petal in petals:
                petal["x"] += petal["drift"] + math.sin(elapsed + petal["y"]) * 0.035
                petal["y"] += petal["speed"]
            petals = [petal for petal in petals if petal["y"] < height]

            elapsed_text = f"{int(elapsed // 60):02}:{int(elapsed % 60):02}"
            frame = render_frame(width, height, elapsed, petals, color)
            sys.stdout.write(f"\033[H\033[2J{frame}\n{DIM}  {elapsed_text}{RESET if color else ''}")
            sys.stdout.flush()

            readable, _, _ = select.select([sys.stdin], [], [], 1 / 18)
            if readable:
                key = os.read(sys.stdin.fileno(), 1).decode("utf-8", errors="ignore").lower()
                if key == "q":
                    break
                if key == " ":
                    petals.extend(
                        {
                            "x": random.uniform(width * 0.32, width * 0.68),
                            "y": random.uniform(height * 0.25, height * 0.46),
                            "speed": random.uniform(0.35, 0.8),
                            "drift": random.uniform(-0.2, 0.2),
                            "glyph": random.choice(["*", "✧", "·", "°"]),
                        }
                        for _ in range(18)
                    )
    except KeyboardInterrupt:
        pass
    finally:
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, original_terminal)
        sys.stdout.write(f"\033[?25h{RESET if color else ''}\n")
        sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description="An animated ASCII bouquet for Marianna.")
    parser.add_argument("--once", action="store_true", help="Print one frame and exit.")
    parser.add_argument("--no-color", action="store_true", help="Disable terminal colors.")
    options = parser.parse_args()
    run_animation(options.once, options.no_color)


if __name__ == "__main__":
    main()
