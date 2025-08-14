"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { MdCancel, MdOutlineRefresh } from "react-icons/md";
import { TbPlugConnected } from "react-icons/tb";
import { IoChatbubbleSharp } from "react-icons/io5";
import { FaHammer } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import { BiError } from "react-icons/bi";
import { IoMdAddCircle } from "react-icons/io";
import VerbaButton from "../Navigation/VerbaButton";

import { getWebSocketApiHost } from "@/app/util";
import {
  Credentials,
  QueryPayload,
  Suggestion,
  DataCountPayload,
  ChunkScore,
  Message,
  LabelsResponse,
  RAGConfig,
  Theme,
  DocumentFilter,
} from "@/app/types";

// Import TanStack Query hooks
import {
  useDatacount,
  useLabels,
  useSuggestions,
  useSendQuery,
  useUpdateRAGConfig,
} from "@/app/hooks/api-hooks";

import InfoComponent from "../Navigation/InfoComponent";
import ChatConfig from "./ChatConfig";
import ChatMessage from "./ChatMessage";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Actions, Action } from "@/components/ai-elements/actions";
import { logTrace } from "@/app/lib/langsmith";
import Reasoning from "@/components/ai-elements/reasoning";

interface ChatInterfaceProps {
  credentials: Credentials;
  setSelectedDocument: (s: string | null) => void;
  setSelectedChunkScore: (c: ChunkScore[]) => void;
  currentPage: string;
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  selectedTheme: Theme;
  production: "Local" | "Demo" | "Production";
  addStatusMessage: (
    message: string,
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;
  documentFilter: DocumentFilter[];
  setDocumentFilter: React.Dispatch<React.SetStateAction<DocumentFilter[]>>;
}

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
  const [selectedSetting, setSelectedSetting] = useState("Chat");

  const isFetching = useRef<boolean>(false);
  const [fetchingStatus, setFetchingStatus] = useState<
    "DONE" | "CHUNKS" | "RESPONSE"
  >("DONE");

  const [previewText, setPreviewText] = useState("");
  const [reasoningText, setReasoningText] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketOnline, setSocketOnline] = useState(false);

  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>(
    []
  );

  const [filterLabels, setFilterLabels] = useState<string[]>([]);

  const [selectedDocumentScore, setSelectedDocumentScore] = useState<
    string | null
  >(null);

  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isComposing, setIsComposing] = useState(false);

  // Get current embedding model from config
  const currentEmbedding = useMemo(() => {
    if (!RAGConfig) return "No Config found";
    return RAGConfig["Embedder"].components[RAGConfig["Embedder"].selected]
      .config["Model"].value as string;
  }, [RAGConfig]);

  // Use TanStack Query hooks
  const { data: datacountData } = useDatacount(
    currentEmbedding,
    documentFilter,
    credentials
  );

  const { data: labelsData } = useLabels(credentials);

  const { data: suggestionsData } = useSuggestions(
    userInput,
    5,
    credentials
  );

  const sendQueryMutation = useSendQuery();
  const updateConfigMutation = useUpdateRAGConfig();

  // Update labels when data changes
  const labels = useMemo(() => {
    return labelsData?.labels || [];
  }, [labelsData]);

  // Update datacount when data changes
  const currentDatacount = useMemo(() => {
    return datacountData?.datacount || 0;
  }, [datacountData]);

  // Initialize with theme message
  const initializeMessages = useCallback(() => {
    setMessages([
      {
        type: "system",
        content: selectedTheme.intro_message.text,
      },
    ]);
  }, [selectedTheme.intro_message.text]);

  // Initialize messages on mount
  React.useEffect(() => {
    initializeMessages();
  }, [initializeMessages]);

  // Setup WebSocket connection
  React.useEffect(() => {
    const socketHost = getWebSocketApiHost();
    const localSocket = new WebSocket(socketHost);

    localSocket.onopen = () => {
      console.log("WebSocket connection opened to " + socketHost);
      setSocketOnline(true);
    };

    localSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "error") {
        console.error("Received error:", data.data);
        setFetchingStatus("DONE");
        setSocketOnline(false);
        isFetching.current = false;
      } else if (data.error === "") {
        if (data.finish_reason == "stop") {
          isFetching.current = false;
          setReasoningText("");
          setFetchingStatus("DONE");
          setPreviewText("");
        } else if (data.modelUsed === "RETRIEVE_CHUNKS") {
          setFetchingStatus("CHUNKS");
        } else if (data.delta) {
          if (data.delta.reasoning) {
            setReasoningText((prev) => prev + data.delta.reasoning);
          } else {
            setFetchingStatus("RESPONSE");
            setPreviewText((prev) => prev + data.delta);
          }
        }
      } else {
        setSocketOnline(false);
        setFetchingStatus("DONE");
        isFetching.current = false;
        addStatusMessage(
          "Something went wrong: " + JSON.stringify(data.error),
          "ERROR"
        );
      }
    };

    localSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setSocketOnline(false);
      setFetchingStatus("DONE");
      isFetching.current = false;
    };

    localSocket.onclose = () => {
      console.log("WebSocket connection closed");
      setSocketOnline(false);
      setFetchingStatus("DONE");
      isFetching.current = false;
    };

    setSocket(localSocket);

    return () => {
      localSocket.close();
    };
  }, [addStatusMessage]);

  const handleSendQuery = useCallback(async () => {
    if (!userInput.trim() || !RAGConfig || isFetching.current) return;

    isFetching.current = true;
    setPreviewText("");
    setFetchingStatus("CHUNKS");
    setReasoningText("");

    // Add user message
    const userMessage: Message = {
      type: "user",
      content: userInput,
    };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");

    // Send query using mutation
    const result = await sendQueryMutation.mutateAsync({
      query: userInput,
      RAG: RAGConfig,
      labels: filterLabels,
      documentFilter,
      credentials,
    });

    if (result) {
      // Handle the query result
      if (result.error === "") {
        // Add retrieval message if there are context chunks
        if (result.context && result.context.length > 0) {
          const retrievalMessage: Message = {
            type: "retrieval",
            content: result.context,
          };
          setMessages((prev) => [...prev, retrievalMessage]);
          setSelectedChunkScore(result.context);
          setSelectedDocumentScore(result.context[0].doc_uuid);
        }
        
        // Add system message with the response
        const systemMessage: Message = {
          type: "system",
          content: result.system_msg,
          cached: result.cached,
        };
        setMessages((prev) => [...prev, systemMessage]);
      } else {
        addStatusMessage("Query failed: " + result.error, "ERROR");
      }
    }

    isFetching.current = false;
    setFetchingStatus("DONE");
  }, [
    userInput,
    RAGConfig,
    filterLabels,
    documentFilter,
    credentials,
    sendQueryMutation,
    setSelectedChunkScore,
    addStatusMessage,
  ]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setUserInput(suggestion);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSendQuery();
      }
    },
    [handleSendQuery, isComposing]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    initializeMessages();
    setSelectedChunkScore([]);
    setSelectedDocumentScore(null);
    addStatusMessage("Chat cleared", "INFO");
  }, [initializeMessages, setSelectedChunkScore, addStatusMessage]);

  return (
    <div className="flex flex-col lg:flex-row gap-3 p-4">
      <div className="flex-1 bg-bg-alt-verba rounded-2xl flex flex-col gap-2 p-6 items-center justify-between h-[80vh] min-h-[80vh]">
        <div className="flex gap-2 justify-center w-full items-center">
          {production !== "Demo" && (
            <VerbaButton
              title="Chat"
              Icon={IoChatbubbleSharp}
              onClick={() => setSelectedSetting("Chat")}
              selected={selectedSetting === "Chat"}
              className="min-w-min"
            />
          )}
          {production !== "Demo" && (
            <VerbaButton
              title="Config"
              Icon={FaHammer}
              onClick={() => setSelectedSetting("Config")}
              selected={selectedSetting === "Config"}
              className="min-w-min"
            />
          )}
          <VerbaButton
            title={currentDatacount.toString()}
            Icon={TbPlugConnected}
            className="min-w-min"
            disabled={true}
            selected={currentDatacount > 0}
            selected_color="bg-secondary-verba"
          />
          {production === "Demo" && (
            <InfoComponent
              tooltip_text="In the Demo Version, the Chat Config and retrieval are set to predefined settings and cannot be changed"
              display_text=""
            />
          )}
        </div>

        {selectedSetting === "Chat" && (
          <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
            <Conversation className="flex-1 overflow-y-auto">
              <ConversationContent>
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    message={message}
                    setSelectedDocument={setSelectedDocument}
                    currentPage={currentPage}
                  />
                ))}
                {previewText && (
                  <ChatMessage
                    message={{
                      type: "system",
                      content: previewText,
                    }}
                    setSelectedDocument={setSelectedDocument}
                    currentPage={currentPage}
                  />
                )}
                {reasoningText && (
                  <Reasoning title="Thinking" value={reasoningText} />
                )}
              </ConversationContent>
              <ConversationScrollButton className="bg-button-verba" />
            </Conversation>

            <div className="flex gap-2 items-center">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Ask a question..."
                className="flex-1 p-3 rounded-lg bg-bg-verba text-text-verba resize-none"
                rows={2}
              />
              <VerbaButton
                Icon={IoIosSend}
                onClick={handleSendQuery}
                disabled={!userInput.trim() || isFetching.current}
                loading={isFetching.current}
              />
              <VerbaButton
                Icon={MdCancel}
                onClick={clearChat}
                selected_color="bg-warning-verba"
              />
            </div>

            {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
              <Actions>
                {suggestionsData.suggestions.map((suggestion, index) => (
                  <Action
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.query)}
                  >
                    {suggestion.query}
                  </Action>
                ))}
              </Actions>
            )}
          </div>
        )}

        {selectedSetting === "Config" && (
          <ChatConfig
            credentials={credentials}
            RAGConfig={RAGConfig}
            setRAGConfig={setRAGConfig}
            addStatusMessage={addStatusMessage}
            production={production}
          />
        )}
      </div>
    </div>
  );
};

export default ChatInterface;