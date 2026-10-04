import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { API_URL } from "../api/client";

export function getAppInfo() {
  return {
    version: Constants.expoConfig?.version ?? "unknown",
    nativeBuild: Constants.nativeBuildVersion ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    channel: Updates.channel ?? null,
    updateId: Updates.updateId ?? null,
    updateCreatedAt: Updates.createdAt ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updatesEnabled: Updates.isEnabled,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    apiUrl: API_URL,
  };
}
