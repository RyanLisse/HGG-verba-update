'use client';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  FaArrowAltCircleLeft,
  FaArrowAltCircleRight,
  FaSearch,
  FaTrash,
} from 'react-icons/fa';
import { IoMdAddCircle } from 'react-icons/io';
import { MdCancel, MdOutlineRefresh } from 'react-icons/md';
import { deleteDocument, retrieveAllDocuments } from '@/app/api';
import type {
  Credentials,
  DocumentPreview,
  DocumentsPreviewPayload,
} from '@/app/types';
import InfoComponent from '../Navigation/InfoComponent';
import UserModalComponent from '../Navigation/UserModal';
import VerbaButton from '../Navigation/VerbaButton';
import { Input } from '@/app/components/ui/input';

type DocumentSearchComponentProps = {
  selectedDocument: string | null;
  credentials: Credentials;
  setSelectedDocument: (c: string | null) => void;
  production: 'Local' | 'Demo' | 'Production';
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const DocumentSearch: React.FC<DocumentSearchComponentProps> = ({
  selectedDocument,
  setSelectedDocument,
  production,
  addStatusMessage,
  credentials,
}) => {
  const [userInput, setUserInput] = useState('');
  const [page, setPage] = useState(1);

  const [documents, setDocuments] = useState<DocumentPreview[] | null>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const pageSize = 50;

  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [_triggerSearch, setTriggerSearch] = useState(false);

  const [isFetching, setIsFetching] = useState(false);

  const nextPage = () => {
    if (!documents) {
      return;
    }

    if (page * pageSize < totalDocuments) {
      setPage((prev) => prev + 1);
    } else {
      setPage(1);
    }
  };

  const previousPage = () => {
    if (!documents) {
      return;
    }
    if (page === 1) {
      setPage(Math.ceil(totalDocuments / pageSize));
    } else {
      setPage((prev) => prev - 1);
    }
  };

  const fetchAllDocuments = useCallback(
    async (_userInput?: string) => {
      try {
        setIsFetching(true);

        const data: DocumentsPreviewPayload | null = await retrieveAllDocuments(
          _userInput ? _userInput : '',
          selectedLabels,
          page,
          pageSize,
          credentials
        );

        if (data) {
          if (data.error !== '') {
            setIsFetching(false);
            setDocuments(null);
            setTotalDocuments(0);
          } else {
            setDocuments(data.documents);
            setLabels(data.labels);
            setIsFetching(false);
            setTotalDocuments(data.totalDocuments);
          }
        }
      } catch (_error) {
        setIsFetching(false);
      }
    },
    [selectedLabels, page, pageSize, credentials]
  );

  useEffect(() => {
    setTriggerSearch(true);
  }, []);

  useEffect(() => {
    fetchAllDocuments(userInput);
  }, [fetchAllDocuments, userInput]);

  const handleSearch = () => {
    fetchAllDocuments(userInput);
  };

  const clearSearch = () => {
    setUserInput('');
    setSelectedLabels([]);
    fetchAllDocuments('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSearch(); // Submit form
    }
  };

  const handleDeleteDocument = async (d: unknown) => {
    if (production === 'Demo') {
      return;
    }
    if (typeof d !== 'string') {
      return;
    }
    const response = await deleteDocument(d, credentials);
    addStatusMessage('Deleted document', 'WARNING');
    if (response) {
      if (d === selectedDocument) {
        setSelectedDocument(null);
      }
      fetchAllDocuments(userInput);
    }
  };

  const removeLabel = (l: string) => {
    setSelectedLabels((prev) => prev.filter((label) => label !== l));
  };

  const openDeleteModal = (id: string) => {
    const modal = document.getElementById(id);
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Search Header */}
      <div className="flex h-min w-full items-center justify-between gap-2 rounded-2xl bg-bg-alt-verba p-3">
        <div className="hidden w-[8vw] justify-start gap-2 lg:flex">
          <InfoComponent
            display_text="Search"
            tooltip_text="Search and inspect different documents imported into Verba"
          />
        </div>

        <div className="w-full">
          <Input
            onChange={(e) => {
              setUserInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Search for documents (${totalDocuments})`}
            value={userInput}
          />
        </div>

        <VerbaButton Icon={FaSearch} onClick={handleSearch} />
        <VerbaButton
          Icon={MdOutlineRefresh}
          icon_size={20}
          onClick={clearSearch}
        />
      </div>

      {/* Document List */}
      <div className="flex h-full w-full flex-col items-center gap-3 overflow-auto rounded-2xl bg-bg-alt-verba p-6">
        <div className="flex w-full flex-col justify-start gap-2">
          {/* Simplified label button - full dropdown implementation would need shadcn/ui Select */}
          <VerbaButton
            disabled={false}
            Icon={IoMdAddCircle}
            icon_size={12}
            selected={false}
            title="Labels"
          />
          <div className="flex flex-wrap gap-2">
            {selectedLabels.map((label, index) => (
              <VerbaButton
                className="min-w-min max-w-[200px]"
                Icon={MdCancel}
                icon_size={12}
                key={`FilterDocumentLabel${index}`}
                onClick={() => {
                  removeLabel(label);
                }}
                selected={true}
                selected_color="bg-primary-verba"
                title={label}
              />
            ))}
          </div>
        </div>

        {isFetching && (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-foreground" />
          </div>
        )}

        <div className="verba-document-list">
          {documents?.map((document, index) => (
            <div
              className={`verba-document-item ${selectedDocument === document.uuid ? 'selected' : ''}`}
              key={`Document${index}${document.title}`}
              onClick={() => setSelectedDocument(document.uuid)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className="truncate max-w-[150px] lg:max-w-[350px]"
                  title={document.title}
                >
                  {document.title}
                </span>
                {production !== 'Demo' && (
                  <VerbaButton
                    className="max-w-min"
                    Icon={FaTrash}
                    key={`${document.title + index}delete`}
                    onClick={() => {
                      openDeleteModal(`remove_document${document.uuid}`);
                    }}
                    selected={selectedDocument === document.uuid}
                    selected_color="bg-warning-verba"
                  />
                )}
              </div>
              <UserModalComponent
                modal_id={`remove_document${document.uuid}`}
                text={`Do you want to remove ${document.title}?`}
                title={'Remove Document'}
                triggerAccept={(uuid: unknown) => {
                  if (typeof uuid === 'string') {
                    handleDeleteDocument(uuid);
                  }
                }}
                triggerString="Delete"
                triggerValue={document.uuid}
              />
            </div>
          ))}{' '}
        </div>
      </div>

      <div className="flex h-min w-full items-center justify-center gap-2 rounded-2xl bg-bg-alt-verba p-4">
        <div className="flex items-center justify-center text-text-verba">
          <div className="flex items-center justify-center gap-2 bg-bg-alt-verba">
            <VerbaButton
              className="min-w-min max-w-[200px] px-2 py-1"
              Icon={FaArrowAltCircleLeft}
              onClick={previousPage}
              text_class_name="text-xs"
              title={'Previous Page'}
            />
            <div className="flex items-center">
              <p className="text-text-verba text-xs">Page {page}</p>
            </div>
            <VerbaButton
              className="min-w-min max-w-[200px] px-2 py-1"
              Icon={FaArrowAltCircleRight}
              onClick={nextPage}
              text_class_name="text-xs"
              title={'Next Page'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSearch;
