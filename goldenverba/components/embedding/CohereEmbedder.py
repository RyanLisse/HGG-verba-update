import json
import os

import aiohttp
from wasabi import msg

from goldenverba.components.interfaces import Embedding
from goldenverba.components.types import InputConfig
from goldenverba.components.util import get_environment, get_token
from goldenverba.components.http_client import CohereAsyncSafeModelManager


class CohereEmbedder(Embedding):
    """
    CohereEmbedder for Verba.
    """

    def __init__(self):
        super().__init__()
        self.name = "Cohere"
        self.description = "Vectorizes documents and queries using Cohere"
        self.url = os.getenv("COHERE_BASE_URL", "https://api.cohere.com/v1")
        self._model_manager = CohereAsyncSafeModelManager()
        models = self._model_manager.get_models_safe(get_token("COHERE_API_KEY", None), self.url, "embed")

        self.config["Model"] = InputConfig(
            type="dropdown",
            value=models[0] if models else "",
            description="Select a Cohere Embedding Model",
            values=models if models else [],
        )

        if get_token("COHERE_API_KEY") is None:
            self.config["API Key"] = InputConfig(
                type="password",
                value="",
                description=(
                    "You can set your Cohere API Key here or set it as "
                    "environment variable `COHERE_API_KEY`"
                ),
                values=[],
            )

    async def vectorize(self, config: dict, content: list[str]) -> list[float]:
        model = config.get("Model", "embed-english-v3.0").value
        api_key = get_environment(
            config, "API Key", "COHERE_API_KEY", "No Cohere API Key found"
        )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"bearer {api_key}",
        }

        # Function to split the content into chunks of up to 96 texts
        def chunks(lst, n):
            for i in range(0, len(lst), n):
                yield lst[i : i + n]

        all_embeddings = []

        async with aiohttp.ClientSession() as session:
            for chunk in chunks(content, 96):
                data = {"texts": chunk, "model": model, "input_type": "search_document"}
                async with session.post(
                    self.url + "/embed", data=json.dumps(data), headers=headers
                ) as response:
                    response.raise_for_status()
                    response_data = await response.json()
                    embeddings = response_data.get("embeddings", [])
                    all_embeddings.extend(embeddings)

        return all_embeddings


def get_models(url: str, token: str, model_type: str):
    """Fetch available models from Cohere API.
    
    This function is kept for backward compatibility but now uses
    the async-safe model manager internally.
    """
    model_manager = CohereAsyncSafeModelManager()
    return model_manager.get_models_safe(token, url, model_type)
