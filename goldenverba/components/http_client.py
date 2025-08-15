"""
Async HTTP client implementations for Verba components.
"""

import asyncio
from typing import Any, Dict, Optional
import aiohttp

from goldenverba.components.interfaces import AsyncHTTPClient


class AioHttpClient:
    """Concrete implementation of AsyncHTTPClient using aiohttp."""
    
    def __init__(self, session: Optional[aiohttp.ClientSession] = None):
        self._session = session
        self._owns_session = session is None
    
    async def __aenter__(self):
        if self._session is None:
            self._session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._owns_session and self._session:
            await self._session.close()
    
    async def get(
        self, 
        url: str, 
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """Make an async GET request and return JSON response."""
        if not self._session:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=timeout) as resp:
                    resp.raise_for_status()
                    return await resp.json()
        else:
            async with self._session.get(url, headers=headers, timeout=timeout) as resp:
                resp.raise_for_status()
                return await resp.json()
    
    async def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """Make an async POST request and return JSON response."""
        if not self._session:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data, headers=headers, timeout=timeout) as resp:
                    resp.raise_for_status()
                    return await resp.json()
        else:
            async with self._session.post(url, json=data, headers=headers, timeout=timeout) as resp:
                resp.raise_for_status()
                return await resp.json()


class OpenAIModelFetcher:
    """Model fetcher specifically for OpenAI API."""
    
    def __init__(self, http_client: Optional[AsyncHTTPClient] = None):
        self.http_client = http_client or AioHttpClient()
    
    async def fetch_models(self, token: str, base_url: str) -> list[str]:
        """Fetch available models from OpenAI API."""
        if not token:
            return self.get_default_models()
        
        try:
            response = await self.http_client.get(
                f"{base_url}/models",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            models = [m.get("id") for m in response.get("data", []) if isinstance(m, dict)]
            # Filter for embedding models unless custom flag is set
            import os
            if not os.getenv("OPENAI_CUSTOM_EMBED", False):
                models = [m for m in models if isinstance(m, str) and "embedding" in m]
            
            return models or self.get_default_models()
            
        except Exception:
            # Fall back to defaults on any error
            return self.get_default_models()
    
    def get_default_models(self) -> list[str]:
        """Get default OpenAI embedding models."""
        return [
            "text-embedding-ada-002",
            "text-embedding-3-small",
            "text-embedding-3-large",
        ]


class CohereModelFetcher:
    """Model fetcher specifically for Cohere API."""
    
    def __init__(self, http_client: Optional[AsyncHTTPClient] = None):
        self.http_client = http_client or AioHttpClient()
    
    async def fetch_models(self, token: str, base_url: str, model_type: str = "embed") -> list[str]:
        """Fetch available models from Cohere API."""
        if not token:
            return self.get_default_models()
        
        try:
            response = await self.http_client.get(
                f"{base_url}/models",
                headers={"Authorization": f"bearer {token}"},
                timeout=10
            )
            
            if "models" in response:
                return [
                    model["name"]
                    for model in response["models"]
                    if model_type in model.get("endpoints", [])
                ]
            
            return self.get_default_models()
            
        except Exception:
            # Fall back to defaults on any error
            return self.get_default_models()
    
    def get_default_models(self) -> list[str]:
        """Get default Cohere embedding models."""
        return [
            "embed-english-v3.0",
            "embed-multilingual-v3.0",
            "embed-english-light-v3.0",
            "embed-multilingual-light-v3.0",
        ]


class AsyncSafeModelManager:
    """Manager for async-safe model operations across different contexts."""
    
    def __init__(self, model_fetcher: Optional[OpenAIModelFetcher] = None):
        self.model_fetcher = model_fetcher or OpenAIModelFetcher()
    
    async def get_models_async(self, token: str, url: str) -> list[str]:
        """Get models in an async context."""
        return await self.model_fetcher.fetch_models(token, url)
    
    def get_models_sync(self, token: str, url: str) -> list[str]:
        """Get models in a sync context, handling event loop properly."""
        try:
            # Check if we're in an async context
            loop = asyncio.get_running_loop()
            # If we reach here, we're in an async context - return defaults to avoid blocking
            return self.model_fetcher.get_default_models()
        except RuntimeError:
            # No event loop running, safe to use asyncio.run
            return asyncio.run(self.get_models_async(token, url))
    
    def get_models_safe(self, token: str, url: str) -> list[str]:
        """Safe method that works in both sync and async contexts."""
        return self.get_models_sync(token, url)


class OllamaModelFetcher:
    """Model fetcher specifically for Ollama API."""
    
    def __init__(self, http_client: Optional[AsyncHTTPClient] = None):
        self.http_client = http_client or AioHttpClient()
    
    async def fetch_models(self, base_url: str) -> list[str]:
        """Fetch available models from Ollama API."""
        try:
            from urllib.parse import urljoin
            response = await self.http_client.get(
                urljoin(base_url, "/api/tags"),
                timeout=10
            )
            
            models = [m.get("name") for m in response.get("models", [])]
            return models if models else self.get_default_models()
            
        except Exception:
            # Fall back to defaults on any error
            return self.get_default_models()
    
    def get_default_models(self) -> list[str]:
        """Get default Ollama models when connection fails."""
        return ["No Ollama Model detected"]


class CohereAsyncSafeModelManager:
    """Manager for async-safe Cohere model operations."""
    
    def __init__(self, model_fetcher: Optional[CohereModelFetcher] = None):
        self.model_fetcher = model_fetcher or CohereModelFetcher()
    
    async def get_models_async(self, token: str, url: str, model_type: str = "embed") -> list[str]:
        """Get models in an async context."""
        return await self.model_fetcher.fetch_models(token, url, model_type)
    
    def get_models_sync(self, token: str, url: str, model_type: str = "embed") -> list[str]:
        """Get models in a sync context, handling event loop properly."""
        try:
            # Check if we're in an async context
            loop = asyncio.get_running_loop()
            # If we reach here, we're in an async context - return defaults to avoid blocking
            return self.model_fetcher.get_default_models()
        except RuntimeError:
            # No event loop running, safe to use asyncio.run
            return asyncio.run(self.get_models_async(token, url, model_type))
    
    def get_models_safe(self, token: str, url: str, model_type: str = "embed") -> list[str]:
        """Safe method that works in both sync and async contexts."""
        return self.get_models_sync(token, url, model_type)


class OllamaAsyncSafeModelManager:
    """Manager for async-safe Ollama model operations."""
    
    def __init__(self, model_fetcher: Optional[OllamaModelFetcher] = None):
        self.model_fetcher = model_fetcher or OllamaModelFetcher()
    
    async def get_models_async(self, url: str) -> list[str]:
        """Get models in an async context."""
        return await self.model_fetcher.fetch_models(url)
    
    def get_models_sync(self, url: str) -> list[str]:
        """Get models in a sync context, handling event loop properly."""
        try:
            # Check if we're in an async context
            loop = asyncio.get_running_loop()
            # If we reach here, we're in an async context - return defaults to avoid blocking
            return self.model_fetcher.get_default_models()
        except RuntimeError:
            # No event loop running, safe to use asyncio.run
            return asyncio.run(self.get_models_async(url))
    
    def get_models_safe(self, url: str) -> list[str]:
        """Safe method that works in both sync and async contexts."""
        return self.get_models_sync(url)