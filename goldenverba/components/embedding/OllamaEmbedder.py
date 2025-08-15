import os
from urllib.parse import urljoin

import aiohttp
from wasabi import msg

from goldenverba.components.interfaces import Embedding
from goldenverba.components.types import InputConfig
from goldenverba.components.http_client import OllamaAsyncSafeModelManager


class OllamaEmbedder(Embedding):
    def __init__(self):
        super().__init__()
        self.name = "Ollama"
        self.url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.description = (
            f"Vectorizes documents and queries using Ollama. If your Ollama instance "
            f"is not running on {self.url}, you can change the URL by setting the "
            f"OLLAMA_URL environment variable."
        )
        self._model_manager = OllamaAsyncSafeModelManager()
        models = self._model_manager.get_models_safe(self.url)

        self.config = {
            "Model": InputConfig(
                type="dropdown",
                value=os.getenv("OLLAMA_EMBED_MODEL") or models[0],
                description=(
                    f"Select a installed Ollama model from {self.url}. You can change "
                    f"the URL by setting the OLLAMA_URL environment variable. "
                ),
                values=models,
            ),
        }

    async def vectorize(self, config: dict, content: list[str]) -> list[float]:
        model = config.get("Model").value

        data = {"model": model, "input": content}

        async with (
            aiohttp.ClientSession() as session,
            session.post(urljoin(self.url, "/api/embed"), json=data) as response,
        ):
            response.raise_for_status()
            data = await response.json()
            embeddings = data.get("embeddings", [])
            return embeddings


def get_models(url: str):
    """Fetch available models from Ollama API.
    
    This function is kept for backward compatibility but now uses
    the async-safe model manager internally.
    """
    model_manager = OllamaAsyncSafeModelManager()
    models = model_manager.get_models_safe(url)
    
    if not models or models == ["No Ollama Model detected"]:
        msg.info("No Ollama Model detected")
        return ["No Ollama Model detected"]
    
    return models
