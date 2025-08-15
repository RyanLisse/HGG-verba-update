import contextlib

from wasabi import msg

with contextlib.suppress(Exception):
    from sklearn.metrics.pairwise import cosine_similarity

import numpy as np

from goldenverba.components.chunk import Chunk
from goldenverba.components.document import Document
from goldenverba.components.interfaces import Chunker, Embedding
from goldenverba.components.types import InputConfig


class SemanticChunker(Chunker):
    """
    SemanticChunker for Verba based on https://github.com/FullStackRetrieval-com/RetrievalTutorials/blob/main/tutorials/LevelsOfTextSplitting/5_Levels_Of_Text_Splitting.ipynb
    """

    def __init__(self):
        super().__init__()
        self.name = "Semantic"
        self.requires_library = ["sklearn"]
        self.description = (
            "Split documents based on semantic similarity or max sentences"
        )
        self.config = {
            "Breakpoint Percentile Threshold": InputConfig(
                type="number",
                value=80,
                description="Percentile Threshold to split and create a chunk, "
                "the lower the more chunks you get",
                values=[],
            ),
            "Max Sentences Per Chunk": InputConfig(
                type="number",
                value=20,
                description="Maximum number of sentences per chunk",
                values=[],
            ),
        }

    async def chunk(
        self,
        config: dict,
        documents: list[Document],
        embedder: Embedding | None = None,
        embedder_config: dict | None = None,
    ) -> list[Document]:
        breakpoint_percentile_threshold = int(
            config["Breakpoint Percentile Threshold"].value
        )
        max_sentences = int(config["Max Sentences Per Chunk"].value)

        for document in documents:
            if len(document.chunks) > 0:
                continue

            await self._process_document_chunks(
                document,
                embedder,
                embedder_config,
                breakpoint_percentile_threshold,
                max_sentences,
            )

        return documents

    async def _process_document_chunks(
        self,
        document: Document,
        embedder: Embedding,
        embedder_config: dict,
        breakpoint_percentile_threshold: int,
        max_sentences: int,
    ) -> None:
        """Process a single document into semantic chunks."""
        sentences = self._extract_sentences(document)

        if len(sentences) == 1:
            self._create_single_chunk(document, sentences[0])
            return

        sentences_with_embeddings = await self._add_embeddings(
            sentences, embedder, embedder_config
        )

        chunks, char_positions = self._create_semantic_chunks(
            sentences_with_embeddings, breakpoint_percentile_threshold, max_sentences
        )

        self._add_chunks_to_document(document, chunks, char_positions)

    def _extract_sentences(self, document: Document) -> list[dict]:
        """Extract and combine sentences from document."""
        sentences = [
            {"sentence": sent.text, "index": i}
            for i, sent in enumerate(document.spacy_doc.sents)
        ]
        return self.combine_sentences(sentences)

    def _create_single_chunk(self, document: Document, sentence: dict) -> None:
        """Create a single chunk when only one sentence exists."""
        document.chunks.append(
            Chunk(
                content=sentence["sentence"],
                chunk_id="0",
                start_i=0,
                end_i=len(document.content),
                content_without_overlap=sentence["sentence"],
            )
        )

    async def _add_embeddings(
        self, sentences: list[dict], embedder: Embedding, embedder_config: dict
    ) -> list[dict]:
        """Add embeddings to sentences."""
        msg.info(f"Generated {len(sentences)} sentences")

        embeddings = await embedder.vectorize(
            embedder_config, [x["combined_sentence"] for x in sentences]
        )

        msg.info(f"Generated {len(embeddings)} embeddings")

        for i, sentence in enumerate(sentences):
            sentence["combined_sentence_embedding"] = embeddings[i]

        return sentences

    def _create_semantic_chunks(
        self,
        sentences: list[dict],
        breakpoint_percentile_threshold: int,
        max_sentences: int,
    ) -> tuple[list[str], list[tuple[int, int]]]:
        """Create semantic chunks based on distance thresholds."""
        distances, sentences = self.calculate_cosine_distances(sentences)

        breakpoint_distance_threshold = np.percentile(
            distances, breakpoint_percentile_threshold
        )

        chunks = []
        char_positions = []
        current_chunk = []
        sentence_count = 0
        char_end_i = -1

        for i, sentence in enumerate(sentences):
            current_chunk.append(sentence["sentence"])
            sentence_count += 1

            should_break = (
                i < len(distances) and distances[i] > breakpoint_distance_threshold
            ) or sentence_count >= max_sentences

            if should_break:
                chunk_text = " ".join(current_chunk)
                chunks.append(chunk_text)

                char_start_i = char_end_i + 1
                char_end_i = char_start_i + len(chunk_text)
                char_positions.append((char_start_i, char_end_i))

                current_chunk = []
                sentence_count = 0

        # Add remaining sentences as final chunk
        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append(chunk_text)
            char_positions.append((char_end_i + 1, char_end_i + 1 + len(chunk_text)))

        return chunks, char_positions

    def _add_chunks_to_document(
        self,
        document: Document,
        chunks: list[str],
        char_positions: list[tuple[int, int]],
    ) -> None:
        """Add processed chunks to document."""
        for i, chunk in enumerate(chunks):
            document.chunks.append(
                Chunk(
                    content=chunk,
                    chunk_id=str(i),
                    start_i=char_positions[i][0],
                    end_i=char_positions[i][1],
                    content_without_overlap=chunk,
                )
            )

    def combine_sentences(self, sentences, buffer_size=1):
        # Go through each sentence dict
        for i in range(len(sentences)):
            # Create a string that will hold the sentences which are joined
            combined_sentence = ""

            # Add sentences before the current one, based on the buffer size.
            for j in range(i - buffer_size, i):
                # Check if the index j is not negative (to avoid index out of
                # range like on the first one)
                if j >= 0:
                    # Add the sentence at index j to the combined_sentence string
                    combined_sentence += sentences[j]["sentence"] + " "

            # Add the current sentence
            combined_sentence += sentences[i]["sentence"]

            # Add sentences after the current one, based on the buffer size
            for j in range(i + 1, i + 1 + buffer_size):
                # Check if the index j is within the range of the sentences list
                if j < len(sentences):
                    # Add the sentence at index j to the combined_sentence string
                    combined_sentence += " " + sentences[j]["sentence"]

            # Then add the whole thing to your dict
            # Store the combined sentence in the current sentence dict
            sentences[i]["combined_sentence"] = combined_sentence

        return sentences

    def calculate_cosine_distances(self, sentences):
        distances = []
        for i in range(len(sentences) - 1):
            embedding_current = sentences[i]["combined_sentence_embedding"]
            embedding_next = sentences[i + 1]["combined_sentence_embedding"]

            # Calculate cosine similarity
            similarity = cosine_similarity([embedding_current], [embedding_next])[0][0]

            # Convert to cosine distance
            distance = 1 - similarity

            # Append cosine distance to the list
            distances.append(distance)

            # Store distance in the dictionary
            sentences[i]["distance_to_next"] = distance

        # Optionally handle the last sentence
        # sentences[-1]['distance_to_next'] = None  # or a default value

        return distances, sentences
