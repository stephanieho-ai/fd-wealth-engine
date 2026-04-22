import { useEffect } from "react";
import useLocalStorage from "./useLocalStorage";
import { DEFAULT_SETTINGS } from "../data/settings";

const STORAGE_KEY = "fd_advisor_v24_settings";

export default function useSettings() {
  const [settings, setSettings] = useLocalStorage(STORAGE_KEY, DEFAULT_SETTINGS);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      settings.darkMode ? "dark" : "light"
    );
  }, [settings.darkMode]);

  return {
    settings,
    setSettings,
  };
}