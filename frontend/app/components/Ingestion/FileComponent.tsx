"use client";

import React from "react";
import { FileData, FileMap, statusTextMap } from "@/app/types";
import { FaTrash } from "react-icons/fa";
import { FaCheckCircle } from "react-icons/fa";
import { MdError } from "react-icons/md";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

import VerbaButton from "../Navigation/VerbaButton";

interface FileComponentProps {
  fileData: FileData;
  fileMap: FileMap;
  handleDeleteFile: (name: string) => void;
  selectedFileData: string | null;
  setSelectedFileData: (f: string | null) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({
  fileData,
  fileMap,
  handleDeleteFile,
  selectedFileData,
  setSelectedFileData,
}) => {
  const [openDelete, setOpenDelete] = React.useState(false);

  return (
    <div className="flex items-center gap-2 w-full">
      {fileMap[fileData.fileID].status != "READY" ? (
        <div className="flex gap-2">
          {fileMap[fileData.fileID].status != "DONE" &&
            fileMap[fileData.fileID].status != "ERROR" && (
              <VerbaButton
                title={statusTextMap[fileMap[fileData.fileID].status]}
                className="w-[120px]"
              />
            )}
          {fileMap[fileData.fileID].status == "DONE" && (
            <VerbaButton
              title={statusTextMap[fileMap[fileData.fileID].status]}
              Icon={FaCheckCircle}
              selected={true}
              className="w-[120px]"
              selected_color={"bg-secondary-verba"}
            />
          )}
          {fileMap[fileData.fileID].status == "ERROR" && (
            <VerbaButton
              title={statusTextMap[fileMap[fileData.fileID].status]}
              Icon={MdError}
              className="w-[120px]"
              selected={true}
              selected_color={"bg-warning-verba"}
            />
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <VerbaButton
            title={fileMap[fileData.fileID].rag_config["Reader"].selected}
            className="w-[120px]"
            text_class_name="truncate w-[100px]"
          />
        </div>
      )}

      <VerbaButton
        title={
          fileMap[fileData.fileID].filename
            ? fileMap[fileData.fileID].filename
            : "No Filename"
        }
        selected={selectedFileData === fileMap[fileData.fileID].fileID}
        selected_color="bg-secondary-verba"
        className="flex-grow"
        text_class_name="truncate max-w-[150px] lg:max-w-[300px]"
        onClick={() => {
          setSelectedFileData(fileData.fileID);
        }}
      />

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogTrigger asChild>
          <div>
            <VerbaButton
              Icon={FaTrash}
              className="w-[50px]"
              selected={selectedFileData === fileMap[fileData.fileID].fileID}
              selected_color="bg-warning-verba"
            />
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove File</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap">
            {fileMap[fileData.fileID].isURL
              ? "Do you want to remove the URL?"
              : `Do you want to remove ${fileMap[fileData.fileID].filename} from the selection?`}
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <VerbaButton
              title="Cancel"
              selected
              selected_color="bg-warning-verba"
              onClick={() => setOpenDelete(false)}
            />
            <VerbaButton
              title="Delete"
              onClick={() => {
                setOpenDelete(false);
                handleDeleteFile(fileMap[fileData.fileID].fileID);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileComponent;
