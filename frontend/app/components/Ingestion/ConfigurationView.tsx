"use client";

import React, { useState, useCallback } from "react";
import InfoComponent from "../Navigation/InfoComponent";
import { MdCancel } from "react-icons/md";
import { IoSettingsSharp } from "react-icons/io5";
import { VscSaveAll } from "react-icons/vsc";
import { FaHammer } from "react-icons/fa";

import { updateRAGConfig } from "@/app/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

import { FileMap, FileData } from "@/app/types";
import { RAGConfig } from "@/app/types";

import { Credentials, RAGComponentConfig } from "@/app/types";

import VerbaButton from "../Navigation/VerbaButton";

import BasicSettingView from "./BasicSettingView";
import ComponentView from "./ComponentView";

interface ConfigurationViewProps {
  selectedFileData: string | null;
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  setSelectedFileData: (f: string | null) => void;
  fileMap: FileMap;
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;

  setFileMap: React.Dispatch<React.SetStateAction<FileMap>>;
}

const ConfigurationView: React.FC<ConfigurationViewProps> = ({
  selectedFileData,
  fileMap,
  addStatusMessage,
  setFileMap,
  RAGConfig,
  setRAGConfig,
  setSelectedFileData,
  credentials,
}) => {
  const [selectedSetting, setSelectedSetting] = useState<
    "Basic" | "Pipeline" | "Metadata"
  >("Basic");

  const applyToAll = () => {
    addStatusMessage("Applying config to all files", "INFO");
    setFileMap((prevFileMap) => {
      if (selectedFileData) {
        const newRAGConfig: RAGConfig = JSON.parse(
          JSON.stringify(prevFileMap[selectedFileData].rag_config)
        );
        const newFileMap: FileMap = { ...prevFileMap };

        for (const fileID in prevFileMap) {
          const newFileData: FileData = JSON.parse(
            JSON.stringify(prevFileMap[fileID])
          );
          newFileData.rag_config = newRAGConfig;
          newFileData.source = prevFileMap[selectedFileData].source;
          newFileData.labels = prevFileMap[selectedFileData].labels;
          newFileData.overwrite = prevFileMap[selectedFileData].overwrite;
          newFileMap[fileID] = newFileData;
        }
        return newFileMap;
      }
      return prevFileMap;
    });
  };

  const setAsDefault = async () => {
    addStatusMessage("Setting current config as default", "SUCCESS");
    if (selectedFileData) {
      const response = await updateRAGConfig(
        fileMap[selectedFileData].rag_config,
        credentials
      );
      if (response) {
        // Update local state if the API call was successful
        setRAGConfig(fileMap[selectedFileData].rag_config);
        // You might want to show a success message to the user
      } else {
        // Handle error
        console.error("Failed to set RAG config:");
      }
    }
  };

  const resetConfig = () => {
    addStatusMessage("Resetting pipeline settings", "WARNING");
    setFileMap((prevFileMap) => {
      if (selectedFileData && RAGConfig) {
        const newFileMap: FileMap = { ...prevFileMap };
        const newFileData: FileData = JSON.parse(
          JSON.stringify(prevFileMap[selectedFileData])
        );
        newFileData.rag_config = RAGConfig;
        newFileMap[selectedFileData] = newFileData;
        return newFileMap;
      }
      return prevFileMap;
    });
  };

  const [applyOpen, setApplyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [defaultOpen, setDefaultOpen] = useState(false);

  const updateConfig = useCallback(
    (
      component_n: string,
      configTitle: string,
      value: string | boolean | string[]
    ) => {
      setFileMap((prevFileMap) => {
        if (selectedFileData) {
          const newFileMap = { ...prevFileMap };
          const selectedFile = newFileMap[selectedFileData];
          const componentConfig =
            selectedFile.rag_config[component_n].components[
              selectedFile.rag_config[component_n].selected
            ].config;

          // Update the specific config value directly
          if (typeof value === "string" || typeof value === "boolean") {
            componentConfig[configTitle].value = value;
          } else {
            componentConfig[configTitle].values = value;
          }

          return newFileMap;
        }
        return prevFileMap;
      });
    },
    [selectedFileData]
  );

  const selectComponent = (component_n: string, selected_component: string) => {
    setFileMap((prevFileMap) => {
      if (selectedFileData) {
        const newFileData: FileData = JSON.parse(
          JSON.stringify(prevFileMap[selectedFileData])
        );
        const newRAGConfig: RAGConfig = JSON.parse(
          JSON.stringify(prevFileMap[selectedFileData].rag_config)
        );
        newRAGConfig[component_n].selected = selected_component;
        newFileData.rag_config = newRAGConfig;
        const newFileMap: FileMap = { ...prevFileMap };
        newFileMap[selectedFileData] = newFileData;
        return newFileMap;
      }
      return prevFileMap;
    });
  };

  const saveComponentConfig = useCallback(
    async (
      component_n: string,
      selected_component: string,
      component_config: RAGComponentConfig
    ) => {
      if (!RAGConfig) return;

      addStatusMessage("Saving " + selected_component + " config", "SUCCESS");

      const newRAGConfig = JSON.parse(JSON.stringify(RAGConfig));
      newRAGConfig[component_n].selected = selected_component;
      newRAGConfig[component_n].components[selected_component] =
        component_config;
      const response = await updateRAGConfig(newRAGConfig, credentials);
      if (response) {
        setRAGConfig(newRAGConfig);
      }
    },
    [RAGConfig, credentials]
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* FileSelection Header */}
      <div className="bg-bg-alt-verba rounded-2xl flex gap-2 p-6 items-center justify-between h-min w-full">
        <div className="flex gap-2 justify-start ">
          <InfoComponent
            tooltip_text="Configure all import settings related to chunking, embedding, adding meta data and more. You can save made changes individually or apply them to all other files"
            display_text="Import Config"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <VerbaButton
            title="Overview"
            selected={selectedSetting === "Basic"}
            selected_color="bg-secondary-verba"
            onClick={() => {
              setSelectedSetting("Basic");
            }}
            Icon={IoSettingsSharp}
          />

          <VerbaButton
            title="Config"
            selected={selectedSetting === "Pipeline"}
            selected_color="bg-secondary-verba"
            onClick={() => {
              setSelectedSetting("Pipeline");
            }}
            Icon={FaHammer}
          />

          <VerbaButton
            onClick={() => {
              setSelectedFileData(null);
            }}
            Icon={MdCancel}
          />
        </div>
      </div>

      {/* File List */}
      <div className="bg-bg-alt-verba rounded-2xl flex flex-col p-6 items-center h-full w-full overflow-auto">
        {selectedSetting === "Basic" && (
          <BasicSettingView
            selectedFileData={selectedFileData}
            addStatusMessage={addStatusMessage}
            fileMap={fileMap}
            selectComponent={selectComponent}
            updateConfig={updateConfig}
            saveComponentConfig={saveComponentConfig}
            setFileMap={setFileMap}
            blocked={
              selectedFileData
                ? fileMap[selectedFileData].block ?? false
                : undefined
            }
          />
        )}
        {selectedSetting === "Pipeline" && selectedFileData && (
          <div className="flex flex-col gap-10 w-full">
            <ComponentView
              RAGConfig={fileMap[selectedFileData].rag_config}
              component_name="Chunker"
              selectComponent={selectComponent}
              updateConfig={updateConfig}
              saveComponentConfig={saveComponentConfig}
              blocked={fileMap[selectedFileData].block}
              skip_component={false}
            />
            <ComponentView
              RAGConfig={fileMap[selectedFileData].rag_config}
              component_name="Embedder"
              selectComponent={selectComponent}
              updateConfig={updateConfig}
              saveComponentConfig={saveComponentConfig}
              blocked={fileMap[selectedFileData].block}
              skip_component={false}
            />
          </div>
        )}
      </div>

      {/* Import Footer */}
      <div className="bg-bg-alt-verba rounded-2xl flex gap-2 p-6 items-center justify-end h-min w-full">
        <div className="flex gap-3 justify-end">
          <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
            <DialogTrigger asChild>
              <div>
                <VerbaButton title="Apply to All" Icon={VscSaveAll} />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply Pipeline Settings</DialogTitle>
              </DialogHeader>
              <p>Apply Pipeline Settings to all files?</p>
              <div className="flex gap-2 justify-end pt-2">
                <VerbaButton
                  title="Cancel"
                  selected
                  selected_color="bg-warning-verba"
                  onClick={() => setApplyOpen(false)}
                />
                <VerbaButton
                  title="Apply"
                  onClick={() => {
                    setApplyOpen(false);
                    applyToAll();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={defaultOpen} onOpenChange={setDefaultOpen}>
            <DialogTrigger asChild>
              <div>
                <VerbaButton title="Save Config" Icon={IoSettingsSharp} />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Default</DialogTitle>
              </DialogHeader>
              <p>Set current pipeline settings as default for future files?</p>
              <div className="flex gap-2 justify-end pt-2">
                <VerbaButton
                  title="Cancel"
                  selected
                  selected_color="bg-warning-verba"
                  onClick={() => setDefaultOpen(false)}
                />
                <VerbaButton
                  title="Set"
                  onClick={() => {
                    setDefaultOpen(false);
                    setAsDefault();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <div>
                <VerbaButton title="Reset" Icon={MdCancel} />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Setting</DialogTitle>
              </DialogHeader>
              <p>Reset pipeline settings of this file?</p>
              <div className="flex gap-2 justify-end pt-2">
                <VerbaButton
                  title="Cancel"
                  selected
                  selected_color="bg-warning-verba"
                  onClick={() => setResetOpen(false)}
                />
                <VerbaButton
                  title="Reset"
                  onClick={() => {
                    setResetOpen(false);
                    resetConfig();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationView;
