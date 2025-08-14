import os
from dotenv import load_dotenv
from goldenverba.components.interfaces import Generator
from goldenverba.components.types import InputConfig
from goldenverba.components.util import get_environment, get_token
from typing import List
import httpx
import json
from wasabi import msg

load_dotenv()


class OpenAIGenerator(Generator):
    """
    OpenAI Generator.
    """

    def __init__(self):
        super().__init__()
        self.name = "OpenAI"
        self.description = "Using OpenAI LLM models to generate answers to queries"
        self.context_window = 10000
        # Surface env requirement for availability status UI
        self.requires_env = ["OPENAI_API_KEY"]

        api_key = get_token("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        models = self.get_models(api_key, base_url)
        # Prefer GPT‑5 models if present, otherwise fall back to first
        preferred_defaults = [
            "gpt-5.1",
            "gpt-5.1-mini",
            "gpt-5",
            "gpt-4.1",
            "gpt-4o",
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
            value="none",
            description="Optional reasoning effort for reasoning-capable models",
            values=["none", "low", "medium", "high"],
        )

        if get_token("OPENAI_API_KEY") is None:
            self.config["API Key"] = InputConfig(
                type="password",
                value="",
                description="You can set your OpenAI API Key here or set it as environment variable `OPENAI_API_KEY`",
                values=[],
            )
        if os.getenv("OPENAI_BASE_URL") is None:
            self.config["URL"] = InputConfig(
                type="text",
                value="https://api.openai.com/v1",
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
            config, "URL", "OPENAI_BASE_URL", "https://api.openai.com/v1"
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
                                f"Responses API returned {response.status_code}, falling back to Chat Completions"
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
                            if event_type == "response.output_text.delta" and "delta" in json_line:
                                yield {
                                    "message": json_line["delta"],
                                    "finish_reason": None,
                                }
                            # Reasoning streams (best-effort across variants)
                            elif event_type in (
                                "response.reasoning.delta",
                                "response.reasoning_output_text.delta",
                                "reasoning.output_text.delta",
                            ) and "delta" in json_line:
                                # Emit empty assistant text delta but include reasoning delta
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
                                # Some proxies still mimic Chat Completions under /responses
                                choice = json_line["choices"][0]
                                if "delta" in choice and "content" in choice["delta"]:
                                    yield {
                                        "message": choice["delta"]["content"],
                                        "finish_reason": choice.get("finish_reason"),
                                    }
                                elif "finish_reason" in choice:
                                    yield {"message": "", "finish_reason": choice["finish_reason"]}
                except Exception as e:
                    # If anything goes wrong, try Chat Completions as a safety net
                    msg.warn(f"Responses stream error: {str(e)}; falling back")
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
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                json=data,
                headers=headers,
                timeout=None,
            ) as response:
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
        self, query: str, context: str, conversation: list[dict] | None, system_message: str
    ) -> list[dict]:
        messages = [
            {
                "role": "system",
                "content": system_message,
            }
        ]

        for message in (conversation or []):
            # Support both dicts and simple objects
            role = message.get("type") if isinstance(message, dict) else getattr(message, "type", None)
            content = message.get("content") if isinstance(message, dict) else getattr(message, "content", None)
            if role and content is not None:
                messages.append({"role": role, "content": content})

        messages.append(
            {
                "role": "user",
                "content": f"Answer this query: '{query}' with this provided context: {context}",
            }
        )

        return messages

    def get_models(self, token: str, url: str) -> List[str]:
        """Fetch available chat/generation models from OpenAI API."""
        default_models = [
            "gpt-5.1",
            "gpt-5.1-mini",
            "gpt-5",
            "gpt-4.1",
            "gpt-4o",
            "gpt-3.5-turbo",
        ]
        try:
            if token is None:
                return default_models

            import requests

            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{url}/models", headers=headers, timeout=10)
            response.raise_for_status()
            models = [
                model["id"]
                for model in response.json()["data"]
                if "embedding" not in model["id"]
            ]
            if not models:
                return default_models
            # Place GPT‑5 models first if present
            priority = {
                "gpt-5.1": 0,
                "gpt-5.1-mini": 1,
                "gpt-5": 2,
                "gpt-4.1": 3,
                "gpt-4o": 4,
            }
            models.sort(key=lambda m: priority.get(m, 100))
            return models
        except Exception as e:
            msg.info(f"Failed to fetch OpenAI models: {str(e)}")
            return default_models
