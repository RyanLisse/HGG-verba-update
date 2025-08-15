'use client';

import type React from 'react';
import { BiError } from 'react-icons/bi';
import { FaDatabase } from 'react-icons/fa';
import { IoDocumentAttach, IoNewspaper } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import type { ChunkScore, Message } from '@/app/types';

type CodeProps = {
  node?: unknown;
  inline?: boolean;
  className?: string | undefined;
  children?: React.ReactNode;
  [key: string]: unknown;
};

import { logFeedback } from '@/app/lib/langsmith';
import type { Theme } from '@/app/types';
import { Action, Actions } from '@/components/ai-elements/actions';
import VerbaButton from '../Navigation/VerbaButton';

type ChatMessageProps = {
  message: Message;
  message_index: number;
  selectedTheme: Theme;
  selectedDocument: string | null;
  setSelectedDocument: (s: string | null) => void;
  setSelectedDocumentScore: (s: string | null) => void;
  setSelectedChunkScore: (s: ChunkScore[]) => void;
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  selectedTheme,
  selectedDocument,
  setSelectedDocument,
  message_index,
  setSelectedDocumentScore,
  setSelectedChunkScore,
}) => {
  const colorTable = {
    user: 'bg-bg-verba',
    system: 'bg-bg-alt-verba',
    error: 'bg-warning-verba',
    retrieval: 'bg-bg-verba',
  };

  if (typeof message.content === 'string') {
    return (
      <div
        className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`flex animate-press-in flex-col items-start rounded-3xl p-5 text-sm lg:text-base ${colorTable[message.type]}`}
        >
          {message.cached && (
            <FaDatabase className="text-text-verba" size={12} />
          )}
          {message.type === 'system' && (
            <div className="prose md:prose-sm lg:prose-base prose-pre:bg-bg-alt-verba p-3">
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
                          selectedTheme.theme === 'dark' ? oneDark : oneLight
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
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          {message.type === 'system' && (
            <div className="pt-2">
              <Actions>
                <Action
                  label="Good"
                  onClick={() =>
                    logFeedback('message', 'up', { index: message_index })
                  }
                  tooltip="Thumbs up"
                >
                  👍
                </Action>
                <Action
                  label="Bad"
                  onClick={() =>
                    logFeedback('message', 'down', { index: message_index })
                  }
                  tooltip="Thumbs down"
                >
                  👎
                </Action>
              </Actions>
            </div>
          )}
          {message.type === 'user' && (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          {message.type === 'error' && (
            <div className="flex items-center gap-2 whitespace-pre-wrap text-sm text-text-verba">
              <BiError size={15} />
              <p>{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="grid w-full grid-cols-2 items-center gap-3 lg:grid-cols-3">
      {message.content.map((document, index) => (
        <button
          className={`flex ${selectedDocument && selectedDocument === document.uuid + document.score + document.chunks.length ? 'bg-secondary-verba hover:bg-button-hover-verba' : 'bg-button-verba hover:bg-secondary-verba'} items-center justify-between rounded-3xl border-none p-3 transition-colors duration-300 ease-in-out`}
          key={`Retrieval${document.title}${index}`}
          onClick={() => {
            setSelectedDocument(document.uuid);
            setSelectedDocumentScore(
              document.uuid + document.score + document.chunks.length
            );
            setSelectedChunkScore(document.chunks);
          }}
        >
          <div className="flex w-full items-center justify-between">
            <p className="mr-2 grow truncate text-xs" title={document.title}>
              {document.title}
            </p>
            <div className="flex shrink-0 items-center gap-1 text-text-verba">
              <IoNewspaper size={12} />
              <p className="text-sm">{document.chunks.length}</p>
            </div>
          </div>
        </button>
      ))}
      <VerbaButton
        className="p-2 rounded-md"
        Icon={IoDocumentAttach}
        onClick={() =>
          (
            document.getElementById(
              `context-modal-${message_index}`
            ) as HTMLDialogElement
          ).showModal()
        }
      />
      <dialog
        className="rounded-md backdrop:bg-black/40"
        id={`context-modal-${message_index}`}
      >
        <div className="rounded-md bg-background p-4 text-foreground shadow-md">
          <h3 className="font-bold text-lg">Context</h3>
          <p className="py-4">{message.context}</p>
          <div className="mt-4 flex justify-end">
            <form method="dialog">
              <button className="inline-flex items-center justify-center rounded-md bg-button-verba px-3 py-1.5 text-text-alt-verba hover:bg-button-hover-verba">
                <p>Close</p>
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default ChatMessage;
