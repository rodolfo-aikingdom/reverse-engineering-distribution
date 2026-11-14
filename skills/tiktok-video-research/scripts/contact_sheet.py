#!/usr/bin/env python3
"""Make one contact sheet per 12-second segment without dropping the ending."""

import argparse
import json
import math
import pathlib
import subprocess
import sys


def contact_sheets(video: pathlib.Path, prefix: pathlib.Path) -> list[pathlib.Path]:
    if not video.is_file():
        raise FileNotFoundError(video)
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video)],
        check=True, capture_output=True, text=True,
    )
    duration = float(json.loads(result.stdout)["format"]["duration"])
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("Invalid video duration")
    prefix.parent.mkdir(parents=True, exist_ok=True)
    outputs = []
    for index in range(math.ceil(duration / 12)):
        start = index * 12
        output = prefix.with_name(f"{prefix.name}-{index + 1:02d}.jpg")
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(start),
             "-t", str(min(12, duration - start)), "-i", str(video),
             "-vf", "fps=1,scale=280:-2,tile=4x3", "-frames:v", "1", "-update", "1", "-y", str(output)],
            check=True,
        )
        if not output.is_file() or output.stat().st_size == 0:
            raise RuntimeError(f"No frame sheet for segment {index + 1}")
        outputs.append(output)
    return outputs


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=pathlib.Path)
    parser.add_argument("prefix", type=pathlib.Path)
    args = parser.parse_args()
    try:
        for sheet in contact_sheets(args.video, args.prefix):
            print(sheet)
    except (FileNotFoundError, ValueError, RuntimeError, subprocess.CalledProcessError, KeyError, json.JSONDecodeError) as exc:
        print(f"contact_sheet failed: {exc}", file=sys.stderr)
        sys.exit(1)
