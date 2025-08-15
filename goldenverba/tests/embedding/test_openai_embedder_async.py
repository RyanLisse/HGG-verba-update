"""
TDD London School tests for OpenAIEmbedder async patterns.

This module tests the behavior of OpenAIEmbedder with focus on:
- Async-safe model fetching without blocking
- Proper dependency injection and mocking
- Contract verification for HTTP client interactions
- Behavior in both sync and async contexts
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from aioresponses import aioresponses

from goldenverba.components.interfaces import AsyncHTTPClient, ModelFetcher


class MockHTTPClient:
    """Mock HTTP client for testing async behavior."""
    
    def __init__(self):
        self.get = AsyncMock()
        self.post = AsyncMock()


class MockOpenAIModelFetcher(ModelFetcher):
    """Mock model fetcher for OpenAI API."""
    
    def __init__(self, http_client: AsyncHTTPClient):
        super().__init__(http_client)
    
    async def fetch_models(self, token: str, base_url: str) -> list[str]:
        """Mock implementation that uses the injected HTTP client."""
        if not token:
            return self.get_default_models()
        
        response = await self.http_client.get(
            f"{base_url}/models",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        models = [m.get("id") for m in response.get("data", []) if isinstance(m, dict)]
        embedding_models = [m for m in models if isinstance(m, str) and "embedding" in m]
        return embedding_models or self.get_default_models()
    
    def get_default_models(self) -> list[str]:
        """Return default OpenAI embedding models."""
        return [
            "text-embedding-ada-002",
            "text-embedding-3-small", 
            "text-embedding-3-large",
        ]


class TestOpenAIEmbedderAsyncBehavior:
    """Test OpenAI embedder async behavior using London School TDD methodology."""
    
    @pytest.fixture
    def mock_http_client(self):
        """Fixture providing a mock HTTP client."""
        return MockHTTPClient()
    
    @pytest.fixture
    def model_fetcher(self, mock_http_client):
        """Fixture providing a model fetcher with injected dependencies."""
        return MockOpenAIModelFetcher(mock_http_client)
    
    async def test_fetch_models_successful_api_call(self, model_fetcher, mock_http_client):
        """Test successful model fetching via API."""
        # Arrange - Mock successful API response
        mock_api_response = {
            "data": [
                {"id": "text-embedding-ada-002", "object": "model"},
                {"id": "text-embedding-3-small", "object": "model"},
                {"id": "text-embedding-3-large", "object": "model"},
                {"id": "gpt-4", "object": "model"},  # Non-embedding model
            ]
        }
        mock_http_client.get.return_value = mock_api_response
        
        # Act - Fetch models
        models = await model_fetcher.fetch_models("test-token", "https://api.openai.com/v1")
        
        # Assert - Verify behavior and interactions
        assert len(models) == 3
        assert "text-embedding-ada-002" in models
        assert "text-embedding-3-small" in models
        assert "text-embedding-3-large" in models
        assert "gpt-4" not in models  # Should filter out non-embedding models
        
        # Verify the HTTP client was called correctly
        mock_http_client.get.assert_called_once_with(
            "https://api.openai.com/v1/models",
            headers={"Authorization": "Bearer test-token"},
            timeout=10
        )
    
    async def test_fetch_models_no_token_returns_defaults(self, model_fetcher, mock_http_client):
        """Test that no token results in default models without API call."""
        # Act
        models = await model_fetcher.fetch_models(None, "https://api.openai.com/v1")
        
        # Assert
        assert models == [
            "text-embedding-ada-002",
            "text-embedding-3-small", 
            "text-embedding-3-large",
        ]
        
        # Verify no HTTP call was made
        mock_http_client.get.assert_not_called()
    
    async def test_fetch_models_empty_response_returns_defaults(self, model_fetcher, mock_http_client):
        """Test that empty API response falls back to defaults."""
        # Arrange
        mock_http_client.get.return_value = {"data": []}
        
        # Act
        models = await model_fetcher.fetch_models("test-token", "https://api.openai.com/v1")
        
        # Assert
        assert models == [
            "text-embedding-ada-002",
            "text-embedding-3-small", 
            "text-embedding-3-large",
        ]
    
    async def test_fetch_models_api_error_raises_exception(self, model_fetcher, mock_http_client):
        """Test that API errors are properly propagated."""
        # Arrange
        mock_http_client.get.side_effect = Exception("API Error")
        
        # Act & Assert
        with pytest.raises(Exception, match="API Error"):
            await model_fetcher.fetch_models("test-token", "https://api.openai.com/v1")


class TestAsyncSafeModelProvider:
    """Test the async-safe model provider base class behavior."""
    
    @pytest.fixture
    def mock_provider(self):
        """Create a mock provider implementing AsyncSafeModelProvider."""
        from goldenverba.components.interfaces import AsyncSafeModelProvider
        
        class MockAsyncSafeProvider(AsyncSafeModelProvider):
            async def get_models_async(self, token: str, url: str) -> list[str]:
                # Simulate async model fetching
                await asyncio.sleep(0.01)  # Small delay to simulate async work
                return ["model1", "model2", "model3"]
        
        return MockAsyncSafeProvider()
    
    async def test_get_models_async_works_in_async_context(self, mock_provider):
        """Test that async method works properly in async context."""
        # Act
        models = await mock_provider.get_models_async("token", "url")
        
        # Assert
        assert models == ["model1", "model2", "model3"]
    
    def test_get_models_sync_without_running_loop(self, mock_provider):
        """Test sync method when no event loop is running."""
        # Act - This should work as it will use asyncio.run internally
        models = mock_provider.get_models_sync("token", "url")
        
        # Assert
        assert models == ["model1", "model2", "model3"]
    
    async def test_get_models_sync_with_running_loop_returns_defaults(self, mock_provider):
        """Test sync method behavior when event loop is already running."""
        # Arrange - Set up a mock model fetcher that returns defaults
        mock_fetcher = MagicMock()
        mock_fetcher.get_default_models.return_value = ["default1", "default2"]
        mock_provider.model_fetcher = mock_fetcher
        
        # Act - Call sync method from within async context (event loop running)
        models = mock_provider.get_models_sync("token", "url")
        
        # Assert - Should return defaults to avoid blocking
        assert models == ["default1", "default2"]
        mock_fetcher.get_default_models.assert_called_once()


class TestOpenAIEmbedderAsyncIntegration:
    """Integration tests for OpenAI embedder async behavior."""
    
    @pytest.mark.asyncio
    async def test_async_model_fetching_in_running_event_loop(self):
        """Test that model fetching works properly within an async event loop."""
        # This test verifies the core issue: asyncio.run() should not be called
        # when an event loop is already running
        
        # Arrange - Mock the aiohttp session
        with aioresponses() as mock_aiohttp:
            mock_aiohttp.get(
                "https://api.openai.com/v1/models",
                payload={
                    "data": [
                        {"id": "text-embedding-ada-002", "object": "model"},
                        {"id": "text-embedding-3-small", "object": "model"},
                    ]
                }
            )
            
            # Act - Create a mock HTTP client that uses aiohttp
            class RealAsyncHTTPClient:
                async def get(self, url: str, headers=None, timeout=None):
                    import aiohttp
                    async with aiohttp.ClientSession() as session:
                        async with session.get(url, headers=headers, timeout=timeout) as resp:
                            return await resp.json()
            
            http_client = RealAsyncHTTPClient()
            model_fetcher = MockOpenAIModelFetcher(http_client)
            
            # This should work without blocking or raising RuntimeError
            models = await model_fetcher.fetch_models("test-token", "https://api.openai.com/v1")
            
            # Assert
            assert "text-embedding-ada-002" in models
            assert "text-embedding-3-small" in models
    
    def test_demonstrates_current_blocking_problem(self):
        """Test that demonstrates the current blocking problem with asyncio.run()."""
        async def simulate_blocking_behavior():
            # This simulates what currently happens in OpenAIEmbedder.get_models()
            async def _fetch():
                return ["model1", "model2"]
            
            # This would raise RuntimeError in a real async context
            with pytest.raises(RuntimeError, match="cannot be called from a running event loop"):
                return asyncio.run(_fetch())
        
        # Run this in an event loop to demonstrate the problem
        asyncio.run(simulate_blocking_behavior())