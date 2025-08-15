'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FaArrowAltCircleLeft, FaArrowAltCircleRight } from 'react-icons/fa';
import { IoNewspaper } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { fetch_chunks } from '@/app/api';
import type {
  ChunksPayload,
  Credentials,
  Theme,
  VerbaChunk,
} from '@/app/types';

import VerbaButton from '../Navigation/VerbaButton';

type ChunkViewProps = {
  selectedDocument: string | null;
  selectedTheme: Theme;
  credentials: Credentials;
};

const ChunkView: React.FC<ChunkViewProps> = ({
  selectedDocument,
  credentials,
  selectedTheme,
}) => {
  const [isFetching, setIsFetching] = useState(false);
  const [chunks, setChunks] = useState<VerbaChunk[]>([]);
  const [page, setPage] = useState(1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPreviousDisabled, setIsPreviousDisabled] = useState(true);

  const fetchChunks = useCallback(
    async (pageNumber: number) => {
      try {
        setIsFetching(true);

        const data: ChunksPayload | null = await fetch_chunks(
          selectedDocument,
          pageNumber,
          pageSize,
          credentials
        );

        if (data) {
          if (data.error !== '') {
            setIsFetching(false);
            setChunks([]);
            return false; // No more chunks available
          }
          setChunks(data.chunks);
          setIsFetching(false);
          return data.chunks.length > 0; // Return true if chunks were fetched
        }
        return false; // No more chunks available
      } catch (_error) {
        setIsFetching(false);
        return false; // No more chunks available
      }
    },
    [selectedDocument, credentials]
  );

  useEffect(() => {
    fetchChunks(page);
    setIsPreviousDisabled(page === 1 && currentChunkIndex === 0);
  }, [page, currentChunkIndex, fetchChunks]);

  useEffect(() => {
    fetchChunks(1);
    setCurrentChunkIndex(0);
    setIsPreviousDisabled(true);
  }, [fetchChunks]);

  const pageSize = 10;

  const nextChunk = async () => {
    if (currentChunkIndex === chunks.length - 1) {
      const hasMoreChunks = await fetchChunks(page + 1);
      if (hasMoreChunks) {
        setPage((prev) => prev + 1);
        setCurrentChunkIndex(0);
      } else {
        await fetchChunks(1);
        setPage(1);
        setCurrentChunkIndex(0);
      }
    } else {
      setCurrentChunkIndex((prev) => prev + 1);
    }
  };

  const previousChunk = async () => {
    if (currentChunkIndex === 0) {
      if (page > 1) {
        const prevPage = page - 1;
        const hasChunks = await fetchChunks(prevPage);
        if (hasChunks) {
          setPage(prevPage);
          setCurrentChunkIndex(pageSize - 1);
        }
      } else {
        let lastPage = page;
        let hasMoreChunks = true;
        while (hasMoreChunks) {
          hasMoreChunks = await fetchChunks(lastPage + 1);
          if (hasMoreChunks) {
            lastPage++;
          }
        }
        await fetchChunks(lastPage);
        setPage(lastPage);
        setCurrentChunkIndex(chunks.length - 1);
      }
    } else {
      setCurrentChunkIndex((prev) => prev - 1);
    }
  };

  if (chunks.length === 0) {
    return (
      <div>
        {isFetching && (
          <div className="flex h-full items-center justify-center gap-2 text-text-verba">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {chunks.length > 0 && (
        <div className="flex h-full flex-col overflow-hidden rounded-lg bg-bg-alt-verba">
          {/* Content div */}
          <div className="grow overflow-hidden p-3">
            <div className="mb-2 flex justify-between">
              <div className="flex gap-2">
                <div className="flex w-fit items-center gap-2 rounded-full bg-secondary-verba p-3">
                  <IoNewspaper size={12} />
                  <p className="flex text-text-verba text-xs">
                    Chunk {chunks[currentChunkIndex]?.chunk_id || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-3rem)] overflow-y-auto">
              <div className="md:prose-base sm:prose-sm max-w-[50vw] flex-wrap items-center justify-center prose-pre:bg-bg-alt-verba p-3">
                <ReactMarkdown
                  components={{
                    code(props: any) {
                      const { inline, className, children, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          language={match[1]}
                          PreTag="div"
                          style={
                            selectedTheme.theme === 'dark'
                              ? (oneDark as unknown)
                              : (oneLight as unknown)
                          }
                          {...rest}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {chunks[currentChunkIndex]?.content || 'No content available'}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Navigation div */}
          {chunks.length > 1 && (
            <div className="flex items-center justify-center gap-2 bg-bg-alt-verba p-3">
              <VerbaButton
                className="btn-sm min-w-min max-w-[200px]"
                disabled={isPreviousDisabled}
                Icon={FaArrowAltCircleLeft}
                onClick={previousChunk}
                text_class_name="text-xs"
                title={'Previous Chunk'}
              />
              <VerbaButton
                className="btn-sm min-w-min max-w-[200px]"
                Icon={FaArrowAltCircleRight}
                onClick={nextChunk}
                text_class_name="text-xs"
                title={'Next Chunk'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChunkView;
