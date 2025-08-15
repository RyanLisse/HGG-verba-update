'use client';

import type React from 'react';
import { useCallback } from 'react';
import { IoSettingsSharp } from 'react-icons/io5';
import { MdCancel } from 'react-icons/md';
import { updateRAGConfig } from '@/app/api';
import type { Credentials, RAGComponentConfig, RAGConfig } from '@/app/types';
import ComponentView from '../Ingestion/ComponentView';

import VerbaButton from '../Navigation/VerbaButton';

type ChatConfigProps = {
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  onSave: () => void; // New parameter for handling save
  onReset: () => void; // New parameter for handling reset
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
  credentials: Credentials;
  production: 'Local' | 'Demo' | 'Production';
};

const ChatConfig: React.FC<ChatConfigProps> = ({
  RAGConfig,
  setRAGConfig,
  addStatusMessage,
  onSave,
  credentials,
  onReset,
  production,
}) => {
  const updateConfig = (
    component_n: string,
    configTitle: string,
    value: string | boolean | string[]
  ) => {
    setRAGConfig((prevRAGConfig) => {
      if (prevRAGConfig?.[component_n]) {
        const newRAGConfig = { ...prevRAGConfig };
        const component = newRAGConfig[component_n];
        if (
          component?.components &&
          component.selected &&
          component.components[component.selected]
        ) {
          const selectedComponent = component.components[component.selected];
          if (selectedComponent?.config?.[configTitle]) {
            if (typeof value === 'string' || typeof value === 'boolean') {
              selectedComponent.config[configTitle].value = value;
            } else {
              selectedComponent.config[configTitle].values = value;
            }
          }
        }
        return newRAGConfig;
      }
      return prevRAGConfig;
    });
  };

  const selectComponent = (component_n: string, selected_component: string) => {
    setRAGConfig((prevRAGConfig) => {
      if (prevRAGConfig) {
        const newRAGConfig = { ...prevRAGConfig };
        if (newRAGConfig[component_n]) {
          newRAGConfig[component_n].selected = selected_component;
        }
        return newRAGConfig;
      }
      return prevRAGConfig;
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

      addStatusMessage(`Saving ${selected_component} Config`, 'SUCCESS');

      const newRAGConfig = JSON.parse(JSON.stringify(RAGConfig));
      newRAGConfig[component_n].selected = selected_component;
      newRAGConfig[component_n].components[selected_component] =
        component_config;
      const response = await updateRAGConfig(newRAGConfig, credentials);
      if (response) {
        setRAGConfig(newRAGConfig);
      }
    },
    [RAGConfig, addStatusMessage, credentials, setRAGConfig]
  );

  if (RAGConfig) {
    return (
      <div className="flex w-full flex-col justify-start rounded-2xl p-4">
        <div className="sticky top-0 z-20 flex w-full flex-col justify-end gap-2">
          {/* Add Save and Reset buttons */}
          <div className="flex w-full justify-end gap-2 rounded-lg bg-bg-alt-verba p-4">
            <VerbaButton
              disabled={production === 'Demo'}
              Icon={IoSettingsSharp}
              onClick={onSave}
              title="Save Config"
            />
            <VerbaButton
              disabled={production === 'Demo'}
              Icon={MdCancel}
              onClick={onReset}
              title="Reset"
            />
          </div>
        </div>

        <div className="flex w-full flex-col justify-start gap-3 rounded-2xl p-6">
          <ComponentView
            blocked={production === 'Demo'}
            component_name="Embedder"
            RAGConfig={RAGConfig}
            saveComponentConfig={saveComponentConfig}
            selectComponent={selectComponent}
            updateConfig={updateConfig}
          />
          <ComponentView
            blocked={production === 'Demo'}
            component_name="Generator"
            RAGConfig={RAGConfig}
            saveComponentConfig={saveComponentConfig}
            selectComponent={selectComponent}
            updateConfig={updateConfig}
          />
          <ComponentView
            blocked={production === 'Demo'}
            component_name="Retriever"
            RAGConfig={RAGConfig}
            saveComponentConfig={saveComponentConfig}
            selectComponent={selectComponent}
            updateConfig={updateConfig}
          />
        </div>
      </div>
    );
  }
  return <div />;
};

export default ChatConfig;
