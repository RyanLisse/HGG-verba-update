import json
import os
from collections.abc import AsyncGenerator
from urllib.parse import urljoin

import aiohttp

from goldenverba.components.embedding.OllamaEmbedder import get_models
from goldenverba.components.interfaces import Generator
from goldenverba.components.types import InputConfig


class OllamaGenerator(Generator):
    def __init__(self):
        super().__init__()
        self.name = "Ollama"
        self.url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.description = (
            f"Generate answers using Ollama. If your Ollama instance is not "
            f"running on {self.url}, you can change the URL by setting the "
            f"OLLAMA_URL environment variable."
        )
        self.context_window = 10000

        # Fetch available models
        models = get_models(self.url)

        # Configure the model selection dropdown
        self.config["Model"] = InputConfig(
            type="dropdown",
            value=os.getenv("OLLAMA_MODEL") or models[0] if models else "",
            description=f"Select an installed Ollama model from {self.url}.",
            values=models,
        )

    async def generate_stream(
        self,
        config: dict,
        query: str,
        context: str,
        conversation: list[dict] | None = None,
    ) -> AsyncGenerator[dict, None]:
        if conversation is None:
            conversation = []
        model = config.get("Model").value
        system_message = config.get("System Message").value

        if not self.url:
            yield self._error_response("Missing Ollama URL")
            return

        messages = self._prepare_messages(query, context, conversation, system_message)
        data = {"model": model, "messages": messages}

        try:
            async with (
                aiohttp.ClientSession() as session,
                session.post(urljoin(self.url, "/api/chat"), json=data) as response,
            ):
                async for line in response.content:
                    if line.strip():
                        yield self._process_response(line)
                    else:
                        yield self._empty_response()

        except Exception as e:
            yield self._error_response(
                f"Unexpected error, make sure to have {model} installed: {e!s}"
            )

    def _prepare_messages(
        self,
        query: str,
        context: str,
        conversation: list[dict],
        system_message: str,
    ) -> list[dict]:
        """Prepare the message list for the Ollama API request."""
        messages = [
            {"role": "system", "content": system_message},
            *[
                {"role": message.type, "content": message.content}
                for message in conversation
            ],
            {
                "role": "user",
                "content": (
                    f"With this provided context: {context} Please answer this "
                    f"query: {query}"
                ),
            },
        ]
        return messages

    @staticmethod
    def _process_response(line: bytes) -> dict:
        """Process a single line of response from the Ollama API."""
        json_data = json.loads(line.decode("utf-8"))

        if "error" in json_data:
            return {
                "message": json_data.get("error", "Unexpected Error"),
                "finish_reason": "stop",
            }

        return {
            "message": json_data.get("message", {}).get("content", ""),
            "finish_reason": "stop" if json_data.get("done", False) else "",
        }

    @staticmethod
    def _empty_response() -> dict:
        """Return an empty response."""
        return {"message": "", "finish_reason": "stop"}

    @staticmethod
    def _error_response(message: str) -> dict:
        """Return an error response."""
        return {"message": message, "finish_reason": "stop"}
