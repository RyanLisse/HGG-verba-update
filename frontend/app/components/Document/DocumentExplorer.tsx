'use client';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FaExternalLinkAlt, FaInfoCircle } from 'react-icons/fa';
import { IoMdAddCircle } from 'react-icons/io';
import { MdCancel, MdContentCopy, MdContentPaste } from 'react-icons/md';
import { TbVectorTriangle } from 'react-icons/tb';
import { fetchSelectedDocument } from '@/app/api';
import type {
  ChunkScore,
  Credentials,
  DocumentFilter,
  DocumentPayload,
  Theme,
  VerbaDocument,
} from '@/app/types';
import InfoComponent from '../Navigation/InfoComponent';
import VerbaButton from '../Navigation/VerbaButton';
import ChunkView from './ChunkView';
import ContentView from './ContentView';
import DocumentMetaView from './DocumentMetaView';

// Dynamic import for optimized VectorView with lazy loading
const VectorView = dynamic(() => import('./VectorViewDeck'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[45vh] w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  ),
}) as React.ComponentType<{
  credentials: Credentials;
  selectedDocument: string | null;
  chunkScores?: ChunkScore[];
  production: 'Local' | 'Demo' | 'Production';
}>;

type DocumentExplorerProps = {
  selectedDocument: string | null;
  setSelectedDocument: (c: string | null) => void;
  chunkScores?: ChunkScore[];
  credentials: Credentials;
  selectedTheme: Theme;
  production: 'Local' | 'Demo' | 'Production';
  documentFilter: DocumentFilter[];
  setDocumentFilter: React.Dispatch<React.SetStateAction<DocumentFilter[]>>;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const DocumentExplorer: React.FC<DocumentExplorerProps> = ({
  credentials,
  selectedDocument,
  setSelectedDocument,
  chunkScores,
  production,
  selectedTheme,
  documentFilter,
  setDocumentFilter,
  addStatusMessage,
}) => {
  const [selectedSetting, setSelectedSetting] = useState<
    'Content' | 'Chunks' | 'Metadata' | 'Config' | 'Vector Space' | 'Graph'
  >('Content');

  const [, setIsFetching] = useState(false);
  const [document, setDocument] = useState<VerbaDocument | null>(null);

  const handleFetchSelectedDocument = useCallback(async () => {
    try {
      setIsFetching(true);

      const data: DocumentPayload | null = await fetchSelectedDocument(
        selectedDocument,
        credentials
      );

      if (data) {
        if (data.error !== '') {
          setIsFetching(false);
          setDocument(null);
          setSelectedDocument(null);
        } else {
          setDocument(data.document);
          setIsFetching(false);
        }
      }
    } catch (_error) {
      setIsFetching(false);
    }
  }, [selectedDocument, credentials, setSelectedDocument]);

  useEffect(() => {
    if (selectedDocument) {
      handleFetchSelectedDocument();
    } else {
      setDocument(null);
    }
  }, [handleFetchSelectedDocument, selectedDocument]);

  const handleSourceClick = (url: string) => {
    // Open a new tab with the specified URL
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!selectedDocument) {
    return <div />;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Search Header */}
      <div className="flex h-min w-full items-center justify-end gap-2 rounded-2xl bg-bg-alt-verba p-3 lg:justify-between">
        <div className="hidden justify-start gap-2 lg:flex">
          <InfoComponent
            display_text={document ? document.title : 'Loading...'}
            tooltip_text="Inspect your all information about your document, such as chunks, metadata and more."
          />
        </div>
        <div className="flex justify-end gap-3">
          <VerbaButton
            Icon={MdContentPaste}
            onClick={() => setSelectedSetting('Content')}
            selected={selectedSetting === 'Content'}
            selected_color="bg-secondary-verba"
            title="Content"
          />

          <VerbaButton
            Icon={MdContentCopy}
            onClick={() => setSelectedSetting('Chunks')}
            selected={selectedSetting === 'Chunks'}
            selected_color="bg-secondary-verba"
            title="Chunks"
          />

          <VerbaButton
            Icon={TbVectorTriangle}
            onClick={() => setSelectedSetting('Vector Space')}
            selected={selectedSetting === 'Vector Space'}
            selected_color="bg-secondary-verba"
            title="Vector"
          />

          <VerbaButton
            Icon={MdCancel}
            onClick={() => {
              setSelectedDocument(null);
            }}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-bg-alt-verba p-6">
        {selectedSetting === 'Content' && (
          <ContentView
            {...(chunkScores && { chunkScores })}
            credentials={credentials}
            document={document}
            selectedDocument={selectedDocument}
            selectedTheme={selectedTheme}
          />
        )}

        {selectedSetting === 'Chunks' && (
          <ChunkView
            credentials={credentials}
            selectedDocument={selectedDocument}
            selectedTheme={selectedTheme}
          />
        )}

        {selectedSetting === 'Vector Space' && (
          <VectorView
            {...(chunkScores && { chunkScores })}
            credentials={credentials}
            production={production}
            selectedDocument={selectedDocument}
          />
        )}

        {selectedSetting === 'Metadata' && (
          <DocumentMetaView
            credentials={credentials}
            selectedDocument={selectedDocument}
          />
        )}
      </div>

      {/* Import Footer */}
      <div className="flex h-min w-full items-center justify-between gap-2 rounded-2xl bg-bg-alt-verba p-3">
        <div className="flex gap-3">
          {documentFilter.some(
            (filter) => filter.uuid === selectedDocument
          ) && (
            <VerbaButton
              Icon={MdCancel}
              onClick={() => {
                setDocumentFilter(
                  documentFilter.filter((f) => f.uuid !== selectedDocument)
                );
                addStatusMessage('Removed document from Chat', 'INFO');
              }}
              selected={true}
              selected_color="bg-warning-verba"
              title="Delete from Chat"
            />
          )}
          {!documentFilter.some((filter) => filter.uuid === selectedDocument) &&
            document && (
              <VerbaButton
                Icon={IoMdAddCircle}
                onClick={() => {
                  setDocumentFilter([
                    ...documentFilter,
                    { uuid: selectedDocument, title: document.title },
                  ]);
                  addStatusMessage('Added document to Chat', 'SUCCESS');
                }}
                title="Add to Chat"
              />
            )}
        </div>
        <div className="flex gap-3">
          {selectedDocument && document && document.source && (
            <VerbaButton
              Icon={FaExternalLinkAlt}
              onClick={() => {
                handleSourceClick(document.source);
              }}
              title="Go To Source"
            />
          )}
          <VerbaButton
            Icon={FaInfoCircle}
            onClick={() => setSelectedSetting('Metadata')}
            selected={selectedSetting === 'Metadata'}
            selected_color="bg-secondary-verba"
            title="Document Info"
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentExplorer;
