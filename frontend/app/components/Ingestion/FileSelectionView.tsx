"use client";

import React, { useState, useEffect } from "react";
import FileComponent from "./FileComponent";
import InfoComponent from "../Navigation/InfoComponent";
import { IoMdAddCircle } from "react-icons/io";
import { FaFileImport } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { GoFileDirectoryFill } from "react-icons/go";
import { TbPlugConnected } from "react-icons/tb";
import { IoMdArrowDropdown } from "react-icons/io";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

import UserModalComponent from "../Navigation/UserModal";

import VerbaButton from "../Navigation/VerbaButton";

import { FileMap } from "@/app/types";
import { RAGConfig } from "@/app/types";

interface FileSelectionViewProps {
  fileMap: FileMap;
  setFileMap: React.Dispatch<React.SetStateAction<FileMap>>;
  RAGConfig: RAGConfig | null;
  setRAGConfig: (r_: RAGConfig | null) => void;
  selectedFileData: string | null;
  setSelectedFileData: (f: string | null) => void;
  importSelected: () => void;
  importAll: () => void;
  reconnect: () => void;
  socketStatus: "ONLINE" | "OFFLINE";
  addStatusMessage: (
    message: string,
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;
}

const FileSelectionView: React.FC<FileSelectionViewProps> = ({
  fileMap,
  setFileMap,
  RAGConfig,
  addStatusMessage,
  setRAGConfig,
  selectedFileData,
  setSelectedFileData,
  importSelected,
  socketStatus,
  reconnect,
  importAll,
}) => {
  const ref = React.useRef<HTMLInputElement>(null);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.setAttribute("directory", "");
      ref.current.setAttribute("webkitdirectory", "");
    }
  }, [ref]);

  const openDeleteModal = () => {
    setDeleteAllModalOpen(true);
  };

  const handleDeleteFile = (filename: string | null) => {
    setFileMap((prevFileMap: FileMap): FileMap => {
      if (filename === null) {
        addStatusMessage("Cleared all files", "WARNING");
        setSelectedFileData(null);
        return {};
      } else {
        if (filename === selectedFileData) {
          setSelectedFileData(null);
        }
        addStatusMessage("Cleared selected file", "WARNING");
        const newFileMap: FileMap = { ...prevFileMap };
        delete newFileMap[filename];
        return newFileMap;
      }
    });
  };

  const [selectedFileReader, setSelectedFileReader] = useState<string | null>(
    null
  );
  const [selectedDirReader, setSelectedDirReader] = useState<string | null>(
    null
  );

  const handleUploadFiles = (
    e: React.ChangeEvent<HTMLInputElement>,
    isDir: boolean
  ) => {
    const files = e.target.files;
    if (files && RAGConfig) {
      const newFileMap = { ...fileMap };
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileID = Date.now() + "_" + file.name;
        
        // Skip hidden files and system files
        if (file.name.startsWith(".")) continue;
        
        let selectedReader = isDir ? selectedDirReader : selectedFileReader;
        
        if (!selectedReader) {
          // Auto-detect reader based on file extension
          const extension = file.name.split(".").pop()?.toLowerCase();
          const readers = Object.entries(RAGConfig["Reader"].components);
          
          for (const [key, component] of readers) {
            if (component.type !== "URL" && component.config?.extensions?.value?.includes(extension)) {
              selectedReader = component.name;
              break;
            }
          }
          
          if (!selectedReader) {
            selectedReader = RAGConfig["Reader"].selected;
          }
        }
        
        newFileMap[fileID] = {
          fileID: fileID,
          filename: file.name,
          extension: file.name.split(".").pop() || "",
          status: "READY",
          rag_config: {
            ...RAGConfig,
            Reader: {
              ...RAGConfig["Reader"],
              selected: selectedReader || RAGConfig["Reader"].selected,
            },
          },
          isURL: false,
          file: file,
        };
      }
      
      setFileMap(newFileMap);
      addStatusMessage(`Added ${files.length} file(s)`, "SUCCESS");
      
      // Reset selected readers
      setSelectedFileReader(null);
      setSelectedDirReader(null);
    }
    
    // Clear the input
    e.target.value = "";
  };

  const handleAddURL = (readerName: string) => {
    const url = prompt("Enter URL:");
    if (url && RAGConfig) {
      const fileID = Date.now() + "_url";
      const newFileMap = { ...fileMap };
      
      newFileMap[fileID] = {
        fileID: fileID,
        filename: url,
        extension: "url",
        status: "READY",
        rag_config: {
          ...RAGConfig,
          Reader: {
            ...RAGConfig["Reader"],
            selected: readerName,
          },
        },
        isURL: true,
      };
      
      setFileMap(newFileMap);
      addStatusMessage("Added URL", "SUCCESS");
    }
  };

  const fileCount = Object.keys(fileMap).length;
  const readyCount = Object.values(fileMap).filter(f => f.status === "READY").length;
  const processingCount = Object.values(fileMap).filter(
    f => f.status !== "READY" && f.status !== "DONE" && f.status !== "ERROR"
  ).length;
  const doneCount = Object.values(fileMap).filter(f => f.status === "DONE").length;
  const errorCount = Object.values(fileMap).filter(f => f.status === "ERROR").length;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="bg-bg-alt-verba rounded-2xl flex gap-2 p-4 items-center justify-between">
        <div className="hidden lg:flex justify-start">
          <InfoComponent
            tooltip_text="Upload your data through this interface into Verba. You can select individual files, directories or add URL to fetch data from."
            display_text="File Selection"
          />
        </div>
        <div className="flex gap-3 justify-center lg:justify-end">
          {/* Files Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <VerbaButton
                title="Files"
                Icon={IoMdAddCircle}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              {RAGConfig &&
                Object.entries(RAGConfig["Reader"].components)
                  .filter(([key, component]) => component.type !== "URL")
                  .map(([key, component]) => (
                    <DropdownMenuItem
                      key={"File_" + component.name + key}
                      onClick={() => {
                        setSelectedFileReader(component.name);
                        document.getElementById("files_upload")?.click();
                      }}
                    >
                      {component.name}
                    </DropdownMenuItem>
                  ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            id="files_upload"
            type="file"
            onChange={(e) => handleUploadFiles(e, false)}
            className="hidden"
            multiple
          />

          {/* Directory Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <VerbaButton title="Directory" Icon={GoFileDirectoryFill} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              {RAGConfig &&
                Object.entries(RAGConfig["Reader"].components)
                  .filter(([key, component]) => component.type !== "URL")
                  .map(([key, component]) => (
                    <DropdownMenuItem
                      key={"Dir_" + component.name + key}
                      onClick={() => {
                        setSelectedDirReader(component.name);
                        document.getElementById("dir_upload")?.click();
                      }}
                    >
                      {component.name}
                    </DropdownMenuItem>
                  ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={ref}
            id="dir_upload"
            type="file"
            onChange={(e) => handleUploadFiles(e, true)}
            className="hidden"
            multiple
          />

          {/* URL Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <VerbaButton title="URL" Icon={IoMdAddCircle} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              {RAGConfig &&
                Object.entries(RAGConfig["Reader"].components)
                  .filter(([key, component]) => component.type === "URL")
                  .map(([key, component]) => (
                    <DropdownMenuItem
                      key={"URL_" + component.name + key}
                      onClick={() => handleAddURL(component.name)}
                    >
                      {component.name}
                    </DropdownMenuItem>
                  ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <VerbaButton
            title="Clear All"
            Icon={MdCancel}
            onClick={openDeleteModal}
            disabled={fileCount === 0}
            selected_color="bg-warning-verba"
          />
        </div>
      </div>

      {/* File List */}
      <div className="bg-bg-alt-verba rounded-2xl flex flex-col gap-2 p-4 max-h-[50vh] overflow-y-auto">
        {fileCount === 0 ? (
          <div className="text-center text-text-alt-verba py-8">
            No files selected. Use the buttons above to add files, directories, or URLs.
          </div>
        ) : (
          <>
            {/* Status Summary */}
            <div className="flex gap-2 mb-2 text-sm">
              <span className="text-text-alt-verba">Total: {fileCount}</span>
              {readyCount > 0 && <span className="text-blue-500">Ready: {readyCount}</span>}
              {processingCount > 0 && <span className="text-yellow-500">Processing: {processingCount}</span>}
              {doneCount > 0 && <span className="text-green-500">Done: {doneCount}</span>}
              {errorCount > 0 && <span className="text-red-500">Error: {errorCount}</span>}
            </div>
            
            {/* File Components */}
            {Object.values(fileMap).map((fileData) => (
              <FileComponent
                key={fileData.fileID}
                fileData={fileData}
                fileMap={fileMap}
                handleDeleteFile={handleDeleteFile}
                selectedFileData={selectedFileData}
                setSelectedFileData={setSelectedFileData}
              />
            ))}
          </>
        )}
      </div>

      {/* Import Buttons */}
      {fileCount > 0 && (
        <div className="bg-bg-alt-verba rounded-2xl flex gap-2 p-4 items-center justify-between">
          <div className="flex gap-2">
            <VerbaButton
              title="Import Selected"
              Icon={FaFileImport}
              onClick={importSelected}
              disabled={!selectedFileData || socketStatus === "OFFLINE"}
              selected={true}
              selected_color="bg-primary-verba"
            />
            <VerbaButton
              title="Import All"
              Icon={FaFileImport}
              onClick={importAll}
              disabled={fileCount === 0 || socketStatus === "OFFLINE"}
              selected={true}
              selected_color="bg-secondary-verba"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button
              className={`flex gap-2 items-center px-3 py-2 rounded-lg ${
                socketStatus === "ONLINE"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
              onClick={reconnect}
              disabled={socketStatus === "ONLINE"}
            >
              <TbPlugConnected size={15} />
              <p>{socketStatus === "ONLINE" ? "Connected" : "Reconnecting..."}</p>
              {socketStatus === "OFFLINE" && (
                <span className="animate-pulse">●</span>
              )}
            </button>
          </div>
        </div>
      )}

      <UserModalComponent
        open={deleteAllModalOpen}
        onOpenChange={setDeleteAllModalOpen}
        title="Clear all files?"
        text="Do you want to clear all files from your selection?"
        triggerString="Clear All"
        triggerValue={null}
        triggerAccept={handleDeleteFile}
      />
    </div>
  );
};

export default FileSelectionView;