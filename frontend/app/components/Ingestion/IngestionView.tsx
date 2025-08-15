'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type {
  CreateNewDocument,
  Credentials,
  FileData,
  FileMap,
  RAGConfig,
  StatusReport,
} from '@/app/types';
import { getImportWebSocketApiHost } from '@/app/util';
import ConfigurationView from './ConfigurationView';
import FileSelectionView from './FileSelectionView';

type IngestionViewProps = {
  credentials: Credentials;
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const IngestionView: React.FC<IngestionViewProps> = ({
  credentials,
  RAGConfig,
  setRAGConfig,
  addStatusMessage,
}) => {
  const [fileMap, setFileMap] = useState<FileMap>({});
  const [selectedFileData, setSelectedFileData] = useState<string | null>(null);
  const [_reconnect, setReconnect] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const [socketStatus, setSocketStatus] = useState<'ONLINE' | 'OFFLINE'>(
    'OFFLINE'
  );

  const setSocketErrorStatus = useCallback(() => {
    setFileMap((prevFileMap) => {
      if (fileMap) {
        const newFileMap = { ...prevFileMap };
        for (const fileMapKey in newFileMap) {
          const fileData = newFileMap[fileMapKey];
          if (
            fileData &&
            fileData.status !== 'DONE' &&
            fileData.status !== 'ERROR' &&
            fileData.status !== 'READY'
          ) {
            fileData.status = 'ERROR';
            fileData.status_report.ERROR = {
              fileID: fileMapKey,
              status: 'ERROR',
              message: 'Connection was interrupted',
              took: 0,
            };
          }
        }
        return newFileMap;
      }
      return prevFileMap;
    });
  }, [fileMap]);

  const updateStatus = useCallback(
    (data: StatusReport) => {
      if (data.status === 'DONE') {
        addStatusMessage(`File ${data.fileID} imported`, 'SUCCESS');
      }
      if (data.status === 'ERROR') {
        addStatusMessage(`File ${data.fileID} import failed`, 'ERROR');
      }
      setFileMap((prevFileMap) => {
        if (data && data.fileID in prevFileMap) {
          const newFileData: FileData = JSON.parse(
            JSON.stringify(prevFileMap[data.fileID])
          );
          const newFileMap: FileMap = { ...prevFileMap };
          newFileData.status = data.status;
          newFileData.status_report[data.status] = data;
          newFileMap[data.fileID] = newFileData;
          return newFileMap;
        }
        return prevFileMap;
      });
    },
    [addStatusMessage]
  );

  useEffect(() => {
    setReconnect(true);
  }, []);

  // Setup Import WebSocket and messages
  useEffect(() => {
    const socketHost = getImportWebSocketApiHost();
    const localSocket = new WebSocket(socketHost);

    localSocket.onopen = () => {
      setSocketStatus('ONLINE');
    };

    localSocket.onmessage = (event) => {
      setSocketStatus('ONLINE');
      try {
        const data: StatusReport | CreateNewDocument = JSON.parse(event.data);
        if ('new_file_id' in data) {
          setFileMap((prevFileMap) => {
            const newFileMap: FileMap = { ...prevFileMap };
            const originalFile = newFileMap[data.original_file_id];
            if (originalFile) {
              newFileMap[data.new_file_id] = {
                ...originalFile,
                fileID: data.new_file_id,
                filename: data.filename,
                block: true,
                overwrite: originalFile.overwrite,
              };
            }
            return newFileMap;
          });
        } else {
          updateStatus(data);
        }
      } catch {
        return;
      }
    };

    localSocket.onerror = (_error) => {
      setSocketStatus('OFFLINE');
      setSocketErrorStatus();
      setReconnect((prev) => !prev);
    };

    localSocket.onclose = (event) => {
      setSocketStatus('OFFLINE');
      setSocketErrorStatus();
      if (event.wasClean) {
      } else {
      }
      setReconnect((prev) => !prev);
    };

    setSocket(localSocket);

    return () => {
      if (localSocket.readyState !== WebSocket.CLOSED) {
        localSocket.close();
      }
    };
  }, [setSocketErrorStatus, updateStatus]);

  const reconnectToVerba = () => {
    setReconnect((prevState) => !prevState);
  };

  const setInitialStatus = (fileID: string) => {
    setFileMap((prevFileMap) => {
      if (fileID in prevFileMap) {
        const newFileData: FileData = JSON.parse(
          JSON.stringify(prevFileMap[fileID])
        );
        const newFileMap: FileMap = { ...prevFileMap };
        newFileData.status = 'WAITING';
        if (Object.entries(newFileData.status_report).length > 0) {
          newFileData.status_report = {};
        }
        newFileMap[fileID] = newFileData;
        return newFileMap;
      }
      return prevFileMap;
    });
  };

  const importSelected = () => {
    addStatusMessage('Importing selected file', 'INFO');
    if (selectedFileData) {
      const fileData = fileMap[selectedFileData];
      if (
        fileData &&
        ['READY', 'DONE', 'ERROR'].includes(fileData.status) &&
        !fileData.block
      ) {
        sendDataBatches(JSON.stringify(fileData), selectedFileData);
      }
    }
  };

  const importAll = () => {
    addStatusMessage('Importing all files', 'INFO');
    for (const fileID in fileMap) {
      const fileData = fileMap[fileID];
      if (
        fileData &&
        ['READY', 'DONE', 'ERROR'].includes(fileData.status) &&
        !fileData.block
      ) {
        sendDataBatches(JSON.stringify(fileData), fileID);
      }
    }
  };

  const sendDataBatches = (data: string, fileID: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      setInitialStatus(fileID);
      const chunkSize = 2000; // Define chunk size (in bytes)
      const batches = [];
      let offset = 0;

      // Create the batches
      while (offset < data.length) {
        const chunk = data.slice(offset, offset + chunkSize);
        batches.push(chunk);
        offset += chunkSize;
      }

      const totalBatches = batches.length;

      // Send the batches
      batches.forEach((chunk, order) => {
        socket.send(
          JSON.stringify({
            chunk,
            isLastChunk: order === totalBatches - 1,
            total: totalBatches,
            order,
            fileID,
            credentials,
          })
        );
      });
    } else {
      setReconnect((prevState) => !prevState);
    }
  };

  return (
    <div className="flex h-[80vh] justify-center gap-3">
      <div
        className={`${selectedFileData ? 'hidden md:flex md:w-[45vw]' : 'w-full md:flex md:w-[45vw]'}`}
      >
        <FileSelectionView
          addStatusMessage={addStatusMessage}
          fileMap={fileMap}
          importAll={importAll}
          importSelected={importSelected}
          RAGConfig={RAGConfig}
          reconnect={reconnectToVerba}
          selectedFileData={selectedFileData}
          setFileMap={setFileMap}
          setRAGConfig={setRAGConfig}
          setSelectedFileData={setSelectedFileData}
          socketStatus={socketStatus}
        />
      </div>

      <div
        className={`${selectedFileData ? 'flex w-full md:w-[55vw]' : 'hidden md:flex md:w-[55vw]'}`}
      >
        {selectedFileData && (
          <ConfigurationView
            addStatusMessage={addStatusMessage}
            credentials={credentials}
            fileMap={fileMap}
            RAGConfig={RAGConfig}
            selectedFileData={selectedFileData}
            setFileMap={setFileMap}
            setRAGConfig={setRAGConfig}
            setSelectedFileData={setSelectedFileData}
          />
        )}
      </div>
    </div>
  );
};

export default IngestionView;
