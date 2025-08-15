import contextlib

from goldenverba.components.interfaces import Embedding
from goldenverba.components.types import InputConfig

with contextlib.suppress(Exception):
    from sentence_transformers import SentenceTransformer


class SentenceTransformersEmbedder(Embedding):
    """
    SentenceTransformersEmbedder base class for Verba.
    """

    def __init__(self):
        super().__init__()
        self.name = "SentenceTransformers"
        self.requires_library = ["sentence_transformers"]
        self.description = "Embeds and retrieves objects using SentenceTransformer"
        self.config = {
            "Model": InputConfig(
                type="dropdown",
                value="all-MiniLM-L6-v2",
                description="Select an HuggingFace Embedding Model",
                values=[
                    "all-MiniLM-L6-v2",
                    "mixedbread-ai/mxbai-embed-large-v1",
                    "all-mpnet-base-v2",
                    "BAAI/bge-m3",
                    "all-MiniLM-L12-v2",
                    "paraphrase-MiniLM-L6-v2",
                ],
            ),
        }
        # cache for loaded model
        self._model_cache = None
        self._model_name = None

    async def vectorize(self, config: dict, content: list[str]) -> list[float]:
        try:
            model_name = config.get("Model").value
            # Lazy import & cache model instance
            from sentence_transformers import SentenceTransformer
            if self._model_cache is None or self._model_name != model_name:
                self._model_cache = SentenceTransformer(model_name)
                self._model_name = model_name
            embeddings = self._model_cache.encode(content).tolist()
            return embeddings
        except Exception as e:
            raise Exception(f"Failed to vectorize chunks: {e!s}") from e
