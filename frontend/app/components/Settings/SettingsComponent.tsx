"use client";

import React, { useState, useEffect } from "react";
import {
  Theme,
  Themes,
  TextFieldSetting,
  ImageFieldSetting,
  CheckboxSetting,
  ColorSetting,
  SelectSetting,
  NumberFieldSetting,
  WeaviateTheme,
  WCDTheme,
  LightTheme,
  DarkTheme,
  Credentials,
} from "@/app/types";

import VerbaButton from "@/app/components/Navigation/VerbaButton";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import { HexColorPicker } from "react-colorful";

import { FaCheckCircle } from "react-icons/fa";
import { MdCancel } from "react-icons/md";

import { updateThemeConfig } from "@/app/api";

interface SettingsComponentProps {
  selectedTheme: Theme;
  themes: Themes;
  setThemes: React.Dispatch<React.SetStateAction<Themes>>;
  setSelectedTheme: React.Dispatch<React.SetStateAction<Theme>>;
  credentials: Credentials;
  addStatusMessage: (
    message: string,
    type: "INFO" | "WARNING" | "SUCCESS" | "ERROR"
  ) => void;
}

const SettingsComponent: React.FC<SettingsComponentProps> = ({
  selectedTheme,
  setThemes,
  credentials,
  setSelectedTheme,
  themes,
  addStatusMessage,
}) => {
  const [imageURL, setImageURL] = useState("");

  const resetThemes = () => {
    setThemes({
      Light: LightTheme,
      Dark: DarkTheme,
      Weaviate: WeaviateTheme,
      WCD: WCDTheme,
    });
    setSelectedTheme(WeaviateTheme);
    addStatusMessage("Themes reset", "SUCCESS");
  };

  const saveTheme = async () => {
    await updateThemeConfig(themes, selectedTheme, credentials);
    addStatusMessage(`Changes to ${selectedTheme.theme_name} saved`, "SUCCESS");
  };

  const updateValue = (title: keyof Theme, value: any) => {
    setSelectedTheme((prev: Theme) => {
      const setting = prev[title];
      if (isTextFieldSetting(setting)) {
        return { ...prev, [title]: { ...setting, text: value } };
      } else if (isImageFieldSetting(setting)) {
        return { ...prev, [title]: { ...setting, src: value } };
      } else if (isCheckboxSetting(setting)) {
        return { ...prev, [title]: { ...(setting as object), checked: value } };
      } else if (isColorSetting(setting)) {
        return { ...prev, [title]: { ...(setting as object), color: value } };
      } else if (isSelectSetting(setting)) {
        return { ...prev, [title]: { ...setting, value: value } };
      } else if (isNumberFieldSetting(setting)) {
        return { ...prev, [title]: { ...(setting as object), value: value } };
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
  }, [selectedTheme]);

  const handleImageChange = (
    title: keyof Theme,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === "string") {
          updateValue(title, e.target.result);
        }
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  // Type guards
  function isTextFieldSetting(setting: any): setting is TextFieldSetting {
    return setting.type === "text";
  }

  function isImageFieldSetting(setting: any): setting is ImageFieldSetting {
    return setting.type === "image";
  }

  function isCheckboxSetting(setting: any): setting is CheckboxSetting {
    return setting.type === "check";
  }

  function isColorSetting(setting: any): setting is ColorSetting {
    return setting.type === "color";
  }

  function isSelectSetting(setting: any): setting is SelectSetting {
    return setting.type === "select";
  }

  function isNumberFieldSetting(setting: any): setting is NumberFieldSetting {
    return setting.type === "number";
  }

  const renderSettingComponent = (
    title: any,
    setting_type:
      | TextFieldSetting
      | ImageFieldSetting
      | CheckboxSetting
      | ColorSetting
      | SelectSetting
      | NumberFieldSetting
  ) => {
    return (
      <div key={title}>
        <div className="flex gap-3 justify-between items-center text-text-verba">
          <p className="flex min-w-[8vw]">{setting_type.description}</p>
          {setting_type.type === "text" && (
            <Input
              placeholder={String(title)}
              value={(selectedTheme as any)[title].text}
              onChange={(e) => updateValue(title, e.target.value)}
              className="w-full bg-bg-verba"
            />
          )}
          {setting_type.type === "select" && (
            <Select
              value={(selectedTheme as any)[title].value}
              onValueChange={(v) => updateValue(title, v)}
            >
              <SelectTrigger className="bg-bg-verba w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {setting_type.options.map((template) => (
                  <SelectItem key={"Select_" + template} value={template}>
                    {template}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {setting_type.type === "color" && (
            <div className="flex flex-col gap-1 h-[15vh] z-10">
              <Input
                placeholder={String(title)}
                value={(selectedTheme as any)[title].color}
                onChange={(e) => updateValue(title, e.target.value)}
                className="bg-bg-verba w-full"
              />
              <HexColorPicker
                color={(selectedTheme as any)[title].color}
                className="z-1"
                onChange={(newColor: string) => {
                  updateValue(title, newColor);
                }}
              />
            </div>
          )}
          {setting_type.type === "image" && (
            <div className="flex justify-between gap-4 w-full items-center">
              <div className="flex-grow">
                <Input
                  placeholder="Enter image URL"
                  value={imageURL}
                  onChange={(e) => setImageURL(e.target.value)}
                  className="bg-bg-verba w-full"
                />
              </div>
              <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col gap-2">
                  <VerbaButton
                    title="Set Link"
                    onClick={() => updateValue(title, imageURL)}
                  />
                  <VerbaButton
                    title="Upload Image"
                    onClick={() =>
                      document.getElementById(`${title}ImageInput`)?.click()
                    }
                  />
                  <input
                    id={`${title}ImageInput`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(title, e)}
                    className="hidden"
                  />
                </div>
                {(selectedTheme as any)[title].src && (
                  <img
                    src={(selectedTheme as any)[title].src}
                    alt={`${title} preview`}
                    className="max-w-full max-h-32 rounded-xl"
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
    <div className="flex flex-col w-full h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-2xl font-bold">Customize Theme</p>
        <Select
          value={
            Object.keys(themes).find((key) => themes[key] === selectedTheme) ||
            ""
          }
          onValueChange={(v) => setSelectedTheme(themes[v as keyof typeof themes])}
        >
          <SelectTrigger className="bg-bg-verba w-[200px]">
            <SelectValue />
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
      <div className="flex-grow overflow-y-auto">
        <div className="gap-4 flex flex-col p-4">
          <p className="font-bold">Customize Logo</p>
          {Object.entries(selectedTheme)
            .filter(([_, settingValue]) => settingValue.type === "image")
            .map(([key, settingValue]) =>
              renderSettingComponent(key, settingValue)
            )}
          <p className="font-bold mt-4">Customize Text</p>
          {Object.entries(selectedTheme)
            .filter(([_, settingValue]) => settingValue.type === "text")
            .map(([key, settingValue]) =>
              renderSettingComponent(key, settingValue)
            )}
          <p className="font-bold mt-4">Customize Font</p>
          {Object.entries(selectedTheme)
            .filter(([_, settingValue]) => settingValue.type === "select")
            .map(([key, settingValue]) =>
              renderSettingComponent(key, settingValue)
            )}
          <p className="font-bold mt-4">Customize Color</p>
          {Object.entries(selectedTheme)
            .filter(([_, settingValue]) => settingValue.type === "color")
            .map(([key, settingValue]) =>
              renderSettingComponent(key, settingValue)
            )}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <VerbaButton
          title="Save"
          onClick={saveTheme}
          className="max-w-min"
          Icon={FaCheckCircle}
        />
        <VerbaButton
          title="Reset"
          onClick={resetThemes}
          className="max-w-min"
          Icon={MdCancel}
        />
      </div>
    </div>
  );
};

export default SettingsComponent;
