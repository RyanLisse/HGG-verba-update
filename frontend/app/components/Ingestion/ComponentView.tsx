'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { GoTriangleDown } from 'react-icons/go';
import { IoAddCircleSharp } from 'react-icons/io5';
import type { RAGComponentConfig, RAGConfig } from '@/app/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';


import VerbaButton from '../Navigation/VerbaButton';

export const MultiInput: React.FC<{
  component_name: string;
  values: string[];
  blocked: boolean | undefined;
  config_title: string;
  updateConfig: (
    component_n: string,
    configTitle: string,
    value: string | boolean | string[]
  ) => void;
}> = ({ values, config_title, updateConfig, component_name, blocked }) => {
  const [currentInput, setCurrentInput] = useState('');
  const [currentValues, setCurrentValues] = useState(values);

  useEffect(() => {
    updateConfig(component_name, config_title, currentValues);
  }, [component_name, config_title, currentValues, updateConfig]);

  const addValue = (v: string) => {
    if (!currentValues.includes(v)) {
      setCurrentValues((prev) => [...prev, v]);
      setCurrentInput('');
    }
  };

  const removeValue = (v: string) => {
    if (currentValues.includes(v)) {
      setCurrentValues((prev) => prev.filter((label) => label !== v));
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex justify-between gap-2">
        <label className="input flex w-full items-center gap-2 bg-bg-verba">
          <input
            className="w-full grow"
            disabled={blocked}
            onChange={(e) => {
              setCurrentInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addValue(currentInput);
              }
            }}
            type="text"
            value={currentInput}
          />
        </label>
        <button
          className="btn flex gap-2 border-none bg-button-verba text-text-verba hover:bg-secondary-verba"
          disabled={blocked}
          onClick={() => {
            addValue(currentInput);
          }}
        >
          <IoAddCircleSharp size={15} />
          <p>Add</p>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {values.map((value, index) => (
          <div
            className="flex w-full items-center justify-between rounded-xl bg-bg-verba p-2 text-center text-sm text-text-verba"
            key={value + index}
          >
            <div className="flex w-full items-center justify-center overflow-hidden">
              <p className="truncate" title={value}>
                {value}
              </p>
            </div>
            <button
              className="btn btn-sm btn-square ml-2 border-none bg-button-verba text-text-verba hover:bg-warning-verba"
              disabled={blocked}
              onClick={() => {
                removeValue(value);
              }}
            >
              <FaTrash size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

type ComponentViewProps = {
  RAGConfig: RAGConfig;
  blocked: boolean | undefined;
  component_name: 'Chunker' | 'Embedder' | 'Reader' | 'Generator' | 'Retriever';
  selectComponent: (component_n: string, selected_component: string) => void;
  skip_component?: boolean;
  updateConfig: (
    component_n: string,
    configTitle: string,
    value: string | boolean | string[]
  ) => void;
  saveComponentConfig: (
    component_n: string,
    selected_component: string,
    config: RAGComponentConfig
  ) => void;
};

const ComponentView: React.FC<ComponentViewProps> = ({
  RAGConfig,
  component_name,
  selectComponent,
  updateConfig,
  saveComponentConfig,
  blocked,
  skip_component,
}) => {

  if (
    RAGConfig[component_name]?.components &&
    RAGConfig[component_name]?.selected &&
    Object.entries(
      RAGConfig[component_name].components[RAGConfig[component_name].selected]
        ?.config || {}
    ).length === 0 &&
    skip_component
  ) {
    return <></>;
  }

  return (
    <div className="flex w-full flex-col justify-start gap-3 rounded-2xl p-1">
      <div className="flex items-center justify-between">
        <div className="divider grow text-text-alt-verba text-xs lg:text-sm">
          <p>{RAGConfig[component_name]?.selected || 'Unknown'} Settings</p>
          <VerbaButton
            onClick={() => {
              if (
                RAGConfig[component_name]?.selected &&
                RAGConfig[component_name]?.components
              ) {
                const selectedComponent =
                  RAGConfig[component_name].components[
                    RAGConfig[component_name].selected
                  ];
                if (selectedComponent) {
                  saveComponentConfig(
                    component_name,
                    RAGConfig[component_name].selected,
                    selectedComponent
                  );
                }
              }
            }}
            title="Save"
          />
        </div>
      </div>
      {/* Component */}
      {!skip_component && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-text-verba">
            <p className="flex min-w-[8vw] text-sm lg:text-base">
              {component_name}
            </p>
            <Select
              value={RAGConfig[component_name]?.selected || ''}
              onValueChange={(value) => {
                if (!blocked) {
                  selectComponent(component_name, value);
                }
              }}
              disabled={blocked}
            >
              <SelectTrigger className="w-full bg-button-verba text-text-verba hover:bg-button-hover-verba">
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                {RAGConfig[component_name]?.components &&
                  Object.entries(RAGConfig[component_name].components)
                    .filter(([, component]) => component.available)
                    .map(([, component]) => (
                      <SelectItem
                        key={`ComponentDropdown_${component.name}`}
                        value={component.name}
                      >
                        <div className="flex flex-col">
                          <span>{component.name}</span>
                          {component.description && (
                            <span className="text-xs text-muted-foreground">
                              {component.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-text-verba">
            <p className="flex min-w-[8vw]" />
            <p className="text-start text-text-alt-verba text-xs lg:text-sm">
              {RAGConfig[component_name]?.selected &&
              RAGConfig[component_name]?.components
                ? RAGConfig[component_name].components[
                    RAGConfig[component_name].selected
                  ]?.description || 'No description'
                : 'No description'}
            </p>
          </div>
        </div>
      )}

      {RAGConfig[component_name]?.selected &&
      RAGConfig[component_name]?.components &&
      RAGConfig[component_name].components[RAGConfig[component_name].selected]
        ?.config
        ? Object.entries(
            RAGConfig[component_name].components[
              RAGConfig[component_name].selected
            ]?.config || {}
          ).map(([configTitle, config]) => (
            <div key={`Configuration${configTitle}${component_name}`}>
              <div className="flex items-center justify-between gap-3 text-sm text-text-verba lg:text-base">
                <p className="flex min-w-[8vw]">{configTitle}</p>

                {/* Dropdown */}
                {config.type === 'dropdown' && (
                  <Select
                    value={String(config.value)}
                    onValueChange={(value) => {
                      if (!blocked) {
                        updateConfig(component_name, configTitle, value);
                      }
                    }}
                    disabled={blocked}
                  >
                    <SelectTrigger className="w-full bg-button-verba text-text-verba hover:bg-button-hover-verba">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[20vh]">
                      {RAGConfig[component_name]?.components?.[RAGConfig[component_name].selected]?.config?.[configTitle]?.values?.map((configValue) => (
                        <SelectItem 
                          key={`ConfigValue${configValue}`} 
                          value={String(configValue)}
                        >
                          {String(configValue)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Text Input */}
                {typeof config.value !== 'boolean' &&
                  ['text', 'number', 'password'].includes(config.type) && (
                    <label className="input flex w-full items-center gap-2 bg-bg-verba text-sm">
                      <input
                        className="w-full grow"
                        onChange={(e) => {
                          if (!blocked) {
                            updateConfig(
                              component_name,
                              configTitle,
                              e.target.value
                            );
                          }
                        }}
                        type={config.type}
                        value={config.value}
                      />
                    </label>
                  )}

                {/* Text Area */}
                {typeof config.value !== 'boolean' &&
                  ['textarea'].includes(config.type) && (
                    <textarea
                      className="min-h-[152px] w-full grow rounded-lg bg-bg-verba p-2 text-sm"
                      onChange={(e) => {
                        if (!blocked) {
                          updateConfig(
                            component_name,
                            configTitle,
                            e.target.value
                          );
                        }
                      }}
                      value={config.value}
                    />
                  )}

                {/* Multi Input */}
                {typeof config.value !== 'boolean' &&
                  config.type === 'multi' && (
                    <MultiInput
                      blocked={blocked}
                      component_name={component_name}
                      config_title={configTitle}
                      updateConfig={updateConfig}
                      values={config.values}
                    />
                  )}

                {/* Checkbox Input */}
                {config.type === 'bool' && (
                  <div className="my-4 flex w-full items-center justify-start gap-5">
                    <p className="w-[250px] text-start text-text-alt-verba text-xs lg:text-sm">
                      {config.description}
                    </p>
                    <input
                      checked={
                        typeof config.value === 'boolean' ? config.value : false
                      }
                      className="checkbox checkbox-md"
                      onChange={(e) => {
                        if (!blocked) {
                          updateConfig(
                            component_name,
                            configTitle,
                            (e.target as HTMLInputElement).checked
                          );
                        }
                      }}
                      type="checkbox"
                    />
                  </div>
                )}
              </div>
              {/* Description */}
              {config.type !== 'bool' && (
                <div className="mt-3 flex items-center gap-2 text-text-verba">
                  <p className="flex min-w-[8vw]" />
                  <p className="text-start text-text-alt-verba text-xs">
                    {config.description}
                  </p>
                </div>
              )}
            </div>
          ))
        : []}
    </div>
  );
};

export default ComponentView;
