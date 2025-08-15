import json
import os

import httpx
from dotenv import load_dotenv
from wasabi import msg

from goldenverba.components.interfaces import Generator
from goldenverba.components.types import InputConfig
from goldenverba.components.util import get_environment, get_token

load_dotenv()


class OpenAIGenerator(Generator):
    """
    OpenAI Generator.
    """

    # Constants for duplicate strings
    DEFAULT_BASE_URL = "https://api.openai.com/v1"
    GPT_5 = "gpt-5"
    GPT_5_MINI = "gpt-5-mini"
    GPT_5_NANO = "gpt-5-nano"
    GPT_5_CHAT_LATEST = "gpt-5-chat-latest"

    def __init__(self):
        super().__init__()
        self.name = "OpenAI"
        self.description = "Using OpenAI LLM models to generate answers to queries"
        self.context_window = 10000
        # Surface env requirement for availability status UI
        self.requires_env = ["OPENAI_API_KEY"]

        api_key = get_token("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", self.DEFAULT_BASE_URL)
        models = self.get_models(api_key, base_url)
        # Prefer GPT-5-mini as default, then other GPT-5 models
        preferred_defaults = [
            self.GPT_5_MINI,
            self.GPT_5,
            self.GPT_5_NANO,
            self.GPT_5_CHAT_LATEST,
        ]
        env_default = os.getenv("OPENAI_MODEL")
        default_model = (
            env_default
            if env_default
            else next((m for m in preferred_defaults if m in models), models[0])
        )

        self.config["Model"] = InputConfig(
            type="dropdown",
            value=default_model,
            description="Select an OpenAI Model",
            values=models,
        )

        # Responses API + Reasoning controls
        self.config["Use Responses API"] = InputConfig(
            type="bool",
            value=True,
            description="Use unified Responses API for GPT‑5 and newer",
            values=[],
        )
        self.config["Reasoning Effort"] = InputConfig(
            type="dropdown",
            value="medium",
            description="Optional reasoning effort for reasoning-capable models",
            values=["none", "low", "medium", "high"],
        )

        if get_token("OPENAI_API_KEY") is None:
            self.config["API Key"] = InputConfig(
                type="password",
                value="",
                description=(
                    "You can set your OpenAI API Key here or set it as environment "
                    "variable `OPENAI_API_KEY`"
                ),
                values=[],
            )
        if os.getenv("OPENAI_BASE_URL") is None:
            self.config["URL"] = InputConfig(
                type="text",
                value=self.DEFAULT_BASE_URL,
                description="You can change the Base URL here if needed",
                values=[],
            )

    async def generate_stream(
        self,
        config: dict,
        query: str,
        context: str,
        conversation: list[dict] | None = None,
    ):
        system_message = config.get("System Message").value
        model_cfg = config.get("Model")
        model = getattr(model_cfg, "value", (model_cfg or {}).get("value", "gpt-4o"))
        use_responses_cfg = config.get("Use Responses API")
        use_responses = getattr(
            use_responses_cfg, "value", (use_responses_cfg or {}).get("value", True)
        )
        reasoning_cfg = config.get("Reasoning Effort")
        reasoning_effort = getattr(
            reasoning_cfg, "value", (reasoning_cfg or {}).get("value", "none")
        )

        openai_key = get_environment(
            config, "API Key", "OPENAI_API_KEY", "No OpenAI API Key found"
        )
        openai_url = get_environment(
            config, "URL", "OPENAI_BASE_URL", self.DEFAULT_BASE_URL
        )

        messages = self.prepare_messages(query, context, conversation, system_message)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai_key}",
        }

        # Prefer the Responses API for GPT‑5 and newer
        if use_responses:
            data = {
                "model": model,
                "messages": messages,
                "stream": True,
            }
            if reasoning_effort and reasoning_effort != "none":
                # Only attach when requested to avoid model incompat errors
                data["reasoning"] = {"effort": reasoning_effort}

            async with httpx.AsyncClient() as client:
                try:
                    async with client.stream(
                        "POST",
                        f"{openai_url}/responses",
                        json=data,
                        headers=headers,
                        timeout=None,
                    ) as response:
                        if response.status_code != 200:
                            # Fallback to Chat Completions for older deployments
                            msg.warn(
                                f"Responses API returned {response.status_code}, "
                                f"falling back to Chat Completions"
                            )
                            async for item in self._chat_completions_stream(
                                headers, openai_url, model, messages
                            ):
                                yield item
                            return

                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            if not line.startswith("data: "):
                                continue
                            if line.strip() == "data: [DONE]":
                                break
                            try:
                                json_line = json.loads(line[6:])
                            except Exception:
                                continue

                            # Handle Responses API event types
                            event_type = json_line.get("type")
                            if (
                                event_type == "response.output_text.delta"
                                and "delta" in json_line
                            ):
                                yield {
                                    "message": json_line["delta"],
                                    "finish_reason": None,
                                }
                            # Reasoning streams (best-effort across variants)
                            elif (
                                event_type
                                in (
                                    "response.reasoning.delta",
                                    "response.reasoning_output_text.delta",
                                    "reasoning.output_text.delta",
                                )
                                and "delta" in json_line
                            ):
                                # Emit empty assistant text delta but include reasoning
                                # delta
                                yield {
                                    "message": "",
                                    "finish_reason": None,
                                    "reasoning": json_line.get("delta", ""),
                                }
                            elif event_type in (
                                "response.completed",
                                "response.error",
                                "response.refusal.delta",
                                "response.output_text.done",
                            ):
                                yield {"message": "", "finish_reason": "stop"}
                            elif "choices" in json_line:
                                # Some proxies still mimic Chat Completions under
                                # /responses
                                choice = json_line["choices"][0]
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
                    # If anything goes wrong, try Chat Completions as a safety net
                    msg.warn(f"Responses stream error: {e!s}; falling back")
                    async for item in self._chat_completions_stream(
                        headers, openai_url, model, messages
                    ):
                        yield item
        else:
            # Explicitly use Chat Completions
            async for item in self._chat_completions_stream(
                headers, openai_url, model, messages
            ):
                yield item

    async def _chat_completions_stream(self, headers, base_url, model, messages):
        data = {"messages": messages, "model": model, "stream": True}
        async with (
            httpx.AsyncClient() as client,
            client.stream(
                "POST",
                f"{base_url}/chat/completions",
                json=data,
                headers=headers,
                timeout=None,
            ) as response,
        ):
            async for line in response.aiter_lines():
                if not line:
                    continue
                if not line.startswith("data: "):
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
                    yield {"message": "", "finish_reason": choice["finish_reason"]}

    def prepare_messages(
        self,
        query: str,
        context: str,
        conversation: list[dict] | None,
        system_message: str,
    ) -> list[dict]:
        messages = [
            {
                "role": "system",
                "content": system_message,
            }
        ]

        for message in conversation or []:
            # Support both dicts and simple objects
            role = (
                message.get("type")
                if isinstance(message, dict)
                else getattr(message, "type", None)
            )
            content = (
                message.get("content")
                if isinstance(message, dict)
                else getattr(message, "content", None)
            )
            if role and content is not None:
                messages.append({"role": role, "content": content})

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
        """Fetch available chat/generation models from OpenAI API."""
        default_models = [
            self.GPT_5,
            self.GPT_5_MINI,
            self.GPT_5_NANO,
            self.GPT_5_CHAT_LATEST,
        ]
        try:
            if token is None:
                return default_models

            headers = {"Authorization": f"Bearer {token}"}
            try:
                import asyncio, aiohttp
                async def _fetch():
                    async with aiohttp.ClientSession() as s:
                        async with s.get(f"{url}/models", headers=headers, timeout=10) as r:
                            r.raise_for_status()
                            data = await r.json()
                            return [m.get("id") for m in data.get("data", []) if isinstance(m, dict)]
                models = asyncio.run(_fetch())
            except RuntimeError:
                # Event loop running, skip remote call in sync context
                models = default_models
            except Exception:
                models = default_models
            models = [m for m in models if "embedding" not in m]
            if not models:
                return default_models
            # Place GPT-5 models first if present
            priority = {
                self.GPT_5_MINI: 0,
                self.GPT_5: 1,
                self.GPT_5_NANO: 2,
                self.GPT_5_CHAT_LATEST: 3,
            }
            models.sort(key=lambda m: priority.get(m, 100))
            return models
        except Exception as e:
            msg.info(f"Failed to fetch OpenAI models: {e!s}")
            return default_models
