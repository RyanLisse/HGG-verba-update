import io
import json
import os

import aiohttp
import httpx
from wasabi import msg

from goldenverba.components.interfaces import Embedding
from goldenverba.components.types import InputConfig
from goldenverba.components.util import get_environment, get_token
from goldenverba.components.http_client import AsyncSafeModelManager


class OpenAIEmbedder(Embedding):
    """OpenAIEmbedder for Verba."""

    def __init__(self):
        super().__init__()
        self.name = "OpenAI"
        self.description = "Vectorizes documents and queries using OpenAI"

        # If a different key is set for the OpenAI embedding, use it
        api_key = get_token("OPENAI_EMBED_API_KEY")
        api_key = api_key if api_key else get_token("OPENAI_API_KEY")

        # Fetch available models using async-safe manager
        base_url = os.getenv("OPENAI_EMBED_BASE_URL")
        base_url = (
            base_url
            if base_url
            else os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        )
        self._model_manager = AsyncSafeModelManager()
        models = self._model_manager.get_models_safe(api_key, base_url)

        # Set up configuration
        default_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        self.config = {
            "Model": InputConfig(
                type="dropdown",
                value=default_model,
                description="Select an OpenAI Embedding Model",
                values=models,
            )
        }

        # Add API Key and URL configs if not set in environment
        if api_key is None:
            self.config["API Key"] = InputConfig(
                type="password",
                value="",
                description=(
                    "OpenAI API Key (or set OPENAI_EMBED_API_KEY or "
                    "OPENAI_API_KEY env var)"
                ),
                values=[],
            )
        if (
            os.getenv("OPENAI_EMBED_BASE_URL") is None
            and os.getenv("OPENAI_BASE_URL") is None
        ):
            self.config["URL"] = InputConfig(
                type="text",
                value=base_url,
                description="OpenAI API Base URL (if different from default)",
                values=[],
            )

    async def vectorize(self, config: dict, content: list[str]) -> list[list[float]]:
        """Vectorize the input content using OpenAI's API."""
        model = config.get("Model", {"value": "text-embedding-ada-002"}).value
        key_name = (
            "OPENAI_EMBED_API_KEY"
            if get_token("OPENAI_EMBED_API_KEY")
            else "OPENAI_API_KEY"
        )
        api_key = get_environment(
            config, "API Key", key_name, "No OpenAI API Key found"
        )
        base_url_name = (
            "OPENAI_EMBED_BASE_URL"
            if os.getenv("OPENAI_EMBED_BASE_URL")
            else "OPENAI_BASE_URL"
        )
        base_url = get_environment(config, "URL", base_url_name, "No OpenAI URL found")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {"input": content, "model": model}

        # Convert payload to BytesIO object
        payload_bytes = json.dumps(payload).encode("utf-8")
        payload_io = io.BytesIO(payload_bytes)

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{base_url}/embeddings",
                    headers=headers,
                    data=payload_io,
                    timeout=30,
                ) as response:
                    response.raise_for_status()
                    data = await response.json()

                    if "data" not in data:
                        raise ValueError(f"Unexpected API response: {data}")

                    embeddings = [item["embedding"] for item in data["data"]]
                    if len(embeddings) != len(content):
                        raise ValueError(
                            f"Mismatch in embedding count: got {len(embeddings)}, "
                            f"expected {len(content)}"
                        )

                    return embeddings

            except aiohttp.ClientError as e:
                if isinstance(e, aiohttp.ClientResponseError) and e.status == 429:
                    raise RuntimeError(
                        "Rate limit exceeded. Waiting before retrying..."
                    ) from e
                raise RuntimeError(f"API request failed: {e!s}") from e

            except Exception as e:
                msg.fail(f"Unexpected error: {type(e).__name__} - {e!s}")
                raise

    @staticmethod
    def get_models(token: str, url: str) -> list[str]:
        """Fetch available embedding models from OpenAI API.
        
        This method is kept for backward compatibility but now uses
        the async-safe model manager internally.
        """
        model_manager = AsyncSafeModelManager()
        return model_manager.get_models_safe(token, url)
    
    async def get_models_async(self, token: str, url: str) -> list[str]:
        """Async version of get_models for use in async contexts."""
        return await self._model_manager.get_models_async(token, url)
