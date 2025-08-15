'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BiError } from 'react-icons/bi';
import { FaHammer } from 'react-icons/fa';
import { IoIosSend, IoMdAddCircle } from 'react-icons/io';
import { IoChatbubbleSharp } from 'react-icons/io5';
import { MdCancel, MdOutlineRefresh } from 'react-icons/md';
import { TbPlugConnected } from 'react-icons/tb';
import {
  fetchDatacount,
  fetchLabels,
  fetchRAGConfig,
  fetchSuggestions,
  sendUserQuery,
  updateRAGConfig,
} from '@/app/api';
import { logTrace } from '@/app/lib/langsmith';
import type {
  ChunkScore,
  Credentials,
  DataCountPayload,
  DocumentFilter,
  LabelsResponse,
  Message,
  QueryPayload,
  RAGConfig,
  Suggestion,
  Theme,
} from '@/app/types';
import { getWebSocketApiHost } from '@/app/util';
import { Action, Actions } from '@/components/ai-elements/actions';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import Reasoning from '@/components/ai-elements/reasoning';
import InfoComponent from '../Navigation/InfoComponent';
import VerbaButton from '../Navigation/VerbaButton';
import ChatConfig from './ChatConfig';
import ChatMessage from './ChatMessage';

type ChatInterfaceProps = {
  credentials: Credentials;
  setSelectedDocument: (s: string | null) => void;
  setSelectedChunkScore: (c: ChunkScore[]) => void;
  currentPage: string;
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  selectedTheme: Theme;
  production: 'Local' | 'Demo' | 'Production';
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
  documentFilter: DocumentFilter[];
  setDocumentFilter: React.Dispatch<React.SetStateAction<DocumentFilter[]>>;
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  production,
  credentials,
  setSelectedDocument,
  setSelectedChunkScore,
  currentPage,
  RAGConfig,
  selectedTheme,
  setRAGConfig,
  addStatusMessage,
  documentFilter,
  setDocumentFilter,
}) => {
  const [selectedSetting, setSelectedSetting] = useState('Chat');

  const isFetching = useRef<boolean>(false);
  const [fetchingStatus, setFetchingStatus] = useState<
    'DONE' | 'CHUNKS' | 'RESPONSE'
  >('DONE');

  const [previewText, setPreviewText] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketOnline, setSocketOnline] = useState(false);
  const [_reconnect, setReconnect] = useState(false);

  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>(
    []
  );

  const [labels, setLabels] = useState<string[]>([]);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);

  const [selectedDocumentScore, setSelectedDocumentScore] = useState<
    string | null
  >(null);

  const [currentDatacount, setCurrentDatacount] = useState(0);

  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isComposing, setIsComposing] = useState(false);

  const currentEmbedding = String(
    RAGConfig?.Embedder?.components?.[RAGConfig.Embedder?.selected ?? '']
      ?.config?.Model?.value ?? 'No Config found'
  );

  const retrieveDatacount = useCallback(async () => {
    try {
      const data: DataCountPayload | null = await fetchDatacount(
        currentEmbedding,
        documentFilter,
        credentials
      );
      const labels: LabelsResponse | null = await fetchLabels(credentials);
      if (data) {
        setCurrentDatacount(data.datacount);
      }
      if (labels) {
        setLabels(labels.labels);
      }
    } catch (error) {
      addStatusMessage(`Failed to fetch datacount: ${error}`, 'ERROR');
    }
  }, [currentEmbedding, documentFilter, credentials, addStatusMessage]);

  useEffect(() => {
    setReconnect(true);
  }, []);

  useEffect(() => {
    if (RAGConfig) {
      retrieveDatacount();
    } else {
      setCurrentDatacount(0);
    }
  }, [RAGConfig, retrieveDatacount]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            type: 'system',
            content: selectedTheme.intro_message?.text || 'Welcome to Verba!',
          },
        ];
      }
      return prev;
    });
  }, [selectedTheme.intro_message?.text]);

  // Setup WebSocket and messages to /ws/generate_stream
  useEffect(() => {
    const socketHost = getWebSocketApiHost();
    const localSocket = new WebSocket(socketHost);

    localSocket.onopen = () => {
      setSocketOnline(true);
    };

    localSocket.onmessage = (event) => {
      let data: {
        message?: string;
        reasoning?: string;
        finish_reason?: string;
        full_text?: string;
        cached?: boolean;
        distance?: number;
      };

      if (!isFetching.current) {
        setPreviewText('');
        return;
      }

      try {
        data = JSON.parse(event.data);
      } catch {
        return; // Exit early if data isn't valid JSON
      }

      const newMessageContent = data.message || '';
      if (data.reasoning) {
        setReasoningText((prev) => prev + data.reasoning);
      }
      setPreviewText((prev) => prev + newMessageContent);

      if (data.finish_reason === 'stop') {
        isFetching.current = false;
        setFetchingStatus('DONE');
        addStatusMessage('Finished generation', 'SUCCESS');
        const full_text = data.full_text || '';
        if (data.cached && data.distance !== undefined) {
          const distance = String(data.distance);
          setMessages((prev) => [
            ...prev,
            {
              type: 'system',
              content: full_text,
              cached: true,
              distance,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { type: 'system', content: full_text },
          ]);
        }
        setPreviewText('');
      }
    };

    localSocket.onerror = (_error) => {
      setSocketOnline(false);
      isFetching.current = false;
      setFetchingStatus('DONE');
      setReconnect((prev) => !prev);
    };

    localSocket.onclose = (event) => {
      if (event.wasClean) {
      } else {
      }
      setSocketOnline(false);
      isFetching.current = false;
      setFetchingStatus('DONE');
      setReconnect((prev) => !prev);
    };

    setSocket(localSocket);

    return () => {
      if (localSocket.readyState !== WebSocket.CLOSED) {
        localSocket.close();
      }
    };
  }, [addStatusMessage]);

  useEffect(() => {
    if (RAGConfig) {
      retrieveDatacount();
    } else {
      setCurrentDatacount(0);
    }
  }, [RAGConfig, retrieveDatacount]);

  const retrieveRAGConfig = async () => {
    const config = await fetchRAGConfig(credentials);
    if (config) {
      setRAGConfig(config.rag_config);
    } else {
      addStatusMessage('Failed to fetch RAG Config', 'ERROR');
    }
  };

  const sendUserMessage = async () => {
    if (isFetching.current || !userInput.trim()) {
      return;
    }

    const sendInput = userInput;
    setUserInput('');
    isFetching.current = true;
    setCurrentSuggestions([]);
    setFetchingStatus('CHUNKS');
    setReasoningText('');
    setMessages((prev) => [...prev, { type: 'user', content: sendInput }]);

    try {
      addStatusMessage('Sending query...', 'INFO');
      // Optional LangSmith trace (frontend-only). No-op if not configured.
      logTrace('user_message', { message: sendInput }).catch(() => {});
      const data = await sendUserQuery(
        sendInput,
        RAGConfig,
        filterLabels,
        documentFilter,
        credentials
      );

      if (!data || data.error) {
        handleErrorResponse(data ? data.error : 'No data received');
      } else {
        handleSuccessResponse(data, sendInput);
        // Log retrieval metadata if LangSmith is enabled
        logTrace('retrieval', { query: sendInput }, { meta: data }).catch(
          () => {}
        );
      }
    } catch (_error) {
      handleErrorResponse('Failed to fetch from API');
    }
  };

  const handleErrorResponse = (errorMessage: string) => {
    addStatusMessage('Query failed', 'ERROR');
    setMessages((prev) => [...prev, { type: 'error', content: errorMessage }]);
    isFetching.current = false;
    setFetchingStatus('DONE');
  };

  const handleSuccessResponse = (data: QueryPayload, sendInput: string) => {
    setMessages((prev) => [
      ...prev,
      { type: 'retrieval', content: data.documents, context: data.context },
    ]);

    addStatusMessage(
      `Received ${Object.entries(data.documents).length} documents`,
      'SUCCESS'
    );

    if (data.documents.length > 0) {
      const firstDoc = data.documents[0];
      if (firstDoc) {
        setSelectedDocument(firstDoc.uuid);
        setSelectedDocumentScore(
          `${firstDoc.uuid}${firstDoc.score}${firstDoc.chunks.length}`
        );
        setSelectedChunkScore(firstDoc.chunks);

        if (data.context) {
          streamResponses(sendInput, data.context);
          setFetchingStatus('RESPONSE');
        }
      } else {
        handleErrorResponse('Document array is unexpectedly empty');
      }
    } else {
      handleErrorResponse("We couldn't find any chunks to your query");
    }
  };

  const streamResponses = (query?: string, context?: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      const filteredMessages = messages
        .slice(1) // Skip the first message
        .filter((msg) => msg.type === 'user' || msg.type === 'system')
        .map((msg) => ({
          type: msg.type,
          content: msg.content,
        }));

      const data = JSON.stringify({
        query,
        context,
        conversation: filteredMessages,
        rag_config: RAGConfig,
      });
      socket.send(data);
    } else {
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault(); // Prevent new line
      sendUserMessage(); // Submit form
    }
  };

  const reconnectToVerba = () => {
    setReconnect((prevState) => !prevState);
  };

  const onSaveConfig = async () => {
    addStatusMessage('Saved Config', 'SUCCESS');
    await updateRAGConfig(RAGConfig, credentials);
  };

  const onResetConfig = async () => {
    addStatusMessage('Reset Config', 'WARNING');
    retrieveRAGConfig();
  };

  const handleSuggestions = async () => {
    if (
      RAGConfig?.Retriever?.components?.[RAGConfig.Retriever.selected]?.config
        ?.Suggestion?.value
    ) {
      const suggestions = await fetchSuggestions(userInput, 3, credentials);
      if (suggestions) {
        setCurrentSuggestions(suggestions.suggestions);
      }
    }
  };

  return (
    <div className="verba-chat-interface">
      {/* Header */}
      <div className="flex h-min w-full items-center justify-between gap-2 rounded-2xl bg-bg-alt-verba p-3">
        <div className="hidden items-center justify-start gap-2 md:flex">
          <InfoComponent
            display_text={'Chat'}
            tooltip_text="Use the Chat interface to interact with your data and perform Retrieval Augmented Generation (RAG). This interface allows you to ask questions, analyze sources, and generate responses based on your stored documents."
          />
        </div>
        <div className="flex w-full items-center justify-end gap-3 md:w-fit">
          <VerbaButton
            disabled={false}
            Icon={IoChatbubbleSharp}
            onClick={() => {
              setSelectedSetting('Chat');
            }}
            selected={selectedSetting === 'Chat'}
            selected_color="bg-secondary-verba"
            title="Chat"
          />
          {production !== 'Demo' && (
            <VerbaButton
              disabled={false}
              Icon={FaHammer}
              onClick={() => {
                setSelectedSetting('Config');
              }}
              selected={selectedSetting === 'Config'}
              selected_color="bg-secondary-verba"
              title="Config"
            />
          )}
        </div>
      </div>

      <div className="relative flex h-[50vh] w-full flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-bg-alt-verba md:h-full">
        {/* New fixed tab */}
        {selectedSetting === 'Chat' && (
          <div className="sticky top-0 z-9 flex flex-col gap-2 rounded-lg bg-bg-alt-verba bg-opacity-30 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-start gap-2">
              <div className="flex gap-2">
                {/* Simplified label button - full dropdown implementation would need shadcn/ui Select */}
                <VerbaButton
                  disabled={false}
                  Icon={IoMdAddCircle}
                  icon_size={12}
                  selected={false}
                  title="Labels"
                />
              </div>
              {(filterLabels.length > 0 || documentFilter.length > 0) && (
                <VerbaButton
                  disabled={false}
                  Icon={MdCancel}
                  icon_size={12}
                  onClick={() => {
                    setFilterLabels([]);
                    setDocumentFilter([]);
                  }}
                  selected={false}
                  title="Clear"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filterLabels.map((label, index) => (
                <VerbaButton
                  className="min-w-min max-w-[200px]"
                  Icon={MdCancel}
                  icon_size={12}
                  key={`FilterLabel${index}`}
                  onClick={() => {
                    setFilterLabels(filterLabels.filter((l) => l !== label));
                  }}
                  selected={true}
                  selected_color="bg-primary-verba"
                  title={label}
                />
              ))}
              {documentFilter.map((filter, index) => (
                <VerbaButton
                  className="min-w-min max-w-[200px]"
                  Icon={MdCancel}
                  icon_size={12}
                  key={`DocumentFilter${index}`}
                  onClick={() => {
                    setDocumentFilter(
                      documentFilter.filter((f) => f.uuid !== filter.uuid)
                    );
                  }}
                  selected={true}
                  selected_color="bg-secondary-verba"
                  title={filter.title}
                />
              ))}
            </div>
          </div>
        )}
        <div className={`${selectedSetting === 'Chat' ? '' : 'hidden'}`}>
          <Conversation className="flex flex-col gap-3 p-4">
            <ConversationContent>
              <div className="flex w-full items-center justify-start gap-2 text-text-alt-verba">
                {currentDatacount === 0 && <BiError size={15} />}
                {currentDatacount === 0 && (
                  <p className="flex items-center text-sm text-text-alt-verba">{`${currentDatacount} documents embedded by ${currentEmbedding}`}</p>
                )}
              </div>
              <div className="py-1">
                <Reasoning text={reasoningText} />
              </div>
              {messages.map((message, index) => (
                <div
                  className={`${message.type === 'user' ? 'text-right' : ''}`}
                  key={`Message_${index}`}
                >
                  <ChatMessage
                    message={message}
                    message_index={index}
                    selectedDocument={selectedDocumentScore}
                    selectedTheme={selectedTheme}
                    setSelectedChunkScore={setSelectedChunkScore}
                    setSelectedDocument={setSelectedDocument}
                    setSelectedDocumentScore={setSelectedDocumentScore}
                  />
                </div>
              ))}
              {previewText && (
                <ChatMessage
                  message={{
                    type: 'system',
                    content: previewText,
                    cached: false,
                  }}
                  message_index={-1}
                  selectedDocument={selectedDocumentScore}
                  selectedTheme={selectedTheme}
                  setSelectedChunkScore={setSelectedChunkScore}
                  setSelectedDocument={setSelectedDocument}
                  setSelectedDocumentScore={setSelectedDocumentScore}
                />
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="px-4 pb-2">
            <Actions>
              <Action
                label="Copy"
                onClick={() => {
                  const last = [...messages]
                    .reverse()
                    .find((m) => m.type !== 'user');
                  if (last && typeof last.content === 'string') {
                    navigator.clipboard.writeText(last.content);
                  }
                }}
                tooltip="Copy last response"
              >
                ⧉
              </Action>
              <Action
                label="Clear"
                onClick={() => setMessages(messages.slice(0, 1))}
                tooltip="Clear conversation"
              >
                ✕
              </Action>
            </Actions>
          </div>
          {isFetching.current && (
            <div className="flex flex-col gap-2 px-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
                <p className="text-text-alt-verba">
                  {fetchingStatus === 'CHUNKS' && 'Retrieving...'}
                  {fetchingStatus === 'RESPONSE' && 'Generating...'}
                </p>
                <button
                  className="rounded-full p-2 bg-bg-alt-verba text-sm text-text-alt-verba hover:bg-warning-verba hover:text-text-verba transition-colors"
                  onClick={() => {
                    setFetchingStatus('DONE');
                    isFetching.current = false;
                  }}
                >
                  <MdCancel size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
        {selectedSetting === 'Config' && (
          <ChatConfig
            addStatusMessage={addStatusMessage}
            credentials={credentials}
            onReset={onResetConfig}
            onSave={onSaveConfig}
            production={production}
            RAGConfig={RAGConfig}
            setRAGConfig={setRAGConfig}
          />
        )}
      </div>

      <div className="verba-input-container">
        {socketOnline ? (
          <div className="relative flex w-full items-center justify-end gap-2">
            <div className="relative w-full">
              <textarea
                className="verba-input"
                onChange={(e) => {
                  const newValue = e.target.value;
                  setUserInput(newValue);
                  if ((newValue.length - 1) % 3 === 0) {
                    handleSuggestions();
                  }
                }}
                onCompositionEnd={handleCompositionEnd}
                onCompositionStart={handleCompositionStart}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentDatacount > 0
                    ? currentDatacount >= 100
                      ? 'Chatting with more than 100 documents...'
                      : `Chatting with ${currentDatacount} documents...`
                    : 'No documents detected...'
                }
                value={userInput}
              />
              {currentSuggestions.length > 0 && (
                <ul className="absolute top-full left-0 z-10 mt-2 flex max-h-40 w-full justify-between gap-2 overflow-y-auto">
                  {currentSuggestions.map((suggestion, index) => (
                    <li
                      className="w-full cursor-pointer rounded-xl bg-button-verba p-3 text-text-alt-verba hover:bg-secondary-verba hover:text-text-verba"
                      key={index}
                      onClick={() => {
                        setUserInput(suggestion.query);
                        setCurrentSuggestions([]);
                      }}
                    >
                      <p className="text-xs lg:text-sm">
                        {suggestion.query.length > 50
                          ? `${suggestion.query.substring(0, 50)}...`
                          : suggestion.query
                              .split(new RegExp(`(${userInput})`, 'gi'))
                              .map((part, i) =>
                                part.toLowerCase() ===
                                userInput.toLowerCase() ? (
                                  <strong key={i}>{part}</strong>
                                ) : (
                                  part
                                )
                              )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <button
                className="verba-send-button"
                disabled={false}
                onClick={() => {
                  sendUserMessage();
                }}
                type="button"
              >
                <IoIosSend size={16} />
              </button>
              <VerbaButton
                disabled={false}
                Icon={MdOutlineRefresh}
                onClick={() => {
                  setSelectedDocument(null);
                  setSelectedChunkScore([]);
                  setUserInput('');
                  setSelectedDocumentScore(null);
                  setCurrentSuggestions([]);
                  setMessages([
                    {
                      type: 'system',
                      content:
                        selectedTheme.intro_message?.text ||
                        'Welcome to Verba!',
                    },
                  ]);
                }}
                selected_color="bg-primary-verba"
                type="button"
              />
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-button-verba text-text-verba hover:bg-button-hover-verba transition-colors"
              onClick={reconnectToVerba}
            >
              <TbPlugConnected size={15} />
              <p>Reconnecting...</p>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
