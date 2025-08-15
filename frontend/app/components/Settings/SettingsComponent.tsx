'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { FaCheckCircle } from 'react-icons/fa';
import { MdCancel } from 'react-icons/md';
import { updateThemeConfig } from '@/app/api';
import VerbaButton from '@/app/components/Navigation/VerbaButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  type CheckboxSetting,
  type ColorSetting,
  type Credentials,
  DarkTheme,
  type ImageFieldSetting,
  LightTheme,
  type NumberFieldSetting,
  type SelectSetting,
  type TextFieldSetting,
  type Theme,
  type Themes,
  WCDTheme,
  WeaviateTheme,
} from '@/app/types';

type SettingsComponentProps = {
  selectedTheme: Theme;
  themes: Themes;
  setThemes: React.Dispatch<React.SetStateAction<Themes>>;
  setSelectedTheme: React.Dispatch<React.SetStateAction<Theme>>;
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  ) => void;
};

const SettingsComponent: React.FC<SettingsComponentProps> = ({
  selectedTheme,
  setThemes,
  credentials,
  setSelectedTheme,
  themes,
  addStatusMessage,
}) => {
  const [imageURL, setImageURL] = useState('');

  const resetThemes = () => {
    setThemes({
      Light: LightTheme,
      Dark: DarkTheme,
      Weaviate: WeaviateTheme,
      WCD: WCDTheme,
    });
    setSelectedTheme(WeaviateTheme);
    addStatusMessage('Themes reset', 'SUCCESS');
  };

  const saveTheme = async () => {
    await updateThemeConfig(themes, selectedTheme, credentials);
    addStatusMessage(`Changes to ${selectedTheme.theme_name} saved`, 'SUCCESS');
  };

  const updateValue = (
    title: keyof Theme,
    value: string | number | boolean
  ) => {
    setSelectedTheme((prev: Theme) => {
      const setting = prev[title];
      if (isTextFieldSetting(setting)) {
        return { ...prev, [title]: { ...setting, text: value } };
      }
      if (isImageFieldSetting(setting)) {
        return { ...prev, [title]: { ...setting, src: value } };
      }
      if (isCheckboxSetting(setting)) {
        return { ...prev, [title]: { ...(setting as object), checked: value } };
      }
      if (isColorSetting(setting)) {
        return { ...prev, [title]: { ...(setting as object), color: value } };
      }
      if (isSelectSetting(setting)) {
        return { ...prev, [title]: { ...setting, value } };
      }
      if (isNumberFieldSetting(setting)) {
        return { ...prev, [title]: { ...(setting as object), value } };
      }
      return prev;
    });
  };

  useEffect(() => {
    setThemes((prevThemes: Themes) => {
      const newThemes = { ...prevThemes };
      newThemes[selectedTheme.theme_name] = selectedTheme;
      return newThemes as Themes;
    });
  }, [selectedTheme, setThemes]);

  const handleImageChange = (
    title: keyof Theme,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          updateValue(title, e.target.result);
        }
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  // Type for all possible setting types
  type ThemeSetting =
    | TextFieldSetting
    | ImageFieldSetting
    | CheckboxSetting
    | ColorSetting
    | SelectSetting
    | NumberFieldSetting;

  // Type guards
  function isTextFieldSetting(setting: unknown): setting is TextFieldSetting {
    return (
      typeof setting === 'object' &&
      setting !== null &&
      'type' in setting &&
      (setting as { type: string }).type === 'text'
    );
  }

  function isImageFieldSetting(setting: unknown): setting is ImageFieldSetting {
    return (
      typeof setting === 'object' &&
      setting !== null &&
      'type' in setting &&
      (setting as { type: string }).type === 'image'
    );
  }

  function isCheckboxSetting(setting: unknown): setting is CheckboxSetting {
    return (
      typeof setting === 'object' &&
      setting !== null &&
      'type' in setting &&
      (setting as { type: string }).type === 'check'
    );
  }

  function isColorSetting(setting: unknown): setting is ColorSetting {
    return (
      typeof setting === 'object' &&
      setting !== null &&
      'type' in setting &&
      (setting as { type: string }).type === 'color'
    );
  }

  function isSelectSetting(setting: unknown): setting is SelectSetting {
    return (
      typeof setting === 'object' &&
      setting !== null &&
      'type' in setting &&
      (setting as { type: string }).type === 'select'
    );
  }

  function isNumberFieldSetting(
    setting: unknown
  ): setting is NumberFieldSetting {
    return (
      typeof setting === 'object' &&
      setting !== null &&
      'type' in setting &&
      (setting as { type: string }).type === 'number'
    );
  }

  // Helper function to safely get theme setting
  function getThemeSetting(theme: Theme, title: keyof Theme): unknown {
    return theme[title];
  }

  const renderSettingComponent = (
    title: keyof Theme,
    setting_type: ThemeSetting
  ) => {
    const currentSetting = getThemeSetting(selectedTheme, title);

    return (
      <div key={title}>
        <div className="flex items-center justify-between gap-3 text-text-verba">
          <p className="flex min-w-[8vw]">{setting_type.description}</p>
          {setting_type.type === 'text' &&
            isTextFieldSetting(currentSetting) && (
              <label className="input flex w-full items-center gap-2 border-none bg-bg-verba">
                <input
                  className="w-full grow"
                  onChange={(e) => updateValue(title, e.target.value)}
                  placeholder={title}
                  type="text"
                  value={currentSetting.text ?? ''}
                />
              </label>
            )}
          {setting_type.type === 'select' &&
            isSelectSetting(currentSetting) && (
              <Select
                value={currentSetting.value ?? ''}
                onValueChange={(value) => updateValue(title, value)}
              >
                <SelectTrigger className="w-full bg-bg-verba">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {setting_type.options.map((template) => (
                    <SelectItem key={`Select_${template}`} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          {setting_type.type === 'color' && isColorSetting(currentSetting) && (
            <div className="z-10 flex h-[15vh] flex-col gap-1">
              <label className="input input-sm input-bordered flex w-full items-center gap-2 bg-bg-verba">
                <input
                  className="grow"
                  onChange={(e) => {
                    updateValue(title, e.target.value);
                  }}
                  placeholder={title}
                  type="text"
                  value={currentSetting.color ?? ''}
                />
              </label>
              <HexColorPicker
                className="z-1"
                color={currentSetting.color ?? '#000000'}
                onChange={(newColor: string) => {
                  updateValue(title, newColor);
                }}
              />
            </div>
          )}
          {setting_type.type === 'image' &&
            isImageFieldSetting(currentSetting) && (
              <div className="flex w-full items-center justify-between gap-4">
                <div className="grow">
                  <label className="input flex w-full items-center gap-2 border-none bg-bg-verba text-text-verba">
                    <input
                      className="grow"
                      onChange={(e) => setImageURL(e.target.value)}
                      placeholder="Enter image URL"
                      type="text"
                      value={imageURL}
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <VerbaButton
                      onClick={() => updateValue(title, imageURL)}
                      title="Set Link"
                    />
                    <VerbaButton
                      onClick={() =>
                        document.getElementById(`${title}ImageInput`)?.click()
                      }
                      title="Upload Image"
                    />
                    <input
                      accept="image/*"
                      className="hidden"
                      id={`${title}ImageInput`}
                      onChange={(e) => handleImageChange(title, e)}
                      type="file"
                    />
                  </div>
                  {currentSetting.src && (
                    <img
                      alt={`${title} preview`}
                      className="max-h-32 max-w-full rounded-xl"
                      src={currentSetting.src}
                    />
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex size-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-2xl">Customize Theme</p>
        <Select
          value={
            Object.keys(themes).find((key) => themes[key] === selectedTheme) ||
            ''
          }
          onValueChange={(value) => {
            const theme = themes[value as keyof typeof themes];
            if (theme) {
              setSelectedTheme(theme);
            }
          }}
        >
          <SelectTrigger className="w-48 bg-bg-verba">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(themes).map((themeKey) => (
              <SelectItem key={themeKey} value={themeKey}>
                {themeKey}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grow overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          <p className="font-bold">Customize Logo</p>
          {Object.entries(selectedTheme)
            .filter(([, settingValue]) => isImageFieldSetting(settingValue))
            .map(([key, settingValue]) =>
              renderSettingComponent(
                key as keyof Theme,
                settingValue as ImageFieldSetting
              )
            )}
          <p className="mt-4 font-bold">Customize Text</p>
          {Object.entries(selectedTheme)
            .filter(([, settingValue]) => isTextFieldSetting(settingValue))
            .map(([key, settingValue]) =>
              renderSettingComponent(
                key as keyof Theme,
                settingValue as TextFieldSetting
              )
            )}
          <p className="mt-4 font-bold">Customize Font</p>
          {Object.entries(selectedTheme)
            .filter(([, settingValue]) => isSelectSetting(settingValue))
            .map(([key, settingValue]) =>
              renderSettingComponent(
                key as keyof Theme,
                settingValue as SelectSetting
              )
            )}
          <p className="mt-4 font-bold">Customize Color</p>
          {Object.entries(selectedTheme)
            .filter(([, settingValue]) => isColorSetting(settingValue))
            .map(([key, settingValue]) =>
              renderSettingComponent(
                key as keyof Theme,
                settingValue as ColorSetting
              )
            )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <VerbaButton
          className="max-w-min"
          Icon={FaCheckCircle}
          onClick={saveTheme}
          title="Save"
        />
        <VerbaButton
          className="max-w-min"
          Icon={MdCancel}
          onClick={resetThemes}
          title="Reset"
        />
      </div>
    </div>
  );
};

export default SettingsComponent;
