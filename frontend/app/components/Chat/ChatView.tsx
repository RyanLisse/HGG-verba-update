'use client';

import type React from 'react';
import { useState } from 'react';
import type {
  ChunkScore,
  Credentials,
  DocumentFilter,
  RAGConfig,
  Theme,
} from '@/app/types';

import DocumentExplorer from '../Document/DocumentExplorer';
import ChatInterface from './ChatInterface';

type ChatViewProps = {
  selectedTheme: Theme;
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
  production: 'Local' | 'Demo' | 'Production';
  currentPage: string;
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  documentFilter: DocumentFilter[];
  setDocumentFilter: React.Dispatch<React.SetStateAction<DocumentFilter[]>>;
};

const ChatView: React.FC<ChatViewProps> = ({
  credentials,
  selectedTheme,
  addStatusMessage,
  production,
  currentPage,
  RAGConfig,
  setRAGConfig,
  documentFilter,
  setDocumentFilter,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedChunkScore, setSelectedChunkScore] = useState<ChunkScore[]>(
    []
  );
  return (
    <div className="verba-content-wrapper">
      {/* Document Sidebar */}
      <div className="verba-sidebar">
        <DocumentExplorer
          addStatusMessage={addStatusMessage}
          chunkScores={selectedChunkScore}
          credentials={credentials}
          documentFilter={documentFilter}
          production={production}
          selectedDocument={selectedDocument}
          selectedTheme={selectedTheme}
          setDocumentFilter={setDocumentFilter}
          setSelectedDocument={setSelectedDocument}
        />
      </div>

      {/* Main Chat Interface */}
      <div className="verba-main-content">
        <ChatInterface
          addStatusMessage={addStatusMessage}
          credentials={credentials}
          currentPage={currentPage}
          documentFilter={documentFilter}
          production={production}
          RAGConfig={RAGConfig}
          selectedTheme={selectedTheme}
          setDocumentFilter={setDocumentFilter}
          setRAGConfig={setRAGConfig}
          setSelectedChunkScore={setSelectedChunkScore}
          setSelectedDocument={setSelectedDocument}
        />
      </div>
    </div>
  );
};

export default ChatView;
