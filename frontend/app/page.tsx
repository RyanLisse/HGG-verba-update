'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
// Utilities
import { fetchHealth } from './api';
import ChatView from './components/Chat/ChatView';
import DocumentView from './components/Document/DocumentView';
import IngestionView from './components/Ingestion/IngestionView';
import GettingStartedComponent from './components/Login/GettingStarted';
// Components
import Navbar from './components/Navigation/NavbarComponent';
import SettingsView from './components/Settings/SettingsView';
// Types
import {
  type Credentials,
  DarkTheme,
  type DocumentFilter,
  LightTheme,
  type RAGConfig,
  type StatusMessage,
  type Theme,
  type Themes,
  WCDTheme,
  WeaviateTheme,
} from './types';
import { type FontKey, fonts } from './util';

// Dynamic imports for heavy components
const LoginView = dynamic(() => import('./components/Login/LoginView'), {
  ssr: false,
  loading: () => (
    <div className="flex w-full justify-center p-6">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  ),
});

const StatusMessengerComponent = dynamic(
  () => import('./components/Navigation/StatusMessenger'),
  { ssr: false }
);

export default function Home() {
  // Page States
  const [currentPage, setCurrentPage] = useState('CHAT');
  const [production, setProduction] = useState<'Local' | 'Demo' | 'Production'>(
    'Local'
  );
  const [gtag, setGtag] = useState('');

  // Settings
  const [themes, setThemes] = useState<Themes>({
    Light: LightTheme,
    Dark: DarkTheme,
    Weaviate: WeaviateTheme,
    WCD: WCDTheme,
  });
  const [selectedTheme, setSelectedTheme] = useState<Theme>(
    () => themes.Weaviate ?? WeaviateTheme
  );

  const fontKey = selectedTheme.font?.value as FontKey; // Safely cast with optional chaining
  const fontClassName = fontKey ? fonts[fontKey]?.className || '' : '';

  // Login States
  const [isHealthy, setIsHealthy] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>({
    deployment: 'Local',
    url: '',
    key: '',
    default_deployment: '',
  });

  // RAG Config
  const [RAGConfig, setRAGConfig] = useState<null | RAGConfig>(null);

  const [documentFilter, setDocumentFilter] = useState<DocumentFilter[]>([]);

  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);

  const initialFetch = useCallback(async () => {
    try {
      const [health_data] = await Promise.all([fetchHealth()]);

      if (health_data) {
        setProduction(health_data.production);

        setGtag(health_data.gtag);
        setIsHealthy(true);
        setCredentials({
          deployment: 'Local',
          url: health_data.deployments.WEAVIATE_URL_VERBA,
          key: health_data.deployments.WEAVIATE_API_KEY_VERBA,
          default_deployment: health_data.default_deployment,
        });
      } else {
        setIsHealthy(false);
        setIsLoggedIn(false);
      }
    } catch (_error) {
      setIsHealthy(false);
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  useEffect(() => {
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLoggedIn]);

  // Theme validation function - may be used in the future
  // const isValidTheme = (theme: Theme): boolean => {
  //   const requiredAttributes = [
  //     "primary_color",
  //     "secondary_color",
  //     "warning_color",
  //     "bg_color",
  //     "bg_alt_color",
  //     "text_color",
  //     "text_alt_color",
  //     "button_color",
  //     "button_hover_color",
  //     "button_text_color",
  //     "button_text_alt_color",
  //   ];
  //   return requiredAttributes.every(
  //     (attr) =>
  //       typeof theme[attr as keyof Theme] === "object" &&
  //       "color" in (theme[attr as keyof Theme] as object)
  //   );
  // };

  const updateCSSVariables = useCallback(() => {
    const themeToUse = selectedTheme;
    const cssVars = {
      '--primary-verba':
        themeToUse.primary_color?.color || WeaviateTheme.primary_color.color,
      '--secondary-verba':
        themeToUse.secondary_color?.color ||
        WeaviateTheme.secondary_color.color,
      '--warning-verba':
        themeToUse.warning_color?.color || WeaviateTheme.warning_color.color,
      '--bg-verba': themeToUse.bg_color?.color || WeaviateTheme.bg_color.color,
      '--bg-alt-verba':
        themeToUse.bg_alt_color?.color || WeaviateTheme.bg_alt_color.color,
      '--text-verba':
        themeToUse.text_color?.color || WeaviateTheme.text_color.color,
      '--text-alt-verba':
        themeToUse.text_alt_color?.color || WeaviateTheme.text_alt_color.color,
      '--button-verba':
        themeToUse.button_color?.color || WeaviateTheme.button_color.color,
      '--button-hover-verba':
        themeToUse.button_hover_color?.color ||
        WeaviateTheme.button_hover_color.color,
      '--text-verba-button':
        themeToUse.button_text_color?.color ||
        WeaviateTheme.button_text_color.color,
      '--text-alt-verba-button':
        themeToUse.button_text_alt_color?.color ||
        WeaviateTheme.button_text_alt_color.color,
    };
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [selectedTheme]);

  useEffect(updateCSSVariables, []);

  const addStatusMessage = (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => {
    setStatusMessages((prevMessages) => [
      ...prevMessages,
      { message, type, timestamp: new Date().toISOString() },
    ]);
  };

  return (
    <main className={`verba-container ${fontClassName}`}>
      {gtag !== '' && <GoogleAnalytics gaId={gtag} />}

      <StatusMessengerComponent
        set_status_messages={setStatusMessages}
        status_messages={statusMessages}
      />

      {!isLoggedIn && isHealthy && (
        <LoginView
          credentials={credentials}
          production={production}
          setCredentials={setCredentials}
          setIsLoggedIn={setIsLoggedIn}
          setRAGConfig={setRAGConfig}
          setSelectedTheme={setSelectedTheme}
          setThemes={setThemes}
        />
      )}

      {isLoggedIn && isHealthy && (
        <div
          className={`verba-layout transition-opacity duration-1000 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <GettingStartedComponent addStatusMessage={addStatusMessage} />

          <Navbar
            currentPage={currentPage}
            imageSrc={selectedTheme.image?.src || ''}
            production={production}
            setCurrentPage={setCurrentPage}
            subtitle={selectedTheme.subtitle?.text || ''}
            title={selectedTheme.title?.text || ''}
            version="v2.0.0"
          />

          <div className="verba-content-wrapper">
            <div className={`${currentPage === 'CHAT' ? '' : 'hidden'}`}>
              <ChatView
                addStatusMessage={addStatusMessage}
                credentials={credentials}
                currentPage={currentPage}
                documentFilter={documentFilter}
                production={production}
                RAGConfig={RAGConfig}
                selectedTheme={selectedTheme}
                setDocumentFilter={setDocumentFilter}
                setRAGConfig={setRAGConfig}
              />
            </div>

            {currentPage === 'DOCUMENTS' && (
              <DocumentView
                addStatusMessage={addStatusMessage}
                credentials={credentials}
                documentFilter={documentFilter}
                production={production}
                selectedTheme={selectedTheme}
                setDocumentFilter={setDocumentFilter}
              />
            )}

            <div
              className={`${
                currentPage === 'ADD' && production !== 'Demo' ? '' : 'hidden'
              }`}
            >
              <IngestionView
                addStatusMessage={addStatusMessage}
                credentials={credentials}
                RAGConfig={RAGConfig}
                setRAGConfig={setRAGConfig}
              />
            </div>

            <div
              className={`${
                currentPage === 'SETTINGS' && production !== 'Demo'
                  ? ''
                  : 'hidden'
              }`}
            >
              <SettingsView
                addStatusMessage={addStatusMessage}
                credentials={credentials}
                selectedTheme={selectedTheme}
                setSelectedTheme={setSelectedTheme}
                setThemes={setThemes}
                themes={themes}
              />
            </div>
          </div>

          <div
            className={
              'mt-8 bg-bg-verba p-4 text-center text-text-alt-verba transition-all delay-1000 duration-1500'
            }
          >
            <p>Build with ♥ and Weaviate © 2024</p>
          </div>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* Tracking pixel: using <img> intentionally; Next/Image not appropriate */}
      <img
        referrerPolicy="no-referrer-when-downgrade"
        src="https://static.scarf.sh/a.png?x-pxid=ec666e70-aee5-4e87-bc62-0935afae63ac"
        alt=""
        aria-hidden="true"
        width={1}
        height={1}
      />
    </main>
  );
}
