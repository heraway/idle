import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "../api/client";
import { useAuth } from "../context/AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests permission and registers this device's Expo push token with the
// backend once a user is logged in. No-ops silently on simulators/emulators
// (push tokens require a physical device) and if permission is denied.
export function useRegisterPushToken() {
  const { user } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user || registeredFor.current === user.id) return;

    (async () => {
      if (!Device.isDevice) {
        console.log("Push notifications require a physical device — skipping in simulator/emulator.");
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted") {
        console.log("Push notification permission was not granted.");
        return;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        await registerPushToken(tokenResponse.data);
        registeredFor.current = user.id;
      } catch (err) {
        // Non-fatal — e.g. SDK 52+ Expo Go on Android no longer supports
        // remote push at all; a dev build is required there. The rest of
        // the app should keep working either way.
        console.log("Could not register push token:", err);
      }
    })();
  }, [user]);
}
