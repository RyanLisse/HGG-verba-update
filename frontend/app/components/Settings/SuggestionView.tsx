'use client';

import { formatDistanceToNow, parseISO } from 'date-fns';
import type React from 'react';
import { useEffect, useState } from 'react';
import { FaArrowAltCircleLeft, FaArrowAltCircleRight } from 'react-icons/fa';
import { IoCopy, IoReload, IoTrash } from 'react-icons/io5';
import { deleteSuggestion, fetchAllSuggestions } from '@/app/api';
import type { Credentials, Suggestion } from '@/app/types';
import UserModalComponent from '../Navigation/UserModal';

import VerbaButton from '../Navigation/VerbaButton';

type SuggestionViewProps = {
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const SuggestionView: React.FC<SuggestionViewProps> = ({
  credentials,
  addStatusMessage,
}) => {
  const [page, setPage] = useState(1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const handleSuggestionFetch = async () => {
    const suggestions = await fetchAllSuggestions(page, pageSize, credentials);
    if (suggestions) {
      setSuggestions(suggestions.suggestions);
      setTotalCount(suggestions.total_count);
    }
  };
  useEffect(() => {
    handleSuggestionFetch();
  }, [handleSuggestionFetch]);

  useEffect(() => {
    handleSuggestionFetch();
  }, [handleSuggestionFetch]);

  const nextPage = () => {
    if (page * pageSize <= totalCount) {
      setPage((prev) => prev + 1);
    } else {
      setPage(1);
    }
  };

  const previousPage = () => {
    if (page === 1) {
      setPage(1);
    } else {
      setPage((prev) => prev - 1);
    }
  };

  const openModal = (modal_id: string) => {
    const modal = document.getElementById(modal_id);
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (_error) {
      return 'Invalid date';
    }
  };

  const handleRefresh = () => {
    handleSuggestionFetch();
  };

  const handleDelete = async (uuid: string) => {
    await deleteSuggestion(uuid, credentials);
    await handleSuggestionFetch();
    addStatusMessage('Suggestion deleted', 'SUCCESS');
  };

  const handleCopy = (query: string) => {
    navigator.clipboard.writeText(query).then(() => {});
  };

  return (
    <div className="flex size-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-2xl">Manage Suggestions ({totalCount})</p>
        <VerbaButton
          className="max-w-min"
          Icon={IoReload}
          onClick={handleRefresh}
          title="Refresh"
        />
      </div>
      <div className="grow overflow-y-auto">
        <div className="flex flex-col gap-4 p-4 text-text-verba">
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <div
                className="flex items-center justify-between gap-2 rounded-xl border-2 bg-bg-alt-verba p-4"
                key={`Suggestion${suggestion.uuid}`}
              >
                <div className="flex w-2/3 flex-col items-start justify-start gap-2">
                  <p className="flex text-start font-bold text-text-alt-verba text-xs">
                    {getTimeAgo(suggestion.timestamp)}
                  </p>
                  <p
                    className="max-w-full truncate text-sm text-text-verba"
                    title={suggestion.query}
                  >
                    {suggestion.query}
                  </p>
                </div>
                <div className="flex gap-2">
                  <VerbaButton
                    Icon={IoCopy}
                    onClick={() => handleCopy(suggestion.query)}
                  />
                  <VerbaButton
                    Icon={IoTrash}
                    onClick={() =>
                      openModal(`remove_suggestion${suggestion.uuid}`)
                    }
                  />
                </div>
                <UserModalComponent
                  modal_id={`remove_suggestion${suggestion.uuid}`}
                  text={'Do you want to remove this suggestion?'}
                  title={'Remove Suggestion'}
                  triggerAccept={(value) => handleDelete(value as string)}
                  triggerString="Delete"
                  triggerValue={suggestion.uuid}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-bg-alt-verba p-3">
          <VerbaButton
            className="btn-sm min-w-min max-w-[200px]"
            Icon={FaArrowAltCircleLeft}
            onClick={previousPage}
            text_class_name="text-xs"
            title="Previous Page"
          />
          <p className="flex text-text-verba text-xs">Page {page}</p>
          <VerbaButton
            className="btn-sm min-w-min max-w-[200px]"
            Icon={FaArrowAltCircleRight}
            onClick={nextPage}
            text_class_name="text-xs"
            title="Next Page"
          />
        </div>
      )}
    </div>
  );
};

export default SuggestionView;
