import json

import aiohttp
from dotenv import load_dotenv

from goldenverba.components.interfaces import Generator
from goldenverba.components.types import InputConfig
from goldenverba.components.util import get_environment, get_token

load_dotenv()

base_url = "https://api.novita.ai/v3/openai"


class NovitaGenerator(Generator):
    """
    Novita Generator.
    """

    def __init__(self):
        super().__init__()
        self.name = "Novita AI"
        self.description = "Using Novita AI LLM models to generate answers to queries"
        self.context_window = 8192

        models = get_models()

        self.config["Model"] = InputConfig(
            type="dropdown",
            value=models[0],
            description="Select a Novita Model",
            values=models,
        )

        if get_token("NOVITA_API_KEY") is None:
            self.config["API Key"] = InputConfig(
                type="password",
                value="",
                description=(
                    "You can set your Novita API Key here or set it as environment "
                    "variable `NOVITA_API_KEY`"
                ),
                values=[],
            )

    def _prepare_request_data(
        self, config: dict, query: str, context: str, conversation: list[dict]
    ) -> tuple[dict, dict]:
        """Prepare headers and data for the API request."""
        system_message = config.get("System Message").value
        model = config.get("Model", {"value": "deepseek/deepseek_v3"}).value
        novita_key = get_environment(
            config, "API Key", "NOVITA_API_KEY", "No Novita API Key found"
        )

        messages = self.prepare_messages(query, context, conversation, system_message)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {novita_key}",
        }
        data = {
            "messages": messages,
            "model": model,
            "stream": True,
        }
        return headers, data

    def _process_stream_line(self, line: str) -> dict:
        """Process a single line from the stream response."""
        if line == "data: [DONE]":
            return {"message": "", "finish_reason": "stop"}

        if line.startswith("data:"):
            line = line[5:].strip()

        json_line = json.loads(line)
        choice = json_line.get("choices")[0]
        return {
            "message": choice.get("delta", {}).get("content", ""),
            "finish_reason": (
                "stop" if choice.get("finish_reason", "") == "stop" else ""
            ),
        }

    async def generate_stream(
        self,
        config: dict,
        query: str,
        context: str,
        conversation: list[dict] | None = None,
    ):
        if conversation is None:
            conversation = []

        headers, data = self._prepare_request_data(config, query, context, conversation)

        async with (
            aiohttp.ClientSession() as client,
            client.post(
                url=f"{base_url}/chat/completions",
                json=data,
                headers=headers,
                timeout=None,
            ) as response,
        ):
            if response.status == 200:
                async for line in response.content:
                    if line.strip():
                        line = line.decode("utf-8").strip()
                        yield self._process_stream_line(line)
            else:
                error_message = await response.text()
                yield {
                    "message": f"HTTP Error {response.status}: {error_message}",
                    "finish_reason": "stop",
                }

    def prepare_messages(
        self, query: str, context: str, conversation: list[dict], system_message: str
    ) -> list[dict]:
        messages = [
            {
                "role": "system",
                "content": system_message,
            }
        ]

        for message in conversation:
            messages.append({"role": message.type, "content": message.content})

        messages.append(
            {
                "role": "user",
                "content": (
                    f"Answer this query: '{query}' with this provided context: "
                    f"{context}"
                ),
            }
        )

        return messages


def get_models():
    try:
        try:
            import asyncio, aiohttp
            async def _fetch():
                async with aiohttp.ClientSession() as s:
                    async with s.get(base_url + "/models", timeout=30) as r:
                        r.raise_for_status()
                        data = await r.json()
                        return [m.get("id") for m in data.get("data", [])]
            models = asyncio.run(_fetch())
        except RuntimeError:
            models = ["No Novita AI Model detected"]
        except Exception:
            models = ["No Novita AI Model detected"]
        if len(models) > 0:
            return models
        return ["No Novita AI Model detected"]
    except Exception:
        return ["Couldn't connect to Novita AI"]
