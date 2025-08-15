'use client';

import type React from 'react';
import { useCallback } from 'react';
import { IoSettingsSharp } from 'react-icons/io5';
import { MdCancel } from 'react-icons/md';
import { Loader2 } from 'lucide-react';
import { 
  useRAGConfig, 
  useUpdateRAGConfig, 
  ApiError 
} from '@/app/lib/api-client';
import type { Credentials, RAGComponentConfig, RAGConfig } from '@/app/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { toast } from '@/app/components/ui/use-toast';

import VerbaButton from '../Navigation/VerbaButton';

type OptimizedChatConfigProps = {
  RAGConfig: RAGConfig | null;
  setRAGConfig: React.Dispatch<React.SetStateAction<RAGConfig | null>>;
  onSave: () => void;
  onReset: () => void;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
  credentials: Credentials;
  production: 'Local' | 'Demo' | 'Production';
};

const OptimizedChatConfig: React.FC<OptimizedChatConfigProps> = ({
  RAGConfig,
  setRAGConfig,
  addStatusMessage,
  onSave,
  credentials,
  onReset,
  production,
}) => {
  // Use TanStack Query for RAG config
  const { 
    data: ragConfigData, 
    isLoading: ragConfigLoading, 
    error: ragConfigError,
    refetch: refetchRAGConfig
  } = useRAGConfig(credentials, true);

  // Mutation for updating RAG config
  const updateRAGConfigMutation = useUpdateRAGConfig();

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
            selectedComponent.config[configTitle].value = value;
          }
        }
        return newRAGConfig;
      }
      return prevRAGConfig;
    });
  };

  const selectComponent = useCallback(
    (component_n: string, selected_component: string) => {
      setRAGConfig((prevRAGConfig) => {
        if (prevRAGConfig?.[component_n]) {
          const newRAGConfig = { ...prevRAGConfig };
          newRAGConfig[component_n].selected = selected_component;
          return newRAGConfig;
        }
        return prevRAGConfig;
      });
    },
    [setRAGConfig]
  );

  const handleSaveConfig = async () => {
    if (!RAGConfig) {
      addStatusMessage('No configuration to save', 'WARNING');
      return;
    }

    try {
      await updateRAGConfigMutation.mutateAsync({
        credentials,
        config: RAGConfig,
      });
      
      addStatusMessage('RAG Configuration saved successfully', 'SUCCESS');
      onSave();
    } catch (error) {
      console.error('Failed to save RAG config:', error);
      
      let errorMessage = 'Failed to save configuration';
      if (error instanceof ApiError) {
        errorMessage = `Failed to save: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Failed to save: ${error.message}`;
      }
      
      addStatusMessage(errorMessage, 'ERROR');
    }
  };

  const handleResetConfig = async () => {
    try {
      await refetchRAGConfig();
      onReset();
      addStatusMessage('Configuration reset successfully', 'INFO');
    } catch (error) {
      console.error('Failed to reset RAG config:', error);
      addStatusMessage('Failed to reset configuration', 'ERROR');
    }
  };

  // Show loading state
  if (ragConfigLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading RAG Configuration...</p>
      </div>
    );
  }

  // Show error state
  if (ragConfigError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="text-destructive">
          <MdCancel className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load configuration</p>
          <p className="text-sm text-muted-foreground">
            {ragConfigError instanceof ApiError 
              ? ragConfigError.message 
              : 'An unexpected error occurred'}
          </p>
        </div>
        <Button onClick={() => refetchRAGConfig()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const componentOrder = ['Reader', 'Chunker', 'Embedder', 'Retriever', 'Generator'];

  return (
    <div className="flex flex-col gap-4 p-4 bg-background rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IoSettingsSharp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">RAG Configuration</h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleResetConfig}
            variant="outline"
            size="sm"
            disabled={production === 'Demo'}
          >
            <MdCancel className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSaveConfig}
            size="sm"
            disabled={production === 'Demo' || updateRAGConfigMutation.isPending}
          >
            {updateRAGConfigMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IoSettingsSharp className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {production === 'Demo' && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">
            Configuration changes are disabled in demo mode
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {componentOrder.map((component_key) => {
          const component = RAGConfig?.[component_key];
          if (!component) return null;

          const availableComponents = Object.keys(component.components || {});
          const selectedComponent = component.selected || '';

          return (
            <div key={component_key} className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`select-${component_key}`}>
                {component_key}
              </label>
              <Select
                value={selectedComponent}
                onValueChange={(value) => selectComponent(component_key, value)}
                disabled={production === 'Demo'}
              >
                <SelectTrigger id={`select-${component_key}`}>
                  <SelectValue placeholder={`Select ${component_key}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableComponents.map((comp_name) => {
                    const comp = component.components?.[comp_name];
                    return (
                      <SelectItem key={comp_name} value={comp_name}>
                        <div className="flex flex-col">
                          <span>{comp?.name || comp_name}</span>
                          {comp?.description && (
                            <span className="text-xs text-muted-foreground">
                              {comp.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Show availability status */}
              {component.components?.[selectedComponent] && (
                <div className="flex items-center gap-2 text-xs">
                  <div 
                    className={`h-2 w-2 rounded-full ${
                      component.components[selectedComponent].available 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`} 
                  />
                  <span className="text-muted-foreground">
                    {component.components[selectedComponent].available 
                      ? 'Available' 
                      : 'Unavailable - check dependencies'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advanced Configuration */}
      {RAGConfig && Object.keys(RAGConfig).map((component_key) => {
        const component = RAGConfig[component_key];
        const selectedComp = component?.components?.[component.selected || ''];
        
        if (!selectedComp?.config || Object.keys(selectedComp.config).length === 0) {
          return null;
        }

        return (
          <details key={`${component_key}-advanced`} className="space-y-2">
            <summary className="text-sm font-medium cursor-pointer">
              Advanced {component_key} Settings
            </summary>
            <div className="pl-4 space-y-3 border-l-2 border-muted">
              {Object.entries(selectedComp.config).map(([configKey, configValue]) => (
                <div key={configKey} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {configKey}
                  </label>
                  {configValue.type === 'dropdown' && (
                    <Select
                      value={String(configValue.value)}
                      onValueChange={(value) => updateConfig(component_key, configKey, value)}
                      disabled={production === 'Demo'}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {configValue.values.map((value) => (
                          <SelectItem key={String(value)} value={String(value)}>
                            {String(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {configValue.description && (
                    <p className="text-xs text-muted-foreground">
                      {configValue.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
};

export default OptimizedChatConfig;