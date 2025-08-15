'use client';

import type React from 'react';
import { FaCheckCircle, FaTrash } from 'react-icons/fa';
import { MdError } from 'react-icons/md';
import { type FileData, type FileMap, statusTextMap } from '@/app/types';

import UserModalComponent from '../Navigation/UserModal';

import VerbaButton from '../Navigation/VerbaButton';

type FileComponentProps = {
  fileData: FileData;
  fileMap: FileMap;
  handleDeleteFile: (name: string) => void;
  selectedFileData: string | null;
  setSelectedFileData: (f: string | null) => void;
};

const FileComponent: React.FC<FileComponentProps> = ({
  fileData,
  fileMap,
  handleDeleteFile,
  selectedFileData,
  setSelectedFileData,
}) => {
  // Get the file map entry with null check
  const fileMapEntry = fileMap[fileData.fileID];

  // If file doesn't exist in map, don't render anything
  if (!fileMapEntry) {
    return null;
  }

  const openDeleteModal = () => {
    const modal = document.getElementById(
      `remove_file_${fileMapEntry.filename}`
    );
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  return (
    <div className="flex w-full items-center gap-2">
      {fileMapEntry.status !== 'READY' ? (
        <div className="flex gap-2">
          {fileMapEntry.status !== 'DONE' &&
            fileMapEntry.status !== 'ERROR' && (
              <VerbaButton
                className="w-[120px]"
                title={statusTextMap[fileMapEntry.status]}
              />
            )}
          {fileMapEntry.status === 'DONE' && (
            <VerbaButton
              className="w-[120px]"
              Icon={FaCheckCircle}
              selected={true}
              selected_color={'bg-secondary-verba'}
              title={statusTextMap[fileMapEntry.status]}
            />
          )}
          {fileMapEntry.status === 'ERROR' && (
            <VerbaButton
              className="w-[120px]"
              Icon={MdError}
              selected={true}
              selected_color={'bg-warning-verba'}
              title={statusTextMap[fileMapEntry.status]}
            />
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <VerbaButton
            className="w-[120px]"
            text_class_name="truncate w-[100px]"
            title={fileMapEntry.rag_config.Reader?.selected || 'No Reader'}
          />
        </div>
      )}

      <VerbaButton
        className="grow"
        onClick={() => {
          setSelectedFileData(fileData.fileID);
        }}
        selected={selectedFileData === fileMapEntry.fileID}
        selected_color="bg-secondary-verba"
        text_class_name="truncate max-w-[150px] lg:max-w-[300px]"
        title={fileMapEntry.filename ? fileMapEntry.filename : 'No Filename'}
      />

      <VerbaButton
        className="w-[50px]"
        Icon={FaTrash}
        onClick={openDeleteModal}
        selected={selectedFileData === fileMapEntry.fileID}
        selected_color="bg-warning-verba"
      />

      <UserModalComponent
        modal_id={`remove_file_${fileMapEntry.filename}`}
        text={
          fileMapEntry.isURL
            ? 'Do you want to remove the URL?'
            : 'Do you want to remove ' +
              fileMapEntry.filename +
              ' from the selection?'
        }
        title={'Remove File'}
        triggerAccept={(value: unknown) => handleDeleteFile(value as string)}
        triggerString="Delete"
        triggerValue={fileMapEntry.fileID}
      />
    </div>
  );
};

export default FileComponent;
