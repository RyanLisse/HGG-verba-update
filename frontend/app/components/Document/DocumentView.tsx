'use client';

import type React from 'react';
import { useState } from 'react';
import type { Credentials, DocumentFilter, Theme } from '@/app/types';
import DocumentExplorer from './DocumentExplorer';
import DocumentSearch from './DocumentSearch';

type DocumentViewProps = {
  selectedTheme: Theme;
  production: 'Local' | 'Demo' | 'Production';
  credentials: Credentials;
  documentFilter: DocumentFilter[];
  setDocumentFilter: React.Dispatch<React.SetStateAction<DocumentFilter[]>>;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const DocumentView: React.FC<DocumentViewProps> = ({
  selectedTheme,
  production,
  credentials,
  documentFilter,
  setDocumentFilter,
  addStatusMessage,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  return (
    <div className="flex h-[80vh] justify-center gap-3">
      <div
        className={`${selectedDocument ? 'hidden md:flex md:w-[45vw]' : 'w-full md:flex md:w-[45vw]'}`}
      >
        <DocumentSearch
          addStatusMessage={addStatusMessage}
          credentials={credentials}
          production={production}
          selectedDocument={selectedDocument}
          setSelectedDocument={setSelectedDocument}
        />
      </div>

      <div
        className={`${selectedDocument ? 'flex w-full md:w-[55vw]' : 'hidden md:flex md:w-[55vw]'}`}
      >
        <DocumentExplorer
          addStatusMessage={addStatusMessage}
          credentials={credentials}
          documentFilter={documentFilter}
          production={production}
          selectedDocument={selectedDocument}
          selectedTheme={selectedTheme}
          setDocumentFilter={setDocumentFilter}
          setSelectedDocument={setSelectedDocument}
        />
      </div>
    </div>
  );
};

export default DocumentView;
