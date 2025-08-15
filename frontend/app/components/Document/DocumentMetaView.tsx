'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { fetchSelectedDocument } from '@/app/api';
import type { Credentials, VerbaDocument } from '@/app/types';

type DocumentMetaViewProps = {
  selectedDocument: string;
  credentials: Credentials;
};

const DocumentMetaView: React.FC<DocumentMetaViewProps> = ({
  selectedDocument,
  credentials,
}) => {
  const [isFetching, setIsFetching] = useState(true);
  const [document, setDocument] = useState<VerbaDocument | null>(null);

  const handleFetchDocument = useCallback(async () => {
    try {
      setIsFetching(true);

      const data = await fetchSelectedDocument(selectedDocument, credentials);

      if (data) {
        if (data.error !== '') {
          setDocument(null);
          setIsFetching(false);
        } else {
          setDocument(data.document);
          setIsFetching(false);
        }
      }
    } catch (_error) {
      setIsFetching(false);
    }
  }, [selectedDocument, credentials]);

  useEffect(() => {
    handleFetchDocument();
  }, [handleFetchDocument]);

  return (
    <div className="flex h-full flex-col">
      {isFetching ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      ) : (
        document && (
          <div className="flex h-full flex-col overflow-hidden rounded-lg bg-bg-alt-verba">
            <div className="flex flex-col items-start justify-start gap-2 p-4">
              <p className="flex text-start font-bold text-text-alt-verba text-xs">
                Title
              </p>
              <p
                className="max-w-full truncate text-text-verba"
                title={document.title}
              >
                {document.title}
              </p>
            </div>
            <div className="flex flex-col items-start justify-start gap-2 p-4">
              <p className="flex text-start font-bold text-text-alt-verba text-xs">
                Metadata
              </p>
              <p className="max-w-full text-text-verba">{document.metadata}</p>
            </div>
            <div className="flex flex-col items-start justify-start gap-2 p-4">
              <p className="flex text-start font-bold text-text-alt-verba text-xs">
                Extension
              </p>
              <p className="max-w-full text-text-verba">{document.extension}</p>
            </div>
            <div className="flex flex-col items-start justify-start gap-2 p-4">
              <p className="flex text-start font-bold text-text-alt-verba text-xs">
                File Size
              </p>
              <p className="max-w-full text-text-verba">{document.fileSize}</p>
            </div>
            <div className="flex flex-col items-start justify-start gap-2 p-4">
              <p className="flex text-start font-bold text-text-alt-verba text-xs">
                Source
              </p>
              <button
                className="max-w-full truncate text-text-verba"
                onClick={() => window.open(document.source, '_blank')}
                title={document.source}
              >
                {document.source}
              </button>
            </div>
            <div className="flex flex-col items-start justify-start gap-2 p-4">
              <p className="flex text-start font-bold text-text-alt-verba text-xs">
                Labels
              </p>
              <p className="max-w-full text-text-verba">{document.labels}</p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default DocumentMetaView;
