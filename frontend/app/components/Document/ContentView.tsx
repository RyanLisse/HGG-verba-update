'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowAltCircleLeft, FaArrowAltCircleRight } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import { IoNewspaper } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { fetchContent } from '@/app/api';
import type {
  ChunkScore,
  ContentPayload,
  ContentSnippet,
  Credentials,
  Theme,
  VerbaDocument,
} from '@/app/types';

import VerbaButton from '../Navigation/VerbaButton';

type ContentViewProps = {
  document: VerbaDocument | null;
  selectedTheme: Theme;
  selectedDocument: string;
  credentials: Credentials;
  chunkScores?: ChunkScore[];
};

const ContentView: React.FC<ContentViewProps> = ({
  document,
  selectedDocument,
  selectedTheme,
  credentials,
  chunkScores,
}) => {
  const [isFetching, setIsFetching] = useState(true);
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [content, setContent] = useState<ContentSnippet[]>([]);

  const contentRef = useRef<HTMLDivElement>(null);

  const nextPage = () => {
    if (page === maxPage) {
      setPage(1);
    } else {
      setPage((prev) => prev + 1);
    }
  };

  const previousPage = () => {
    if (page === 1) {
      setPage(maxPage);
    } else {
      setPage((prev) => prev - 1);
    }
  };

  const handleFetchContent = useCallback(async () => {
    try {
      setIsFetching(true);

      const data: ContentPayload | null = await fetchContent(
        selectedDocument,
        page,
        chunkScores ? chunkScores : [],
        credentials
      );

      if (data) {
        if (data.error !== '') {
          setContent([
            { content: data.error, chunk_id: 0, score: 0, type: 'text' },
          ]);
          setPage(1);
          setMaxPage(1);
          setIsFetching(false);
        } else {
          setContent(data.content);
          setMaxPage(data.maxPage);
          setIsFetching(false);
        }
      }
    } catch (_error) {
      setIsFetching(false);
    }
  }, [selectedDocument, page, chunkScores, credentials]);

  useEffect(() => {
    if (document) {
      handleFetchContent();
      setPage(1);
    } else {
      setContent([]);
      setPage(1);
      setMaxPage(1);
    }
  }, [document, handleFetchContent]);

  useEffect(() => {
    if (document) {
      handleFetchContent();
    } else {
      setContent([]);
      setPage(1);
      setMaxPage(1);
    }
  }, [document, handleFetchContent]);

  useEffect(() => {
    if (chunkScores && chunkScores.length > 0) {
      contentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chunkScores]);

  const renderText = (contentSnippet: ContentSnippet, index: number) => {
    if (contentSnippet.type === 'text') {
      return (
        <div
          className="flex p-2"
          key={`CONTENT_SNIPPET${index}`}
          ref={chunkScores ? null : contentRef}
        >
          <div className="prose-sm max-w-[50vw] flex-wrap items-center justify-center prose-pre:bg-bg-alt-verba p-3">
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
              {contentSnippet.content}
            </ReactMarkdown>
          </div>
        </div>
      );
    }
    return (
      <div
        className="flex flex-col gap-2 rounded-3xl border-2 border-secondary-verba p-2 shadow-lg"
        ref={contentRef}
      >
        <div className="flex justify-between">
          <div className="flex gap-2">
            <div className="flex w-fit items-center gap-2 rounded-full bg-secondary-verba p-3">
              <HiSparkles size={12} />
              <p className="flex text-text-verba text-xs">Context Used</p>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full bg-secondary-verba p-3">
              <IoNewspaper size={12} />
              <p className="flex text-text-verba text-xs">
                Chunk {contentSnippet.chunk_id + 1}
              </p>
            </div>
            {contentSnippet.score > 0 && (
              <div className="flex w-fit items-center gap-2 rounded-full bg-primary-verba p-3">
                <HiSparkles size={12} />
                <p className="flex text-text-verba text-xs">High Relevancy</p>
              </div>
            )}
          </div>
        </div>
        <div className="md:prose-base sm:prose-sm w-full flex-wrap items-center justify-center prose-pre:bg-bg-alt-verba p-3">
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
            {contentSnippet.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  if (!document) {
    return <div />;
  }

  return (
    <div className="flex h-full flex-col">
      {document && (
        <div className="flex h-full flex-col overflow-hidden rounded-lg bg-bg-alt-verba">
          {/* Header */}
          <div className="bg-bg-alt-verba p-3">
            <div className="flex w-full justify-between gap-4">
              <div className="flex items-center gap-4">
                {isFetching && (
                  <div className="flex items-center justify-center gap-2 text-text-verba">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                  </div>
                )}
                <p
                  className="max-w-[350px] truncate font-bold text-lg"
                  title={document.title}
                >
                  {document.title}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(document.labels).map(([key, label]) => (
                  <VerbaButton
                    className="btn-sm min-w-min max-w-[200px]"
                    key={document.title + key + label}
                    text_class_name="truncate max-w-[200px]"
                    text_size="text-xs"
                    title={label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content div */}
          <div className="grow overflow-hidden p-3">
            <div className="h-full overflow-y-auto">
              {content?.map((contentSnippet, index) =>
                renderText(contentSnippet, index)
              )}
            </div>
          </div>

          {/* Navigation div */}

          <div className="flex items-center justify-center gap-2 bg-bg-alt-verba p-3">
            <VerbaButton
              className="btn-sm min-w-min max-w-[200px]"
              Icon={FaArrowAltCircleLeft}
              onClick={previousPage}
              text_class_name="text-xs"
              title={`Previous ${chunkScores ? 'Chunk' : 'Page'}`}
            />
            <div className="flex items-center">
              <p className="text-text-verba text-xs">
                {chunkScores ? 'Chunk ' : 'Page '} {page}
              </p>
            </div>
            <VerbaButton
              className="btn-sm min-w-min max-w-[200px]"
              Icon={FaArrowAltCircleRight}
              onClick={nextPage}
              text_class_name="text-xs"
              title={`Next ${chunkScores ? 'Chunk' : 'Page'}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentView;
