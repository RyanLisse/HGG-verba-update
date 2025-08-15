'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { CgDebug } from 'react-icons/cg';
import { FaCheckCircle } from 'react-icons/fa';
import { IoAddCircleSharp } from 'react-icons/io5';
import { MdCancel, MdError } from 'react-icons/md';
import {
  type FileData,
  type FileMap,
  type RAGComponentConfig,
  statusColorMap,
  statusTextMap,
} from '@/app/types';
import VerbaButton from '../Navigation/VerbaButton';
import ComponentView from './ComponentView';

type BasicSettingViewProps = {
  selectedFileData: string | null;
  fileMap: FileMap;
  setFileMap: React.Dispatch<React.SetStateAction<FileMap>>;
  blocked: boolean | undefined;
  selectComponent: (component_n: string, selected_component: string) => void;
  updateConfig: (
    component_n: string,
    configTitle: string,
    value: string | boolean | string[]
  ) => void;
  saveComponentConfig: (
    component_n: string,
    selected_component: string,
    component_config: RAGComponentConfig
  ) => void;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const BasicSettingView: React.FC<BasicSettingViewProps> = ({
  selectedFileData,
  fileMap,
  selectComponent,
  updateConfig,
  saveComponentConfig,
  setFileMap,
  blocked,
  // addStatusMessage parameter not used in this component
}) => {
  const [filename, setFilename] = useState('');
  const [source, setSource] = useState('');
  const [metadata, setMetadata] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (selectedFileData && fileMap[selectedFileData]) {
      setFilename(fileMap[selectedFileData].filename);
      setSource(fileMap[selectedFileData].source);
      setMetadata(fileMap[selectedFileData].metadata);
    }
  }, [fileMap, selectedFileData]);

  const updateFileMap = useCallback(
    (key: 'filename' | 'source' | 'metadata', value: string) => {
      if (selectedFileData) {
        const newFileData: FileData = JSON.parse(
          JSON.stringify(fileMap[selectedFileData])
        );
        newFileData[key] = value;
        const newFileMap: FileMap = { ...fileMap };
        newFileMap[selectedFileData] = newFileData;
        setFileMap(newFileMap);
      }
    },
    [selectedFileData, fileMap, setFileMap]
  );

  const handleFilenameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFilename = e.target.value;
      setFilename(newFilename);
      updateFileMap('filename', newFilename);
    },
    [updateFileMap]
  );

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSource = e.target.value;
      setSource(newSource);
      updateFileMap('source', newSource);
    },
    [updateFileMap]
  );

  const handleMetadataChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newMetadata = e.target.value;
      setMetadata(newMetadata);
      updateFileMap('metadata', newMetadata);
    },
    [updateFileMap]
  );

  const openDebugModal = () => {
    const modal = document.getElementById('File_Debug_Modal');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  const formatByteSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
      return '0 B';
    }

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / 1024 ** i;
    return `${size.toFixed(2)} ${sizes[i]}`;
  };

  const setOverwrite = (o: boolean) => {
    if (selectedFileData) {
      const newFileData: FileData = JSON.parse(
        JSON.stringify(fileMap[selectedFileData])
      );
      newFileData.overwrite = o;
      const newFileMap: FileMap = { ...fileMap };
      newFileMap[selectedFileData] = newFileData;
      setFileMap(newFileMap);
    }
  };

  const addLabel = (l: string) => {
    if (
      selectedFileData &&
      fileMap[selectedFileData] &&
      !fileMap[selectedFileData].labels.includes(l) &&
      l.length > 0
    ) {
      const newFileData: FileData = JSON.parse(
        JSON.stringify(fileMap[selectedFileData])
      );
      newFileData.labels.push(l);
      const newFileMap: FileMap = { ...fileMap };
      newFileMap[selectedFileData] = newFileData;
      setFileMap(newFileMap);
      setLabel('');
    }
  };

  const removeLabel = (l: string) => {
    if (
      selectedFileData &&
      fileMap[selectedFileData] &&
      fileMap[selectedFileData].labels.includes(l) &&
      l.length > 0
    ) {
      const newFileData: FileData = JSON.parse(
        JSON.stringify(fileMap[selectedFileData])
      );
      newFileData.labels = newFileData.labels.filter((item) => item !== l);
      const newFileMap: FileMap = { ...fileMap };
      newFileMap[selectedFileData] = newFileData;
      setFileMap(newFileMap);
      setLabel('');
    }
  };

  function renderLabelBoxes(fileData: FileData) {
    return Object.entries(fileData.labels).map(([key, label]) => (
      <div key={fileData.fileID + key + label}>
        <VerbaButton
          className="btn-sm"
          Icon={MdCancel}
          onClick={() => {
            removeLabel(label);
          }}
          text_class_name="text-xs"
          title={label}
        />
      </div>
    ));
  }

  if (selectedFileData) {
    return (
      <div className="flex w-full flex-col justify-start gap-3 rounded-2xl p-1">
        {selectedFileData &&
          fileMap[selectedFileData] &&
          fileMap[selectedFileData].status !== 'READY' && (
            <div className="divider text-text-alt-verba">Import Status</div>
          )}

        <div className="flex flex-col gap-3 text-text-verba">
          {selectedFileData &&
            fileMap[selectedFileData] &&
            Object.entries(fileMap[selectedFileData].status_report).map(
              ([status, statusReport]) => (
                <div className="flex" key={`Status${status}`}>
                  <p className="flex min-w-[8vw] items-center gap-2 text-text-verba">
                    {statusReport.status === 'DONE' && (
                      <FaCheckCircle size={15} />
                    )}
                    {statusReport.status === 'ERROR' && <MdError size={15} />}
                    {statusTextMap[statusReport.status]}
                  </p>
                  <label
                    className={`input flex w-full items-center gap-2 ${statusColorMap[statusReport.status]} bg-bg-verba`}
                  >
                    <input
                      className="w-full grow"
                      disabled={true}
                      type="text"
                      value={
                        statusReport.took !== 0
                          ? statusReport.message +
                            ' (' +
                            statusReport.took +
                            's)'
                          : statusReport.message
                      }
                    />
                  </label>
                </div>
              )
            )}
        </div>

        <ComponentView
          blocked={fileMap[selectedFileData]?.block ?? false}
          component_name="Reader"
          RAGConfig={fileMap[selectedFileData]?.rag_config ?? ({} as any)}
          saveComponentConfig={saveComponentConfig}
          selectComponent={selectComponent}
          skip_component={true}
          updateConfig={updateConfig}
        />

        <div className="divider text-text-alt-verba">File Settings</div>

        {/* Filename */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Title</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={blocked}
              onChange={handleFilenameChange}
              type="text"
              value={filename}
            />
          </label>
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            Add a Title to the document. If you are adding a URL, all URL will
            have a have their corresponding URL as filename.
          </p>
        </div>

        {/* Source */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Source Link</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={blocked}
              onChange={handleSourceChange}
              type="text"
              value={source}
            />
          </label>
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            Add a link to reference the original source of the document. You can
            access it through the Document Explorer via the View Source button
          </p>
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Labels</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={blocked}
              onChange={(e) => {
                setLabel(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLabel(label);
                }
              }}
              title={label}
              type="text"
              value={label}
            />
          </label>
          <VerbaButton
            disabled={blocked ?? false}
            Icon={IoAddCircleSharp}
            onClick={() => {
              addLabel(label);
            }}
            title="Add"
          />
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            Add or remove labels for Document Filtering
          </p>
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <div className="flex flex-wrap gap-2">
            {fileMap[selectedFileData]
              ? renderLabelBoxes(fileMap[selectedFileData])
              : null}
          </div>
        </div>

        {/* Overwrite */}
        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Overwrite</p>
          <input
            checked={
              selectedFileData && fileMap[selectedFileData]
                ? fileMap[selectedFileData].overwrite
                : false
            }
            className="checkbox checkbox-md"
            disabled={blocked}
            onChange={(e) =>
              setOverwrite((e.target as HTMLInputElement).checked)
            }
            type="checkbox"
          />
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            Overwrite existing documents with the same name.
          </p>
        </div>

        <div className="divider text-text-alt-verba">Metadata</div>

        {/* Metadata */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Metadata</p>
          <textarea
            className="textarea flex max-h-64 w-full grow items-center gap-2 bg-bg-verba"
            disabled={blocked}
            onChange={handleMetadataChange}
            value={metadata}
          />
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            Add metadata to the document to improve retrieval and generation.
            Metadata will added to the context sent to the embedding and
            generation, to influcence the results.
          </p>
        </div>

        <div className="divider text-text-alt-verba">File Information</div>

        {/* Extension */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Extension</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={true}
              type="text"
              value={fileMap[selectedFileData]?.extension ?? ''}
            />
          </label>
        </div>

        {/* File Size */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">File Size</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={true}
              type="text"
              value={formatByteSize(fileMap[selectedFileData]?.file_size ?? 0)}
            />
          </label>
        </div>

        <div className="divider text-text-alt-verba">Ingestion Pipeline</div>

        {/* Reader */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Reader</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={true}
              type="text"
              value={
                fileMap[selectedFileData]?.rag_config?.Reader?.selected ?? ''
              }
            />
          </label>
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            {selectedFileData &&
              fileMap[selectedFileData]?.rag_config?.Reader?.components?.[
                fileMap[selectedFileData]?.rag_config?.Reader?.selected ?? ''
              ]?.description}
          </p>
        </div>

        {/* Chunker */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Chunker</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={true}
              type="text"
              value={
                fileMap[selectedFileData]?.rag_config?.Chunker?.selected ?? ''
              }
            />
          </label>
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            {selectedFileData &&
              fileMap[selectedFileData]?.rag_config?.Chunker?.components?.[
                fileMap[selectedFileData]?.rag_config?.Chunker?.selected ?? ''
              ]?.description}
          </p>
        </div>

        {/* Embedder */}
        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Embedder</p>
          <label className="input flex w-full items-center gap-2 bg-bg-verba">
            <input
              className="w-full grow"
              disabled={true}
              type="text"
              value={
                fileMap[selectedFileData]?.rag_config?.Embedder?.selected ?? ''
              }
            />
          </label>
        </div>

        <div className="flex items-center gap-2 text-text-verba">
          <p className="flex min-w-[8vw]" />
          <p className="text-start text-sm text-text-alt-verba">
            {selectedFileData &&
              fileMap[selectedFileData]?.rag_config?.Embedder?.components?.[
                fileMap[selectedFileData]?.rag_config?.Embedder?.selected ?? ''
              ]?.description}
          </p>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between gap-2 text-text-verba">
          <p className="flex min-w-[8vw]">Debug</p>
          <VerbaButton
            className="max-w-min"
            Icon={CgDebug}
            onClick={openDebugModal}
          />
        </div>

        <dialog className="modal" id={'File_Debug_Modal'}>
          <div className="modal-box min-w-fit">
            <h3 className="font-bold text-lg">Debugging File Configuration</h3>
            <pre className="whitespace-pre-wrap text-xs">
              {selectedFileData
                ? (() => {
                    // Create a shallow copy of the object
                    const objCopy = { ...fileMap[selectedFileData]! };
                    // Delete the `content` property
                    objCopy.content = 'File Content';
                    // Convert to a pretty-printed JSON string
                    return JSON.stringify(objCopy, null, 2);
                  })()
                : ''}
            </pre>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn ml-2 border-none bg-warning-verba text-text-verba hover:bg-button-hover-verba">
                  Close
                </button>
              </form>
            </div>
          </div>
        </dialog>
      </div>
    );
  }
  return <div />;
};

export default BasicSettingView;
