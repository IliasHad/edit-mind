import sys
import types
from unittest.mock import patch

sys.modules.setdefault("easyocr", types.SimpleNamespace(Reader=object))

from plugins.text_detection import TextDetectionPlugin
from services.websocket.messages import RequestParser


def test_analysis_request_parser_preserves_supported_language():
    request = RequestParser.parse_analysis_request(
        {
            "video_path": "/tmp/video.mp4",
            "json_file_path": "/tmp/analysis.json",
            "job_id": "job-1",
            "language": "ru",
        }
    )

    assert request.language == "ru"


def test_analysis_request_parser_defaults_unsupported_language_to_english():
    request = RequestParser.parse_analysis_request(
        {
            "video_path": "/tmp/video.mp4",
            "json_file_path": "/tmp/analysis.json",
            "job_id": "job-1",
            "language": "fr",
        }
    )

    assert request.language == "en"


def test_text_detection_loads_russian_and_english_reader_for_russian_jobs():
    plugin = TextDetectionPlugin({"device": "cpu"})
    plugin.setup("/tmp/video.mp4", "job-1", "ru")

    with patch("plugins.text_detection.easyocr.Reader") as reader:
        plugin.load_models()

    reader.assert_called_once_with(
        ["ru", "en"],
        gpu=False,
        verbose=False,
        download_enabled=True,
    )


def test_text_detection_loads_english_reader_by_default():
    plugin = TextDetectionPlugin({"device": "cpu"})

    with patch("plugins.text_detection.easyocr.Reader") as reader:
        plugin.load_models()

    reader.assert_called_once_with(
        ["en"],
        gpu=False,
        verbose=False,
        download_enabled=True,
    )
