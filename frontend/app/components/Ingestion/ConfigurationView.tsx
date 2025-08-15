'use client';

import type React from 'react';
import { useCallback, useState } from 'react';
import { FaHammer } from 'react-icons/fa';
import { IoSettingsSharp } from 'react-icons/io5';
import { MdCancel } from 'react-icons/md';
import { VscSaveAll } from 'react-icons/vsc';
import { updateRAGConfig } from '@/app/api';
import type {
  Credentials,
  FileData,
  FileMap,
  RAGComponentConfig,
  RAGConfig,
} from '@/app/types';
import InfoComponent from '../Navigation/InfoComponent';
import UserModalComponent from '../Navigation/UserModal';

import VerbaButton from '../Navigation/VerbaButton';

import BasicSettingView from './BasicSettingView';
import ComponentView from './ComponentView';

type ConfigurationViewProps = {
  selectedFileData: string | null;
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  setSelectedFileData: (f: string | null) => void;
  fileMap: FileMap;
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;

  setFileMap: React.Dispatch<React.SetStateAction<FileMap>>;
};

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
    'Basic' | 'Pipeline' | 'Metadata'
  >('Basic');

  const applyToAll = () => {
    addStatusMessage('Applying config to all files', 'INFO');
    setFileMap((prevFileMap) => {
      if (selectedFileData && prevFileMap[selectedFileData]) {
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
    addStatusMessage('Setting current config as default', 'SUCCESS');
    if (selectedFileData && fileMap[selectedFileData]) {
      const response = await updateRAGConfig(
        fileMap[selectedFileData].rag_config,
        credentials
      );
      if (response) {
        // Update local state if the API call was successful
        setRAGConfig(fileMap[selectedFileData].rag_config);
        // You might want to show a success message to the user
      } else {
      }
    }
  };

  const resetConfig = () => {
    addStatusMessage('Resetting pipeline settings', 'WARNING');
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

  const openApplyAllModal = () => {
    const modal = document.getElementById('apply_setting_to_all');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  const openResetModal = () => {
    const modal = document.getElementById('reset_Setting');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

  const openDefaultModal = () => {
    const modal = document.getElementById('set_default_settings');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  };

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

          // Add null check for selectedFile
          if (!selectedFile) {
            return prevFileMap;
          }

          // Check if rag_config and component exist
          const ragComponent = selectedFile.rag_config?.[component_n];
          if (
            !ragComponent ||
            !ragComponent.components ||
            !ragComponent.selected
          ) {
            return prevFileMap;
          }

          const componentConfig =
            ragComponent.components[ragComponent.selected]?.config;
          if (!componentConfig) {
            return prevFileMap;
          }

          // Update the specific config value directly
          const configItem = componentConfig[configTitle];
          if (!configItem) {
            return prevFileMap;
          }

          if (typeof value === 'string' || typeof value === 'boolean') {
            configItem.value = value;
          } else {
            configItem.values = value;
          }

          return newFileMap;
        }
        return prevFileMap;
      });
    },
    [selectedFileData, setFileMap]
  );

  const selectComponent = (component_n: string, selected_component: string) => {
    setFileMap((prevFileMap) => {
      if (selectedFileData && prevFileMap[selectedFileData]) {
        const newFileData: FileData = JSON.parse(
          JSON.stringify(prevFileMap[selectedFileData])
        );
        const newRAGConfig: RAGConfig = JSON.parse(
          JSON.stringify(prevFileMap[selectedFileData].rag_config)
        );

        // Check if component exists in RAG config
        if (!newRAGConfig[component_n]) {
          return prevFileMap;
        }

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
      if (!RAGConfig) {
        return;
      }

      addStatusMessage(`Saving ${selected_component} config`, 'SUCCESS');

      const newRAGConfig = JSON.parse(JSON.stringify(RAGConfig));
      newRAGConfig[component_n].selected = selected_component;
      newRAGConfig[component_n].components[selected_component] =
        component_config;
      const response = await updateRAGConfig(newRAGConfig, credentials);
      if (response) {
        setRAGConfig(newRAGConfig);
      }
    },
    [RAGConfig, credentials, addStatusMessage, setRAGConfig]
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {/* FileSelection Header */}
      <div className="flex h-min w-full items-center justify-between gap-2 rounded-2xl bg-bg-alt-verba p-6">
        <div className="flex justify-start gap-2">
          <InfoComponent
            display_text="Import Config"
            tooltip_text="Configure all import settings related to chunking, embedding, adding meta data and more. You can save made changes individually or apply them to all other files"
          />
        </div>
        <div className="flex justify-end gap-3">
          <VerbaButton
            Icon={IoSettingsSharp}
            onClick={() => {
              setSelectedSetting('Basic');
            }}
            selected={selectedSetting === 'Basic'}
            selected_color="bg-secondary-verba"
            title="Overview"
          />

          <VerbaButton
            Icon={FaHammer}
            onClick={() => {
              setSelectedSetting('Pipeline');
            }}
            selected={selectedSetting === 'Pipeline'}
            selected_color="bg-secondary-verba"
            title="Config"
          />

          <VerbaButton
            Icon={MdCancel}
            onClick={() => {
              setSelectedFileData(null);
            }}
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex h-full w-full flex-col items-center overflow-auto rounded-2xl bg-bg-alt-verba p-6">
        {selectedSetting === 'Basic' && (
          <BasicSettingView
            addStatusMessage={addStatusMessage}
            blocked={
              selectedFileData && fileMap[selectedFileData]
                ? (fileMap[selectedFileData].block ?? false)
                : undefined
            }
            fileMap={fileMap}
            saveComponentConfig={saveComponentConfig}
            selectComponent={selectComponent}
            selectedFileData={selectedFileData}
            setFileMap={setFileMap}
            updateConfig={updateConfig}
          />
        )}
        {selectedSetting === 'Pipeline' &&
          selectedFileData &&
          fileMap[selectedFileData] && (
            <div className="flex w-full flex-col gap-10">
              <ComponentView
                blocked={fileMap[selectedFileData].block}
                component_name="Chunker"
                RAGConfig={fileMap[selectedFileData].rag_config}
                saveComponentConfig={saveComponentConfig}
                selectComponent={selectComponent}
                skip_component={false}
                updateConfig={updateConfig}
              />
              <ComponentView
                blocked={fileMap[selectedFileData].block}
                component_name="Embedder"
                RAGConfig={fileMap[selectedFileData].rag_config}
                saveComponentConfig={saveComponentConfig}
                selectComponent={selectComponent}
                skip_component={false}
                updateConfig={updateConfig}
              />
            </div>
          )}
      </div>

      {/* Import Footer */}
      <div className="flex h-min w-full items-center justify-end gap-2 rounded-2xl bg-bg-alt-verba p-6">
        <div className="flex justify-end gap-3">
          <VerbaButton
            Icon={VscSaveAll}
            onClick={openApplyAllModal}
            title="Apply to All"
          />

          <VerbaButton
            Icon={IoSettingsSharp}
            onClick={openDefaultModal}
            title="Save Config"
          />

          <VerbaButton Icon={MdCancel} onClick={openResetModal} title="Reset" />
        </div>
      </div>
      <UserModalComponent
        modal_id={'apply_setting_to_all'}
        text={'Apply Pipeline Settings to all files?'}
        title={'Apply Pipeline Settings'}
        triggerAccept={applyToAll}
        triggerString="Apply"
        triggerValue={null}
      />
      <UserModalComponent
        modal_id={'reset_Setting'}
        text={'Reset pipeline settings of this file?'}
        title={'Reset Setting'}
        triggerAccept={resetConfig}
        triggerString="Reset"
        triggerValue={null}
      />

      <UserModalComponent
        modal_id={'set_default_settings'}
        text={'Set current pipeline settings as default for future files?'}
        title={'Set Default'}
        triggerAccept={setAsDefault}
        triggerString="Set"
        triggerValue={null}
      />
    </div>
  );
};

export default ConfigurationView;
