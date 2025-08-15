import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { CgWebsite } from 'react-icons/cg';
import {
  FaBackspace,
  FaDatabase,
  FaDocker,
  FaKey,
  FaLaptopCode,
} from 'react-icons/fa';
import { GrConnect } from 'react-icons/gr';
import { HiMiniSparkles } from 'react-icons/hi2';
import { TbDatabaseEdit } from 'react-icons/tb';

import { connectToVerba } from '@/app/api';
import type { Credentials, RAGConfig, Theme, Themes } from '@/app/types';
import VerbaButton from '../Navigation/VerbaButton';
import { Input } from '@/app/components/ui/input';

type LoginViewProps = {
  credentials: Credentials;
  setCredentials: (c: Credentials) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setRAGConfig: (RAGConfig: RAGConfig | null) => void;
  setSelectedTheme: (theme: Theme) => void;
  setThemes: (themes: Themes) => void;
  production: 'Local' | 'Demo' | 'Production';
};

const LoginView: React.FC<LoginViewProps> = ({
  credentials,
  setCredentials,
  setSelectedTheme,
  setThemes,
  setIsLoggedIn,
  production,
  setRAGConfig,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  const [isConnecting, setIsConnecting] = useState(false);

  const [selectStage, setSelectStage] = useState(true);

  const [errorText, setErrorText] = useState('');

  const [selectedDeployment, setSelectedDeployment] = useState<
    'Weaviate' | 'Docker' | 'Local' | 'Custom'
  >('Local');

  const [weaviateURL, setWeaviateURL] = useState(credentials.url);
  const [weaviateAPIKey, setWeaviateAPIKey] = useState(credentials.key);
  const [port, setPort] = useState('8080');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Adjust this delay as needed

    return () => clearTimeout(timer);
  }, []);

  // Auto-connect to Weaviate instance (Local or Docker)
  useEffect(() => {
    if (
      !isLoading &&
      selectStage &&
      credentials.url &&
      (credentials.default_deployment === 'Local' ||
        credentials.default_deployment === 'Docker')
    ) {
      // Auto-connect without showing deployment screen
      setWeaviateURL(credentials.url);
      setWeaviateAPIKey(credentials.key);

      // Set deployment type based on environment
      const deploymentType =
        credentials.default_deployment === 'Docker' ? 'Docker' : 'Local';
      setSelectedDeployment(deploymentType);
      setSelectStage(false);
    }
  }, [isLoading, selectStage, credentials]);

  const connect = useCallback(
    async (deployment: 'Local' | 'Weaviate' | 'Docker' | 'Custom') => {
      setErrorText('');
      setIsConnecting(true);
      const response = await connectToVerba(
        deployment,
        weaviateURL,
        weaviateAPIKey,
        port
      );
      if (response) {
        if (!('error' in response)) {
          setIsLoggedIn(false);
          setErrorText(JSON.stringify(response));
        } else if (response.connected === false) {
          setIsLoggedIn(false);
          setErrorText(
            response.error === ''
              ? "Couldn't connect to Weaviate"
              : response.error
          );
        } else {
          setIsLoggedIn(true);
          setCredentials({
            deployment,
            key: weaviateAPIKey,
            url: weaviateURL,
            default_deployment: credentials.default_deployment,
          });
          setRAGConfig(response.rag_config);
          if (response.themes) {
            setThemes(response.themes);
          }
          if (response.theme) {
            setSelectedTheme(response.theme);
          }
        }
      }
      setIsConnecting(false);
    },
    [
      weaviateURL,
      weaviateAPIKey,
      port,
      setIsLoggedIn,
      setCredentials,
      setRAGConfig,
      setThemes,
      setSelectedTheme,
      credentials.default_deployment,
    ]
  );

  useEffect(() => {
    if (credentials.default_deployment) {
      setSelectedDeployment(credentials.default_deployment);
      connect(credentials.default_deployment);
    }
  }, [credentials.default_deployment, connect]);

  return (
    <div className="h-screen w-screen bg-white">
      <div
        className={`flex size-full transition-opacity duration-1000 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="hidden h-full md:flex md:w-1/2 lg:w-3/5">
          <div className="size-full bg-linear-to-br from-[#FAFAFA] to-[#EAEAEA]" />
        </div>
        <div className="flex h-full w-full items-center justify-center p-5 md:flex md:w-1/2 lg:w-2/5">
          <div className="flex w-4/5 flex-col items-center justify-center gap-8 md:items-start">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <div className="flex items-center gap-3">
                <p className="font-light text-3xl text-text-alt-verba md:text-4xl">
                  Welcome to
                </p>
                <p className="font-light text-3xl text-text-verba md:text-4xl">
                  Verba
                </p>
              </div>
              {production === 'Local' && (
                <p className="text-base text-text-verba lg:text-lg">
                  Choose your deployment
                </p>
              )}
            </div>
            {selectStage ? (
              <div className="flex w-full flex-col justify-start gap-4">
                {production === 'Local' && (
                  <div className="flex w-full flex-col justify-start gap-2">
                    <VerbaButton
                      disabled={isConnecting}
                      Icon={FaDatabase}
                      onClick={() => {
                        setSelectStage(false);
                        setSelectedDeployment('Weaviate');
                      }}
                      title="Weaviate"
                    />
                    <VerbaButton
                      disabled={isConnecting}
                      Icon={FaDocker}
                      loading={isConnecting && selectedDeployment === 'Docker'}
                      onClick={() => {
                        setSelectedDeployment('Docker');
                        connect('Docker');
                      }}
                      title="Docker"
                    />
                    <VerbaButton
                      disabled={isConnecting}
                      Icon={TbDatabaseEdit}
                      loading={isConnecting && selectedDeployment === 'Custom'}
                      onClick={() => {
                        setSelectedDeployment('Custom');
                        setSelectStage(false);
                      }}
                      title="Custom"
                    />
                    <VerbaButton
                      disabled={isConnecting}
                      Icon={FaLaptopCode}
                      loading={isConnecting && selectedDeployment === 'Local'}
                      onClick={() => {
                        setSelectedDeployment('Local');
                        connect('Local');
                      }}
                      title="Local"
                    />
                  </div>
                )}
                {production === 'Demo' && (
                  <div className="flex w-full flex-col justify-start gap-4">
                    <VerbaButton
                      disabled={isConnecting}
                      Icon={HiMiniSparkles}
                      loading={
                        isConnecting && selectedDeployment === 'Weaviate'
                      }
                      onClick={() => {
                        setSelectedDeployment('Weaviate');
                        connect('Weaviate');
                      }}
                      title="Start Demo"
                    />
                  </div>
                )}
                {production === 'Production' && (
                  <div className="flex w-full flex-col justify-start gap-4">
                    <VerbaButton
                      Icon={HiMiniSparkles}
                      onClick={() => {
                        setSelectStage(false);
                        setSelectedDeployment('Weaviate');
                      }}
                      title="Start Verba"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex w-full flex-col justify-start gap-4">
                {production !== 'Demo' && (
                  <div className="flex w-full flex-col justify-start gap-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        connect(selectedDeployment);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex w-full items-center gap-2">
                          <FaDatabase className="text-text-alt-verba" />
                          <Input
                            autoComplete="username"
                            name="username"
                            onChange={(e) => setWeaviateURL(e.target.value)}
                            placeholder="Weaviate URL"
                            value={weaviateURL}
                          />
                        </div>
                        {selectedDeployment === 'Custom' && (
                          <div className="flex items-center gap-2">
                            <p className="text-text-alt-verba text-xs">Port</p>
                            <Input
                              autoComplete="port"
                              name="Port"
                              onChange={(e) => setPort(e.target.value)}
                              placeholder="Port"
                              value={port}
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <FaKey className="text-text-alt-verba" />
                        <Input
                          autoComplete="current-password"
                          name="current-password"
                          onChange={(e) => setWeaviateAPIKey(e.target.value)}
                          placeholder="API Key"
                          type="password"
                          value={weaviateAPIKey}
                        />
                      </div>
                      <div className="mt-4 flex justify-between gap-4">
                        <div className="flex w-full flex-col gap-2">
                          <div className="flex w-full flex-col justify-start gap-2">
                            <VerbaButton
                              Icon={GrConnect}
                              loading={isConnecting}
                              selected={true}
                              selected_color="bg-primary-verba"
                              title="Connect to Weaviate"
                              type="submit"
                            />
                            {selectedDeployment === 'Weaviate' && (
                              <VerbaButton
                                disabled={isConnecting}
                                Icon={CgWebsite}
                                onClick={() =>
                                  window.open(
                                    'https://console.weaviate.cloud',
                                    '_blank'
                                  )
                                }
                                title="Register"
                                type="button"
                              />
                            )}
                            <VerbaButton
                              disabled={isConnecting}
                              Icon={FaBackspace}
                              icon_size={12}
                              onClick={() => setSelectStage(true)}
                              text_size="text-xs"
                              title="Back"
                              type="button"
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
            {errorText && (
              <div className="size-full overflow-auto rounded bg-warning-verba p-4">
                <p className="flex size-full whitespace-pre-wrap">
                  {errorText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
