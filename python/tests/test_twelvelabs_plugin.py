"""Tests for the opt-in TwelveLabs plugin.

The network test is skipped unless TWELVELABS_API_KEY is set, so the suite
stays green in CI/local-only environments. The unit tests need no network.

Run from the ``python/`` directory:  pytest tests/test_twelvelabs_plugin.py
"""
import os

import numpy as np
import pytest

from plugins.twelvelabs import TwelveLabsPlugin, MARENGO_MODEL, DEFAULT_PROMPT


def test_disabled_without_api_key(monkeypatch):
    """No key -> plugin is a pure no-op and never touches the network."""
    monkeypatch.delenv("TWELVELABS_API_KEY", raising=False)
    plugin = TwelveLabsPlugin({})

    assert plugin.enabled is False

    plugin.load_models()  # must not construct a client or raise
    assert plugin.client is None

    plugin.setup("does-not-exist.mp4", job_id="job1")  # must not hit the API
    frame = np.zeros((4, 4, 3), dtype=np.uint8)
    out = plugin.analyze_frame(frame, {}, "does-not-exist.mp4")

    assert "description" not in out
    assert plugin.get_results() is None
    assert plugin.get_summary() is None


def test_enabled_with_api_key_in_config():
    """Key supplied via config (not env) flips the plugin on."""
    plugin = TwelveLabsPlugin({"twelvelabs_api_key": "test-key"})
    assert plugin.enabled is True
    assert plugin.prompt == DEFAULT_PROMPT


def test_config_overrides():
    plugin = TwelveLabsPlugin(
        {
            "twelvelabs_api_key": "k",
            "twelvelabs_prompt": "custom prompt",
            "twelvelabs_embedding": False,
        }
    )
    assert plugin.prompt == "custom prompt"
    assert plugin.enable_embedding is False


def test_analyze_frame_tags_description_additively():
    """Pegasus description fills in only when no other plugin captioned."""
    plugin = TwelveLabsPlugin({"twelvelabs_api_key": "k"})
    plugin.description = "a dog runs on a beach"

    blank = plugin.analyze_frame(np.zeros((2, 2, 3), np.uint8), {}, "v.mp4")
    assert blank["description"] == "a dog runs on a beach"

    # Existing caption from another plugin is preserved.
    existing = plugin.analyze_frame(
        np.zeros((2, 2, 3), np.uint8), {"description": "blip caption"}, "v.mp4"
    )
    assert existing["description"] == "blip caption"


def test_get_results_shape():
    plugin = TwelveLabsPlugin({"twelvelabs_api_key": "k"})
    plugin.description = "desc"
    plugin.embedding = [0.0] * 512
    result = plugin.get_results()
    assert result["description"] == "desc"
    assert result["embedding_dim"] == 512
    assert result["embedding_model"] == MARENGO_MODEL


@pytest.mark.skipif(
    not os.environ.get("TWELVELABS_API_KEY"),
    reason="requires TWELVELABS_API_KEY (network)",
)
def test_marengo_text_embedding_is_512d():
    """Live check: Marengo returns a 512-dim multimodal embedding."""
    from twelvelabs import TwelveLabs

    client = TwelveLabs(api_key=os.environ["TWELVELABS_API_KEY"])
    resp = client.embed.create(
        model_name=MARENGO_MODEL, text="a person riding a bicycle in a park"
    )
    vector = resp.text_embedding.segments[0].float_
    assert len(vector) == 512
