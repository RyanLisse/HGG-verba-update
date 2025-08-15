'use client';

import React, { useEffect, useState } from 'react';
import { FaFileImport } from 'react-icons/fa';
import { GoFileDirectoryFill } from 'react-icons/go';
import { IoMdAddCircle } from 'react-icons/io';
import { MdCancel } from 'react-icons/md';
import { TbPlugConnected } from 'react-icons/tb';
import type { FileMap, RAGConfig } from '@/app/types';

import { closeOnClick } from '@/app/util';
import InfoComponent from '../Navigation/InfoComponent';
import UserModalComponent from '../Navigation/UserModal';
import VerbaButton from '../Navigation/VerbaButton';
import FileComponent from './FileComponent';

type FileSelectionViewProps = {
  fileMap: FileMap;
  setFileMap: React.Dispatch<React.SetStateAction<FileMap>>;
  RAGConfig: RAGConfig | null;
  setRAGConfig: (r_: RAGConfig | null) => void;
  selectedFileData: string | null;
  setSelectedFileData: (f: string | null) => void;
  importSelected: () => void;
  importAll: () => void;
  reconnect: () => void;
  socketStatus: 'ONLINE' | 'OFFLINE';
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const FileSelectionView: React.FC<FileSelectionViewProps> = ({
  fileMap,
  setFileMap,
  RAGConfig,
  addStatusMessage,
  // setRAGConfig not used in this component
  selectedFileData,
  setSelectedFileData,
  importSelected,
  socketStatus,
  reconnect,
  importAll,
}) => {
  const ref = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.setAttribute('directory', '');
      ref.current.setAttribute('webkitdirectory', '');
    }
  }, []);

  const openDeleteModal = () => {
    const modal = document.getElementById('remove_all_files');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  const handleDeleteFile = (filename: string | null) => {
    setFileMap((prevFileMap: FileMap): FileMap => {
      if (filename === null) {
        addStatusMessage('Cleared all files', 'WARNING');
        setSelectedFileData(null);
        return {};
      }
      if (filename === selectedFileData) {
        setSelectedFileData(null);
      }
      addStatusMessage('Cleared selected file', 'WARNING');
      const newFileMap: FileMap = { ...prevFileMap };
      delete newFileMap[filename];
      return newFileMap;
    });
  };

  const [selectedFileReader, setSelectedFileReader] = useState<string | null>(
    null
  );
  const [selectedDirReader, setSelectedDirReader] = useState<string | null>(
    null
  );

  const handleUploadFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
    isDirectory: boolean
  ) => {
    if (event.target.files && RAGConfig) {
      const files = event.target.files;
      const newFileMap: FileMap = { ...fileMap };
      const selectedReader = isDirectory
        ? selectedDirReader
        : selectedFileReader;

      addStatusMessage('Added new files', 'SUCCESS');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) {
          continue;
        }
        const newRAGConfig: RAGConfig = JSON.parse(JSON.stringify(RAGConfig));
        if (selectedReader && newRAGConfig.Reader) {
          newRAGConfig.Reader.selected = selectedReader;
        }
        const filename = file.name;
        let fileID = file.name;

        // Check if the fileID already exists in the map
        if (fileID in newFileMap) {
          // If it exists, append a timestamp to make it unique
          const timestamp = Date.now();
          fileID = `${fileID}_${timestamp}`;
        }

        const extension = file.name.split('.').pop() || '';
        const fileContent = await readFileContent(file);

        newFileMap[fileID] = {
          fileID,
          filename,
          extension,
          status_report: {},
          source: '',
          isURL: false,
          metadata: '',
          overwrite: false,
          content: fileContent,
          labels: ['Document'],
          rag_config: newRAGConfig,
          file_size: calculateBytesFromHexString(fileContent),
          status: 'READY',
        };
      }

      setFileMap(newFileMap);
      const firstKey = Object.keys(newFileMap)[0];
      setSelectedFileData(firstKey || null);

      event.target.value = '';
    }
  };

  const handleAddURL = (URLReader: string) => {
    if (RAGConfig) {
      const newFileMap: FileMap = { ...fileMap };
      const newRAGConfig: RAGConfig = JSON.parse(JSON.stringify(RAGConfig));
      if (newRAGConfig.Reader) {
        newRAGConfig.Reader.selected = URLReader;
      }

      const now = new Date();
      const filename = `New ${URLReader} Job`;
      const fileID = now.toISOString();
      const extension = 'URL';

      addStatusMessage('Added new URL Job', 'SUCCESS');

      newFileMap[fileID] = {
        fileID,
        filename,
        metadata: '',
        status_report: {},
        extension,
        isURL: true,
        source: '',
        overwrite: false,
        content: '',
        labels: ['Document'],
        rag_config: newRAGConfig,
        file_size: 0,
        status: 'READY',
      };

      setFileMap(newFileMap);
      setSelectedFileData(fileID);
    }
  };

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        binary += String.fromCharCode(byte);
      }
    }
    return btoa(binary); // Encode the binary string to base64
  }

  function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const content = arrayBufferToBase64(arrayBuffer);
        resolve(content); // Resolve with the base64 content
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  const calculateBytesFromHexString = (hexString: string): number => {
    // Remove any spaces from the hex string
    const cleanedHexString = hexString.replace(/\s+/g, '');

    // Ensure the string length is even (two characters per byte)
    if (cleanedHexString.length % 2 !== 0) {
      throw new Error('Invalid hex string length.');
    }

    // Each byte is represented by two hex characters
    const bytes = cleanedHexString.length / 2;
    return bytes;
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {/* FileSelection Header */}
      <div className="flex h-min w-full items-center justify-end gap-2 rounded-2xl bg-bg-alt-verba p-3 lg:justify-between">
        <div className="hidden justify-start gap-2 lg:flex">
          <InfoComponent
            display_text="File Selection"
            tooltip_text="Upload your data through this interface into Verba. You can select individual files, directories or add URL to fetch data from."
          />
        </div>
        <div className="flex justify-center gap-3 lg:justify-end">
          <div className="dropdown dropdown-hover">
            <label>
              <VerbaButton
                Icon={IoMdAddCircle}
                onClick={() => document.getElementById('files_upload')?.click()}
                title="Files"
              />
            </label>
            <ul className="dropdown-content menu z-1 w-52 rounded-box bg-base-100 p-2 shadow">
              {RAGConfig &&
                RAGConfig.Reader &&
                Object.entries(RAGConfig.Reader.components)
                  .filter(([, component]) => component.type !== 'URL')
                  .map(([componentKey, component]) => (
                    <li
                      key={`File_${component.name}_${componentKey}`}
                      onClick={() => {
                        setSelectedFileReader(component.name);
                        document.getElementById('files_upload')?.click();
                        closeOnClick();
                      }}
                    >
                      <a>{component.name}</a>
                    </li>
                  ))}
            </ul>
          </div>
          <input
            className="hidden"
            id={'files_upload'}
            multiple
            onChange={(e) => handleUploadFiles(e, false)}
            type="file"
          />

          <div className="dropdown dropdown-hover">
            <label>
              <VerbaButton Icon={GoFileDirectoryFill} title="Directory" />
            </label>
            <ul className="dropdown-content menu z-1 w-52 rounded-box bg-base-100 p-2 shadow">
              {RAGConfig &&
                RAGConfig.Reader &&
                Object.entries(RAGConfig.Reader.components)
                  .filter(([, component]) => component.type !== 'URL')
                  .map(([componentKey, component]) => (
                    <li
                      key={`Dir_${component.name}_${componentKey}`}
                      onClick={() => {
                        setSelectedDirReader(component.name);
                        document.getElementById('dir_upload')?.click();
                        closeOnClick();
                      }}
                    >
                      <a>{component.name}</a>
                    </li>
                  ))}
            </ul>
          </div>
          <input
            className="hidden"
            id={'dir_upload'}
            multiple
            onChange={(e) => handleUploadFiles(e, true)}
            ref={ref}
            type="file"
          />

          <div className="dropdown dropdown-hover">
            <label>
              <VerbaButton Icon={IoMdAddCircle} title="URL" />
            </label>
            <input className="hidden" id={'url_upload'} type="file" />
            <ul className="dropdown-content menu z-1 w-52 rounded-box bg-base-100 p-2 shadow">
              {RAGConfig &&
                RAGConfig.Reader &&
                Object.entries(RAGConfig.Reader.components)
                  .filter(([, component]) => component.type === 'URL')
                  .map(([componentKey, component]) => (
                    <li
                      key={`URL_${component.name}_${componentKey}`}
                      onClick={() => {
                        handleAddURL(component.name);
                        closeOnClick();
                      }}
                    >
                      <a>{component.name}</a>
                    </li>
                  ))}
            </ul>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex h-full w-full flex-col items-center justify-start gap-3 overflow-auto rounded-2xl bg-bg-alt-verba p-6">
        {Object.entries(fileMap).map(([key, fileData]) => (
          <FileComponent
            fileData={fileData}
            fileMap={fileMap}
            handleDeleteFile={handleDeleteFile}
            key={`FileComponent_${key}`}
            selectedFileData={selectedFileData}
            setSelectedFileData={setSelectedFileData}
          />
        ))}
      </div>

      {/* Import Footer */}
      {socketStatus === 'ONLINE' ? (
        <div className="flex h-min w-full items-center justify-end gap-2 rounded-2xl bg-bg-alt-verba p-3">
          <div className="flex flex-wrap justify-end gap-3">
            {selectedFileData && (
              <VerbaButton
                Icon={FaFileImport}
                onClick={importSelected}
                title="Import Selected"
              />
            )}
            <VerbaButton
              Icon={FaFileImport}
              onClick={importAll}
              title="Import All"
            />

            <VerbaButton
              Icon={MdCancel}
              onClick={openDeleteModal}
              title="Clear Files"
            />
          </div>
        </div>
      ) : (
        <div className="flex h-min w-full items-center justify-end gap-2 rounded-2xl bg-bg-alt-verba p-3">
          <div className="flex justify-end gap-3">
            <button
              className="btn flex items-center gap-2 border-none bg-button-verba text-text-verba hover:bg-button-hover-verba"
              onClick={reconnect}
            >
              <TbPlugConnected size={15} />
              <p>Reconnecting...</p>
              <span className="loading loading-spinner loading-xs" />
            </button>
          </div>
        </div>
      )}

      <UserModalComponent
        modal_id={'remove_all_files'}
        text={'Do you want to clear all files from your selection?'}
        title={'Clear all files?'}
        triggerAccept={(value: unknown) =>
          handleDeleteFile(value as string | null)
        }
        triggerString="Clear All"
        triggerValue={null}
      />
    </div>
  );
};

export default FileSelectionView;
