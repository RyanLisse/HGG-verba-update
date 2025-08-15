import json
import os

import httpx
from dotenv import load_dotenv
from wasabi import msg

from goldenverba.components.interfaces import Generator
from goldenverba.components.types import InputConfig
from goldenverba.components.util import get_environment, get_token

load_dotenv()


class LiteLLMGenerator(Generator):
    """
    LiteLLM-compatible Generator. Points to a LiteLLM proxy using the OpenAI API shape.
    """

    def __init__(self):
        super().__init__()
        self.name = "LiteLLM"
        self.description = (
            "Use a LiteLLM proxy to generate answers across many providers"
        )
        self.context_window = 10000
        self.requires_env = ["LITELLM_BASE_URL", "LITELLM_API_KEY"]

        api_key = get_token("LITELLM_API_KEY")
        base_url = os.getenv("LITELLM_BASE_URL", "")
        models = self.get_models(api_key, base_url)
        default_model = os.getenv("LITELLM_MODEL", models[0] if models else "gpt-4o")

        self.config["Model"] = InputConfig(
            type="text" if not models else "dropdown",
            value=default_model,
            description="Select or enter a LiteLLM model id",
            values=models,
        )

        if os.getenv("LITELLM_API_KEY") is None:
            self.config["API Key"] = InputConfig(
                type="password",
                value="",
                description=(
                    "Set your LiteLLM API Key here or via env `LITELLM_API_KEY`"
                ),
                values=[],
            )
        if os.getenv("LITELLM_BASE_URL") is None:
            self.config["URL"] = InputConfig(
                type="text",
                value="",
                description="LiteLLM Base URL (e.g., http://localhost:4000)",
                values=[],
            )

    async def generate_stream(
        self,
        config: dict,
        query: str,
        context: str,
        conversation: list[dict] | None = None,
    ):
        if conversation is None:
            conversation = []
        system_message = config.get("System Message").value
        model = config.get("Model", {"value": "gpt-4o"}).value

        api_key = get_environment(
            config, "API Key", "LITELLM_API_KEY", "No LiteLLM API Key found"
        )
        base_url = get_environment(config, "URL", "LITELLM_BASE_URL", "")
        if base_url == "":
            raise Exception("Set LITELLM_BASE_URL or configure URL in the UI")

        messages = self.prepare_messages(query, context, conversation, system_message)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        data = {"messages": messages, "model": model, "stream": True}

        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    f"{base_url}/chat/completions",
                    json=data,
                    headers=headers,
                    timeout=None,
                ) as response:
                    if response.status_code != 200:
                        raise Exception(
                            f"LiteLLM chat/completions returned {response.status_code}"
                        )
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        if line.strip() == "data: [DONE]":
                            break
                        json_line = json.loads(line[6:])
                        choice = json_line.get("choices", [{}])[0]
                        if "delta" in choice and "content" in choice["delta"]:
                            yield {
                                "message": choice["delta"]["content"],
                                "finish_reason": choice.get("finish_reason"),
                            }
                        elif "finish_reason" in choice:
                            yield {
                                "message": "",
                                "finish_reason": choice["finish_reason"],
                            }
            except Exception as e:
                msg.fail(f"LiteLLM stream error: {e!s}")
                yield {"message": str(e), "finish_reason": "stop"}

    def prepare_messages(
        self, query: str, context: str, conversation: list[dict], system_message: str
    ) -> list[dict]:
        messages = [
            {"role": "system", "content": system_message},
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

    def get_models(self, token: str, url: str) -> list[str]:
        # Try to fetch from /models; otherwise return an empty list to enable free text
        try:
            if not token or not url:
                return []
            headers = {"Authorization": f"Bearer {token}"}
            try:
                import asyncio
                import aiohttp
                async def _fetch():
                    async with aiohttp.ClientSession() as s:
                        async with s.get(
                            f"{url}/models", headers=headers, timeout=10
                        ) as r:
                            r.raise_for_status()
                            data = await r.json()
                            return [
                                m.get("id") for m in data.get("data", []) if isinstance(m, dict)
                            ]
                models = asyncio.run(_fetch())
            except RuntimeError:
                models = []
            except Exception:
                models = []
            return [m for m in models if "embedding" not in m]
        except Exception:
            return []
