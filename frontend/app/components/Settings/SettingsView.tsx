'use client';

import type React from 'react';
import { useState } from 'react';
import { BiSolidCommentError } from 'react-icons/bi';
import { FaPaintBrush } from 'react-icons/fa';
import { IoChatboxEllipsesSharp, IoLogOutSharp } from 'react-icons/io5';
import { RiAdminFill } from 'react-icons/ri';
import type { Credentials, Theme, Themes } from '@/app/types';
import InfoComponent from '../Navigation/InfoComponent';
import VerbaButton from '../Navigation/VerbaButton';
import InfoView from './InfoView';
import SettingsComponent from './SettingsComponent';
import SuggestionView from './SuggestionView';

type SettingsViewProps = {
  selectedTheme: Theme;
  setSelectedTheme: React.Dispatch<React.SetStateAction<Theme>>;
  themes: Themes;
  setThemes: React.Dispatch<React.SetStateAction<Themes>>;
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const SettingsView: React.FC<SettingsViewProps> = ({
  selectedTheme,
  themes,
  setThemes,
  addStatusMessage,
  setSelectedTheme,
  credentials,
}) => {
  const [settingMode, setSettingMode] = useState<
    'INFO' | 'ADMIN' | 'THEME' | 'SUGGESTIONS' | 'CACHE'
  >('INFO');

  return (
    <div className="flex h-[80vh] justify-center gap-3">
      <div className={'flex w-1/3'}>
        <div className="flex w-full flex-col gap-2">
          <div className="flex h-min w-full items-center justify-between gap-2 rounded-2xl bg-bg-alt-verba p-3">
            <div className="flex justify-start gap-2">
              <InfoComponent
                display_text={'Settings'}
                tooltip_text="Customize Verba's Theme, reset collections, logout or report issues."
              />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-2xl bg-bg-alt-verba p-3">
            <VerbaButton
              Icon={RiAdminFill}
              onClick={() => setSettingMode('INFO')}
              selected={settingMode === 'INFO'}
              selected_color="bg-secondary-verba"
              title="Admin"
            />
            <VerbaButton
              Icon={FaPaintBrush}
              onClick={() => setSettingMode('THEME')}
              selected={settingMode === 'THEME'}
              selected_color="bg-secondary-verba"
              title="Customize Theme"
            />
            <VerbaButton
              Icon={IoChatboxEllipsesSharp}
              onClick={() => setSettingMode('SUGGESTIONS')}
              selected={settingMode === 'SUGGESTIONS'}
              selected_color="bg-secondary-verba"
              title="Manage Suggestions"
            />
          </div>
          <div className="flex w-full flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-2xl bg-bg-alt-verba p-6">
            <VerbaButton
              Icon={IoLogOutSharp}
              onClick={() => window.location.reload()}
              title="Logout"
            />
            <VerbaButton
              Icon={BiSolidCommentError}
              onClick={() =>
                window.open(
                  'https://github.com/weaviate/Verba/issues/new/choose',
                  '_blank'
                )
              }
              title="Report Issue"
            />
          </div>
        </div>
      </div>

      <div className={'flex w-2/3'}>
        <div className="flex w-full flex-col gap-2">
          <div className="flex h-full w-full flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-2xl bg-bg-alt-verba p-6">
            {settingMode === 'THEME' && (
              <SettingsComponent
                addStatusMessage={addStatusMessage}
                credentials={credentials}
                selectedTheme={selectedTheme}
                setSelectedTheme={setSelectedTheme}
                setThemes={setThemes}
                themes={themes}
              />
            )}
            {settingMode === 'INFO' && (
              <InfoView
                addStatusMessage={addStatusMessage}
                credentials={credentials}
              />
            )}
            {settingMode === 'SUGGESTIONS' && (
              <SuggestionView
                addStatusMessage={addStatusMessage}
                credentials={credentials}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
