'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { FaWrench } from 'react-icons/fa';
import { IoDocumentSharp, IoReload, IoTrash } from 'react-icons/io5';
import { deleteAllDocuments, fetchMeta } from '@/app/api';
import type { CollectionPayload, Credentials, NodePayload } from '@/app/types';
import UserModalComponent from '../Navigation/UserModal';

import VerbaButton from '../Navigation/VerbaButton';

type InfoViewProps = {
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const InfoView: React.FC<InfoViewProps> = ({
  credentials,
  addStatusMessage,
}) => {
  const [nodePayload, setNodePayload] = useState<NodePayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [collectionPayload, setCollectionPayload] =
    useState<CollectionPayload | null>(null);

  const fetchMetadata = async () => {
    setIsLoading(true);
    const metaData = await fetchMeta(credentials);
    if (metaData?.error === '') {
      setNodePayload(metaData.node_payload);
      setCollectionPayload(metaData.collection_payload);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchMetadata();
    setIsLoading(false);
  }, [fetchMetadata]);

  const resetDocuments = async () => {
    const response = await deleteAllDocuments('DOCUMENTS', credentials);
    if (response) {
      addStatusMessage('All documents reset', 'SUCCESS');
      fetchMetadata();
    } else {
      addStatusMessage('Failed to reset documents', 'ERROR');
    }
  };

  const resetVerba = async () => {
    const response = await deleteAllDocuments('ALL', credentials);
    if (response) {
      addStatusMessage('Verba reset', 'SUCCESS');
      fetchMetadata();
    } else {
      addStatusMessage('Failed to reset Verba', 'ERROR');
    }
  };

  const resetConfig = async () => {
    const response = await deleteAllDocuments('CONFIG', credentials);
    if (response) {
      addStatusMessage('Config reset', 'SUCCESS');
      fetchMetadata();
    } else {
      addStatusMessage('Failed to reset config', 'ERROR');
    }
  };

  const resetSuggestions = async () => {
    const response = await deleteAllDocuments('SUGGESTIONS', credentials);
    if (response) {
      addStatusMessage('Suggestions reset', 'SUCCESS');
      fetchMetadata();
    } else {
      addStatusMessage('Failed to reset suggestions', 'ERROR');
    }
  };

  const openModal = (modal_id: string) => {
    const modal = document.getElementById(modal_id);
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  return (
    <div className="flex size-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-2xl">Admin Panel</p>
        <VerbaButton
          className="max-w-min"
          Icon={IoReload}
          loading={isLoading}
          onClick={fetchMetadata}
          title="Refresh"
        />
      </div>
      <div className="grow overflow-y-auto">
        <div className="flex flex-col gap-4 p-4 text-text-verba">
          <p className="font-bold text-lg">Resetting Verba</p>
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <VerbaButton
                Icon={IoDocumentSharp}
                onClick={() => openModal('reset-documents')}
                title="Clear Documents"
              />
              <VerbaButton
                Icon={FaWrench}
                onClick={() => openModal('reset-configs')}
                title="Clear Config"
              />
              <VerbaButton
                Icon={IoTrash}
                onClick={() => openModal('reset-verba')}
                title="Clear Everything"
              />
              <VerbaButton
                Icon={IoTrash}
                onClick={() => openModal('reset-suggestions')}
                title="Clear Suggestions"
              />
            </div>
          </div>
          <p className="font-bold text-lg">Weaviate Information</p>

          <div className="flex flex-col gap-2 rounded-lg border-2 border-bg-verba p-4 shadow-sm">
            <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
              Connected to
            </p>
            <p className="text-text-verba">{credentials.url}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border-2 border-bg-verba p-4 shadow-sm">
            <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
              Deployment
            </p>
            <p className="text-text-verba">{credentials.deployment}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border-2 border-secondary-verba p-4 shadow-sm">
            <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
              Version
            </p>
            {nodePayload ? (
              <p className="text-text-verba">{nodePayload.weaviate_version}</p>
            ) : (
              <span className="loading loading-spinner loading-sm" />
            )}
          </div>

          <div className="flex flex-col rounded-lg border-2 border-bg-verba p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
                Nodes
              </p>
              {nodePayload ? (
                <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
                  {nodePayload.node_count}
                </p>
              ) : (
                <span className="loading loading-spinner loading-sm" />
              )}
            </div>

            {nodePayload ? (
              <ul className="mt-2 flex list-inside list-disc flex-col">
                {nodePayload.nodes.map((node) => (
                  <li
                    className="flex justify-between text-sm text-text-verba"
                    key={`Node${node.name}`}
                  >
                    <span className="w-64 truncate">{node.name}</span>
                    <span>
                      ({node.status} - {node.shards} shards)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="loading loading-dots loading-sm mt-2" />
            )}
          </div>

          <div className="flex flex-col rounded-lg border-2 border-bg-verba p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
                Collections
              </p>
              {collectionPayload ? (
                <p className="font-semibold text-sm text-text-alt-verba lg:text-base">
                  {collectionPayload.collection_count}
                </p>
              ) : (
                <span className="loading loading-spinner loading-sm" />
              )}
            </div>

            {collectionPayload ? (
              <ul className="mt-2 flex list-inside list-disc flex-col">
                {collectionPayload.collections.map((collection) => (
                  <li
                    className="flex justify-between text-sm text-text-verba"
                    key={`Collection${collection.name}`}
                  >
                    <span className="w-lg truncate">{collection.name}</span>
                    <span>{collection.count} objects</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="loading loading-dots loading-sm mt-2" />
            )}
          </div>
        </div>
      </div>
      <UserModalComponent
        modal_id="reset-documents"
        text="Are you sure you want to reset all documents? This will clear all documents and chunks from Verba."
        title="Reset Documents"
        triggerAccept={resetDocuments}
        triggerString="Reset"
      />
      <UserModalComponent
        modal_id="reset-configs"
        text="Are you sure you want to reset the config?"
        title="Reset Config"
        triggerAccept={resetConfig}
        triggerString="Reset"
      />
      <UserModalComponent
        modal_id="reset-verba"
        text="Are you sure you want to reset Verba? This will delete all collections related to Verba."
        title="Reset Verba"
        triggerAccept={resetVerba}
        triggerString="Reset"
      />
      <UserModalComponent
        modal_id="reset-suggestions"
        text="Are you sure you want to reset all autocomplete suggestions?"
        title="Reset Suggestions"
        triggerAccept={resetSuggestions}
        triggerString="Reset"
      />
    </div>
  );
};

export default InfoView;
