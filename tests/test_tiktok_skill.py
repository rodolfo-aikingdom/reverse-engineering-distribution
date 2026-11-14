"""Offline contracts for the bundled public TikTok video research skill."""

import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skills" / "tiktok-video-research" / "scripts"


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Response:
    url = "https://www.tiktok.com/@example/video/123"

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        item = {"id": "123", "author": {"uniqueId": "example"},
                "video": {"duration": 18}, "stats": {"playCount": 42}}
        state = {"__DEFAULT_SCOPE__": {"webapp.video-detail": {"itemInfo": {"itemStruct": item}}}}
        return ('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">'
                + json.dumps(state) + '</script>').encode()


class TikTokSkillTests(unittest.TestCase):
    def test_public_metadata_is_from_the_requested_video(self):
        probe = load("probe")
        with patch.object(probe.urllib.request, "urlopen", return_value=Response()):
            data = probe.probe(Response.url)
        self.assertEqual(data["id"], "123")
        self.assertEqual(data["author"], "example")
        self.assertEqual(data["duration_seconds"], 18)
        self.assertEqual(data["play_count"], 42)

    def test_rejects_non_tiktok_url_without_network(self):
        probe = load("probe")
        with patch.object(probe.urllib.request, "urlopen") as request:
            with self.assertRaises(ValueError):
                probe.probe("https://example.test/video/123")
            request.assert_not_called()

    def test_sheet_segments_include_the_end(self):
        sheet = load("contact_sheet")
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            video = tmp / "fixture.mp4"
            video.write_bytes(b"synthetic fixture")
            calls = []

            def fake_run(args, **kwargs):
                calls.append(args)
                if args[0] == "ffprobe":
                    return subprocess.CompletedProcess(args, 0, stdout='{"format":{"duration":"25"}}')
                Path(args[-1]).write_bytes(b"synthetic sheet")
                return subprocess.CompletedProcess(args, 0)

            with patch.object(sheet.subprocess, "run", side_effect=fake_run):
                outputs = sheet.contact_sheets(video, tmp / "sheet")
            self.assertEqual(len(outputs), 3)
            self.assertEqual([args[5] for args in calls[1:]], ["0", "12", "24"])
            self.assertTrue(all(path.exists() for path in outputs))


if __name__ == "__main__":
    unittest.main()
