"""TwelveLabs video understanding plugin (opt-in).

Uses TwelveLabs' cloud models to enrich the local-first knowledge base:

* **Pegasus** generates a rich, whole-video natural-language description that
  is attached to every sampled frame (mirroring :class:`DescriptorPlugin`),
  so it flows straight into the existing transcription/NLP and ChromaDB
  semantic-search pipeline.
* **Marengo** produces a 512-dimensional multimodal video embedding, exposed
  through :meth:`get_results` for callers that want to index videos in a
  vector store.

The plugin is fully opt-in: it only contacts the network when a
``TWELVELABS_API_KEY`` is present in the environment (or in the analysis
config). Without a key it loads as a no-op and changes nothing, so existing
local-only behaviour is preserved. Failures degrade gracefully and never abort
an analysis job.

Get a free API key at https://twelvelabs.io (generous free tier).
"""
from typing import Dict, List, Optional, Union
import os

import numpy as np

from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from core.config import AnalysisConfig
from services.logger import get_logger

logger = get_logger(__name__)

# Whole-video Pegasus prompt. Kept generic so descriptions are useful for
# semantic search across an arbitrary personal video library.
DEFAULT_PROMPT = (
    "Describe this video in detail. Cover the setting, the people and objects "
    "present, the main actions and events, and the overall mood. Write a "
    "single dense paragraph optimised for search."
)

# Model identifiers (TwelveLabs SDK >= 1.2.8).
PEGASUS_MODEL = "pegasus1.5"
MARENGO_MODEL = "marengo3.0"

# How long to wait for the async Marengo embedding task to finish (seconds).
EMBED_TIMEOUT_SEC = 300


class TwelveLabsPlugin(AnalyzerPlugin):
    """Whole-video understanding via TwelveLabs Pegasus + Marengo.

    Unlike the frame-by-frame plugins, TwelveLabs analyses the whole video in
    the cloud. The expensive upload + analysis happens once per job in
    :meth:`setup`; :meth:`analyze_frame` then cheaply tags each sampled frame
    with the resulting description.
    """

    def __init__(self, config: AnalysisConfig):
        super().__init__(config)
        # config is passed to plugins as a dict (see PluginManager._load_plugins).
        self.api_key: Optional[str] = self._read_api_key(config)
        self.prompt: str = (
            self._read_config(config, "twelvelabs_prompt", None) or DEFAULT_PROMPT
        )
        self.enable_embedding: bool = bool(
            self._read_config(config, "twelvelabs_embedding", True)
        )
        self.client = None
        self.description: Optional[str] = None
        self.embedding: Optional[List[float]] = None

    @staticmethod
    def _read_config(config, key: str, default):
        """config may be a dict (runtime) or an AnalysisConfig (tests)."""
        if isinstance(config, dict):
            return config.get(key, default)
        return getattr(config, key, default)

    def _read_api_key(self, config) -> Optional[str]:
        key = self._read_config(config, "twelvelabs_api_key", None)
        return key or os.environ.get("TWELVELABS_API_KEY")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def load_models(self) -> None:
        """Construct the API client once per process (no heavy local model)."""
        if not self.enabled:
            logger.info(
                "TwelveLabsPlugin disabled: set TWELVELABS_API_KEY to enable "
                "Pegasus analysis + Marengo embeddings."
            )
            return
        try:
            from twelvelabs import TwelveLabs
        except ImportError:
            logger.error(
                "TwelveLabsPlugin enabled but the 'twelvelabs' package is not "
                "installed. Run: pip install 'twelvelabs>=1.2.8'."
            )
            self.api_key = None
            return
        self.client = TwelveLabs(api_key=self.api_key)
        logger.info("TwelveLabsPlugin ready (Pegasus + Marengo)")

    def setup(self, video_path: str, job_id: str) -> None:
        """Run whole-video Pegasus analysis (and Marengo embedding) once."""
        self.description = None
        self.embedding = None
        if not self.enabled or self.client is None:
            return

        self.description = self._analyze(video_path)
        if self.enable_embedding:
            self.embedding = self._embed(video_path)

    def _analyze(self, video_path: str) -> Optional[str]:
        """Pegasus whole-video description.

        Pegasus reads from a server-side asset, so the local file is uploaded
        once as a TwelveLabs asset and referenced by id.
        """
        try:
            from twelvelabs.types.video_context import VideoContext_AssetId

            with open(video_path, "rb") as f:
                asset = self.client.assets.create(method="direct", file=f)

            resp = self.client.analyze(
                model_name=PEGASUS_MODEL,
                video=VideoContext_AssetId(asset_id=asset.id),
                prompt=self.prompt,
                max_tokens=2048,
            )
            text = (resp.data or "").strip().lower()
            logger.info("TwelveLabs Pegasus described video (%d chars)", len(text))
            return text or None
        except Exception as e:  # noqa: BLE001 - degrade gracefully, never fail a job
            logger.error("TwelveLabs Pegasus analysis failed: %s", e)
            return None

    def _embed(self, video_path: str) -> Optional[List[float]]:
        """Marengo 512-dim multimodal video embedding (async task)."""
        try:
            with open(video_path, "rb") as f:
                task = self.client.embed.tasks.create(
                    model_name=MARENGO_MODEL,
                    video_file=f,
                    video_embedding_scope=["video"],
                )
            self.client.embed.tasks.wait_for_done(
                task_id=task.id,
                request_options={"timeout_in_seconds": EMBED_TIMEOUT_SEC},
            )
            result = self.client.embed.tasks.retrieve(task_id=task.id)
            segments = (
                result.video_embedding.segments if result.video_embedding else []
            ) or []
            if not segments:
                return None
            vector = list(segments[0].float_)
            logger.info("TwelveLabs Marengo embedded video (%d dims)", len(vector))
            return vector
        except Exception as e:  # noqa: BLE001 - degrade gracefully
            logger.error("TwelveLabs Marengo embedding failed: %s", e)
            return None

    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_analysis: FrameAnalysis,
        video_path: str,
    ) -> FrameAnalysis:
        """Attach the whole-video description to each sampled frame.

        Pegasus describes the video as a whole, so every frame carries the same
        description. We only set it when no other plugin (e.g. BLIP) has
        already produced a per-frame caption, keeping the integration additive.
        """
        if self.description and not frame_analysis.get("description"):
            frame_analysis["description"] = self.description
        return frame_analysis

    def get_results(self) -> PluginResult:
        if not self.description and not self.embedding:
            return None
        result: Dict[str, Union[str, List[float], int]] = {}
        if self.description:
            result["description"] = self.description
        if self.embedding:
            result["embedding"] = self.embedding
            result["embedding_model"] = MARENGO_MODEL
            result["embedding_dim"] = len(self.embedding)
        return result

    def get_summary(self) -> PluginResult:
        return {"description": self.description} if self.description else None

    def cleanup(self) -> None:
        self.description = None
        self.embedding = None

    def cleanup_models(self) -> None:
        self.client = None
