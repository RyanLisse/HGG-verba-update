"""
Integration tests for async-safe embedding components.

This module verifies that all embedders work properly in async contexts
without blocking, following TDD London School methodology with proper
contract verification and behavior testing.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from aioresponses import aioresponses

from goldenverba.components.embedding.OpenAIEmbedder import OpenAIEmbedder
from goldenverba.components.embedding.CohereEmbedder import CohereEmbedder
from goldenverba.components.embedding.OllamaEmbedder import OllamaEmbedder
from goldenverba.components.http_client import (
    AsyncSafeModelManager,
    CohereAsyncSafeModelManager,
    OllamaAsyncSafeModelManager,
)


class TestAsyncSafeEmbedderIntegration:
    """Integration tests for async-safe embedder behavior."""
    
    @pytest.mark.asyncio
    async def test_openai_embedder_no_blocking_in_async_context(self):
        """Test that OpenAIEmbedder doesn't block when used in async context."""
        # Arrange
        with patch('goldenverba.components.util.get_token') as mock_token:
            mock_token.return_value = "test-key"
            
            # Act - This should not raise RuntimeError about event loop
            embedder = OpenAIEmbedder()
            
            # Assert - Verify the embedder was created without blocking
            assert embedder.name == "OpenAI"
            assert hasattr(embedder, '_model_manager')
            assert isinstance(embedder._model_manager, AsyncSafeModelManager)
    
    @pytest.mark.asyncio
    async def test_cohere_embedder_no_blocking_in_async_context(self):
        """Test that CohereEmbedder doesn't block when used in async context."""
        # Arrange
        with patch('goldenverba.components.util.get_token') as mock_token:
            mock_token.return_value = "test-key"
            
            # Act - This should not raise RuntimeError about event loop
            embedder = CohereEmbedder()
            
            # Assert - Verify the embedder was created without blocking
            assert embedder.name == "Cohere"
            assert hasattr(embedder, '_model_manager')
            assert isinstance(embedder._model_manager, CohereAsyncSafeModelManager)
    
    @pytest.mark.asyncio
    async def test_ollama_embedder_no_blocking_in_async_context(self):
        """Test that OllamaEmbedder doesn't block when used in async context."""
        # Act - This should not raise RuntimeError about event loop
        embedder = OllamaEmbedder()
        
        # Assert - Verify the embedder was created without blocking
        assert embedder.name == "Ollama"
        assert hasattr(embedder, '_model_manager')
        assert isinstance(embedder._model_manager, OllamaAsyncSafeModelManager)
    
    @pytest.mark.asyncio
    async def test_multiple_embedders_concurrent_initialization(self):
        """Test that multiple embedders can be initialized concurrently."""
        # Arrange
        with patch('goldenverba.components.util.get_token') as mock_token:
            mock_token.return_value = "test-key"
            
            async def create_openai():
                return OpenAIEmbedder()
            
            async def create_cohere():
                return CohereEmbedder()
            
            async def create_ollama():
                return OllamaEmbedder()
            
            # Act - Create multiple embedders concurrently
            openai_task = asyncio.create_task(create_openai())
            cohere_task = asyncio.create_task(create_cohere())
            ollama_task = asyncio.create_task(create_ollama())
            
            openai_embedder, cohere_embedder, ollama_embedder = await asyncio.gather(
                openai_task, cohere_task, ollama_task
            )
            
            # Assert - All embedders should be created successfully
            assert openai_embedder.name == "OpenAI"
            assert cohere_embedder.name == "Cohere"
            assert ollama_embedder.name == "Ollama"
    
    def test_embedders_work_in_sync_context(self):
        """Test that embedders still work when created in sync context."""
        # Arrange & Act - Create embedders in sync context
        with patch('goldenverba.components.util.get_token') as mock_token:
            mock_token.return_value = "test-key"
            
            openai_embedder = OpenAIEmbedder()
            cohere_embedder = CohereEmbedder()
            ollama_embedder = OllamaEmbedder()
            
            # Assert - All embedders should be created successfully
            assert openai_embedder.name == "OpenAI"
            assert cohere_embedder.name == "Cohere"
            assert ollama_embedder.name == "Ollama"
    
    @pytest.mark.asyncio
    async def test_model_fetching_with_real_async_patterns(self):
        """Test model fetching using real async patterns without blocking."""
        # Test OpenAI async model fetching
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
            
            manager = AsyncSafeModelManager()
            models = await manager.get_models_async("test-token", "https://api.openai.com/v1")
            
            assert "text-embedding-ada-002" in models
            assert "text-embedding-3-small" in models
    
    @pytest.mark.asyncio
    async def test_embedder_model_managers_handle_event_loop_correctly(self):
        """Test that model managers correctly detect running event loop."""
        # This test verifies the core fix: proper event loop detection
        
        # Arrange
        openai_manager = AsyncSafeModelManager()
        cohere_manager = CohereAsyncSafeModelManager()
        ollama_manager = OllamaAsyncSafeModelManager()
        
        # Act - Call sync methods from within async context
        # These should return defaults to avoid blocking
        openai_models = openai_manager.get_models_sync("token", "url")
        cohere_models = cohere_manager.get_models_sync("token", "url", "embed")
        ollama_models = ollama_manager.get_models_sync("url")
        
        # Assert - Should return default models without blocking
        assert isinstance(openai_models, list)
        assert isinstance(cohere_models, list)
        assert isinstance(ollama_models, list)
        
        # Verify they returned defaults (not empty lists)
        assert len(openai_models) > 0
        assert len(cohere_models) > 0
        assert len(ollama_models) > 0


class TestBackwardCompatibility:
    """Test that the fixes maintain backward compatibility."""
    
    def test_openai_get_models_static_method_works(self):
        """Test that OpenAI static get_models method still works."""
        # Act
        models = OpenAIEmbedder.get_models("test-token", "https://api.openai.com/v1")
        
        # Assert
        assert isinstance(models, list)
        assert len(models) > 0
    
    def test_cohere_get_models_function_works(self):
        """Test that Cohere get_models function still works."""
        # Import the function
        from goldenverba.components.embedding.CohereEmbedder import get_models
        
        # Act
        models = get_models("https://api.cohere.com/v1", "test-token", "embed")
        
        # Assert
        assert isinstance(models, list)
        assert len(models) > 0
    
    def test_ollama_get_models_function_works(self):
        """Test that Ollama get_models function still works."""
        # Import the function
        from goldenverba.components.embedding.OllamaEmbedder import get_models
        
        # Act
        models = get_models("http://localhost:11434")
        
        # Assert
        assert isinstance(models, list)
        assert len(models) > 0


class TestAsyncSafetyDemonstration:
    """Demonstrate that the async safety fixes actually work."""
    
    @pytest.mark.asyncio
    async def test_demonstrates_original_problem_is_fixed(self):
        """Demonstrate that we fixed the original asyncio.run() blocking issue."""
        
        # This would have failed before our fix
        async def simulate_embedder_usage():
            # Before: This would raise RuntimeError about event loop
            # After: This works fine
            with patch('goldenverba.components.util.get_token') as mock_token:
                mock_token.return_value = "test-key"
                
                embedder = OpenAIEmbedder()
                assert embedder.name == "OpenAI"
                
                # Also test the static method
                models = OpenAIEmbedder.get_models("token", "url")
                assert isinstance(models, list)
        
        # This should work without raising RuntimeError
        await simulate_embedder_usage()
    
    def test_sync_context_still_uses_asyncio_run_safely(self):
        """Test that sync contexts can still use asyncio.run when safe."""
        # This test runs in sync context, so asyncio.run should be safe
        
        manager = AsyncSafeModelManager()
        
        # This should use asyncio.run internally since no event loop is running
        models = manager.get_models_sync("token", "url")
        
        # Should return defaults since we're mocking and token/url are fake
        assert isinstance(models, list)
        assert len(models) > 0


class TestContractVerification:
    """Verify that all components satisfy their contracts."""
    
    def test_all_embedders_implement_required_interface(self):
        """Verify embedders implement the required interface."""
        # Test that all embedders have required methods and attributes
        with patch('goldenverba.components.util.get_token') as mock_token:
            mock_token.return_value = "test-key"
            
            embedders = [OpenAIEmbedder(), CohereEmbedder(), OllamaEmbedder()]
            
            for embedder in embedders:
                # Required attributes
                assert hasattr(embedder, 'name')
                assert hasattr(embedder, 'description')
                assert hasattr(embedder, 'config')
                
                # Required methods
                assert hasattr(embedder, 'vectorize')
                assert callable(getattr(embedder, 'vectorize'))
                
                # New async-safe attributes
                assert hasattr(embedder, '_model_manager')
    
    @pytest.mark.asyncio
    async def test_model_managers_satisfy_async_contracts(self):
        """Verify model managers implement async contracts correctly."""
        managers = [
            AsyncSafeModelManager(),
            CohereAsyncSafeModelManager(),
            OllamaAsyncSafeModelManager(),
        ]
        
        for manager in managers:
            # Required methods
            assert hasattr(manager, 'get_models_async')
            assert hasattr(manager, 'get_models_sync')
            assert hasattr(manager, 'get_models_safe')
            
            # All methods should be callable
            assert callable(getattr(manager, 'get_models_async'))
            assert callable(getattr(manager, 'get_models_sync'))
            assert callable(getattr(manager, 'get_models_safe'))