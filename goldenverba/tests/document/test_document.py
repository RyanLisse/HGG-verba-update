import sys

import pytest


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_document_initialization():
    """Test basic document initialization"""
    from goldenverba.components.document import Document

    doc = Document(
        title="Test Doc",
        content="This is a test document.",
        extension=".txt",
        fileSize=23,
        labels=["test"],
        source="local",
        meta={"key": "value"},
        metadata="test metadata",
    )

    assert doc.title == "Test Doc"
    assert doc.content == "This is a test document."
    assert doc.extension == ".txt"
    assert doc.fileSize == 23
    assert doc.labels == ["test"]
    assert doc.source == "local"
    assert doc.meta == {"key": "value"}
    assert doc.metadata == "test metadata"
    assert hasattr(doc, "spacy_doc")


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_document_json_serialization():
    """Test document to/from JSON conversion"""
    from goldenverba.components.document import Document

    original_doc = Document(
        title="Test Doc",
        content="Test content",
        extension=".txt",
        fileSize=12,
        labels=["test"],
        source="local",
        meta={"key": "value"},
        metadata="test metadata",
    )

    # Convert to JSON
    json_dict = Document.to_json(original_doc)

    # Convert back from JSON
    restored_doc = Document.from_json(json_dict, None)

    assert restored_doc.title == original_doc.title
    assert restored_doc.content == original_doc.content
    assert restored_doc.extension == original_doc.extension
    assert restored_doc.fileSize == original_doc.fileSize
    assert restored_doc.labels == original_doc.labels
    assert restored_doc.source == original_doc.source
    assert restored_doc.metadata == original_doc.metadata


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_create_document_from_file_config():
    """Test document creation from FileConfig"""
    # TODO: Add test
    assert True


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_document_with_large_content():
    """Test document initialization with content larger than batch size"""
    from goldenverba.components.document import Document

    large_content = "Test sentence. " * 50000  # Creates a large string
    doc = Document(content=large_content)

    assert len(doc.content) > 500000  # Verify content is larger than MAX_BATCH_SIZE
    assert hasattr(doc, "spacy_doc")


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_invalid_json_document():
    """Test document creation from invalid JSON"""
    from goldenverba.components.document import Document

    invalid_dict = {"title": "Test"}  # Missing required fields

    doc = Document.from_json(invalid_dict, None)
    assert doc is None


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_special_characters_in_content():
    """Test document initialization with special characters in content"""
    from goldenverba.components.document import Document

    content = (
        "This is a test document with special characters: !@#$%^&*()_+-=[]{}|;:,.<>?~ "
    )
    content += "Hej detta är ett test, jag bor på en ö"
    doc = Document(content=content)
    assert doc.content == content
    assert doc.spacy_doc.text == content
    assert doc.spacy_doc.sents is not None


@pytest.mark.skipif(
    sys.platform == "darwin",
    reason="Skipping spacy-dependent tests due to binary compatibility issues on macOS",
)
def test_arabic_in_content():
    """Test document initialization with Arabic in content"""
    from goldenverba.components.document import Document

    content = "نص اختبار باللغة العربية"
    doc = Document(content=content)
    assert doc.content == content
    assert doc.spacy_doc.text == content
    assert doc.spacy_doc.sents is not None
