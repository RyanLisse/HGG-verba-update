"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileData,
  FileMap,
  statusTextMap,
  statusColorMap,
  RAGComponentConfig,
} from "@/app/types";
import VerbaButton from "../Navigation/VerbaButton";
import { MdCancel } from "react-icons/md";
import { IoAddCircleSharp } from "react-icons/io5";
import { CgDebug } from "react-icons/cg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Separator } from "@/app/components/ui/separator";

import ComponentView from "./ComponentView";

import { MdError } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";

interface BasicSettingViewProps {
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
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;
}

const BasicSettingView: React.FC<BasicSettingViewProps> = ({
  selectedFileData,
  fileMap,
  selectComponent,
  updateConfig,
  saveComponentConfig,
  setFileMap,
  blocked,
  addStatusMessage,
}) => {
  const [filename, setFilename] = useState("");
  const [source, setSource] = useState("");
  const [metadata, setMetadata] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (selectedFileData) {
      setFilename(fileMap[selectedFileData].filename);
      setSource(fileMap[selectedFileData].source);
      setMetadata(fileMap[selectedFileData].metadata);
    }
  }, [fileMap, selectedFileData]);

  const updateFileMap = useCallback(
    (key: "filename" | "source" | "metadata", value: string) => {
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
      updateFileMap("filename", newFilename);
    },
    [updateFileMap]
  );

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSource = e.target.value;
      setSource(newSource);
      updateFileMap("source", newSource);
    },
    [updateFileMap]
  );

  const handleMetadataChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newMetadata = e.target.value;
      setMetadata(newMetadata);
      updateFileMap("metadata", newMetadata);
    },
    [updateFileMap]
  );

  const [debugOpen, setDebugOpen] = useState(false);

  const formatByteSize = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
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
      setLabel("");
    }
  };

  const removeLabel = (l: string) => {
    if (
      selectedFileData &&
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
      setLabel("");
    }
  };

  function renderLabelBoxes(fileData: FileData) {
    return Object.entries(fileData.labels).map(([key, label]) => (
      <div key={fileData.fileID + key + label}>
        <VerbaButton
          title={label}
          size="sm"
          text_class_name="text-xs"
          onClick={() => {
            removeLabel(label);
          }}
          Icon={MdCancel}
        />
      </div>
    ));
  }

  if (selectedFileData) {
    return (
      <div className="flex flex-col justify-start gap-3 rounded-2xl p-1 w-full ">
        {selectedFileData && fileMap[selectedFileData].status != "READY" && (
          <>
            <div className="text-text-alt-verba font-semibold">Import Status</div>
            <Separator className="my-1" />
          </>
        )}

        <div className="flex flex-col gap-3 text-text-verba">
          {selectedFileData &&
            Object.entries(fileMap[selectedFileData].status_report).map(
              ([status, statusReport]) => (
                <div className="flex" key={"Status" + status}>
                  <p className="flex min-w-[8vw] gap-2 items-center text-text-verba">
                    {statusReport.status === "DONE" && (
                      <FaCheckCircle size={15} />
                    )}
                    {statusReport.status === "ERROR" && <MdError size={15} />}
                    {statusTextMap[statusReport.status]}
                  </p>
                  <Input
                    value={
                      statusReport.took != 0
                        ? statusReport.message + ` (${statusReport.took}s)`
                        : statusReport.message
                    }
                    disabled
                    className={`${statusColorMap[statusReport.status]} bg-bg-verba`}
                  />
                </div>
              )
            )}
        </div>

        <ComponentView
          RAGConfig={fileMap[selectedFileData].rag_config}
          component_name="Reader"
          selectComponent={selectComponent}
          updateConfig={updateConfig}
          skip_component={true}
          saveComponentConfig={saveComponentConfig}
          blocked={fileMap[selectedFileData].block}
        />

        <div className="text-text-alt-verba font-semibold">File Settings</div>
        <Separator className="my-1" />

        {/* Filename */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Title</p>
          <Input
            value={filename}
            onChange={handleFilenameChange}
            disabled={blocked}
            className="w-full bg-bg-verba"
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            Add a Title to the document. If you are adding a URL, all URL will
            have a have their corresponding URL as filename.
          </p>
        </div>

        {/* Source */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Source Link</p>
          <Input
            value={source}
            onChange={handleSourceChange}
            disabled={blocked}
            className="w-full bg-bg-verba"
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            Add a link to reference the original source of the document. You can
            access it through the Document Explorer via the View Source button
          </p>
        </div>

        {/* Labels */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Labels</p>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLabel(label);
              }
            }}
            disabled={blocked}
            title={label}
            className="w-full bg-bg-verba"
          />
          <VerbaButton
            title="Add"
            Icon={IoAddCircleSharp}
            onClick={() => {
              addLabel(label);
            }}
            disabled={blocked}
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            Add or remove labels for Document Filtering
          </p>
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <div className="flex flex-wrap gap-2">
            {renderLabelBoxes(fileMap[selectedFileData])}
          </div>
        </div>

        {/* Overwrite */}
        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]">Overwrite</p>
          <Checkbox
            onCheckedChange={(c) => setOverwrite(Boolean(c))}
            checked={selectedFileData ? fileMap[selectedFileData].overwrite : false}
            disabled={blocked}
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            Overwrite existing documents with the same name.
          </p>
        </div>

        <div className="text-text-alt-verba font-semibold">Metadata</div>
        <Separator className="my-1" />

        {/* Metadata */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Metadata</p>
          <Textarea
            className="grow w-full max-h-64 bg-bg-verba"
            value={metadata}
            onChange={handleMetadataChange}
            disabled={blocked}
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            Add metadata to the document to improve retrieval and generation.
            Metadata will added to the context sent to the embedding and
            generation, to influcence the results.
          </p>
        </div>

        <div className="text-text-alt-verba font-semibold">File Information</div>
        <Separator className="my-1" />

        {/* Extension */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Extension</p>
          <Input
            value={fileMap[selectedFileData].extension}
            disabled={true}
            className="w-full bg-bg-verba"
          />
        </div>

        {/* File Size */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">File Size</p>
          <Input
            value={formatByteSize(fileMap[selectedFileData].file_size)}
            disabled={true}
            className="w-full bg-bg-verba"
          />
        </div>

        <div className="text-text-alt-verba font-semibold">Ingestion Pipeline</div>
        <Separator className="my-1" />

        {/* Reader */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Reader</p>
          <Input
            value={fileMap[selectedFileData].rag_config["Reader"].selected}
            disabled={true}
            className="w-full bg-bg-verba"
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            {selectedFileData &&
              fileMap[selectedFileData].rag_config["Reader"].components[
                fileMap[selectedFileData].rag_config["Reader"].selected
              ].description}
          </p>
        </div>

        {/* Chunker */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Chunker</p>
          <Input
            value={fileMap[selectedFileData].rag_config["Chunker"].selected}
            disabled={true}
            className="w-full bg-bg-verba"
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            {selectedFileData &&
              fileMap[selectedFileData].rag_config["Chunker"].components[
                fileMap[selectedFileData].rag_config["Chunker"].selected
              ].description}
          </p>
        </div>

        {/* Embedder */}
        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Embedder</p>
          <Input
            value={fileMap[selectedFileData].rag_config["Embedder"].selected}
            disabled={true}
            className="w-full bg-bg-verba"
          />
        </div>

        <div className="flex gap-2 items-center text-text-verba">
          <p className="flex min-w-[8vw]"></p>
          <p className="text-sm text-text-alt-verba text-start">
            {selectedFileData &&
              fileMap[selectedFileData].rag_config["Embedder"].components[
                fileMap[selectedFileData].rag_config["Embedder"].selected
              ].description}
          </p>
        </div>

        <Separator className="my-2" />

        <div className="flex gap-2 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">Debug</p>
          <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
            <DialogTrigger asChild>
              <div>
                <VerbaButton Icon={CgDebug} className="max-w-min" />
              </div>
            </DialogTrigger>
            <DialogContent className="min-w-fit">
              <DialogHeader>
                <DialogTitle>Debugging File Configuration</DialogTitle>
              </DialogHeader>
              <pre className="whitespace-pre-wrap text-xs">
                {selectedFileData
                  ? (() => {
                      const objCopy = { ...fileMap[selectedFileData] };
                      objCopy.content = "File Content";
                      return JSON.stringify(objCopy, null, 2);
                    })()
                  : ""}
              </pre>
            </DialogContent>
          </Dialog>
        </div>

        {/* Debug dialog migrated to shadcn/ui Dialog above */}
      </div>
    );
  } else {
    return <div></div>;
  }
};

export default BasicSettingView;
