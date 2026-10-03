import React, { useState } from "react";
import { View, TouchableOpacity, Modal, Pressable, Text, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api, apiUpload } from "../api/client";
import { appendImage, imageMediaTypes } from "../utils/media";
import { Avatar } from "./UI";
import { radius, spacing } from "../theme/theme";

// The signed-in user's own avatar: tap to take a photo, pick one, change it,
// or remove it. Uploads go through the same /uploads pipeline as every other
// photo in the app (POST /users/me/avatar), then the user is re-fetched so
// every screen shows the new picture.
export default function AvatarPicker({ name, uri, size = 64 }: { name: string; uri?: string | null; size?: number }) {
  const { theme } = useTheme();
  const { refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (asset: ImagePicker.ImagePickerAsset) => {
    setBusy(true);
    try {
      const form = new FormData();
      await appendImage(form, "photo", asset, "avatar");
      await apiUpload("/users/me/avatar", form);
      await refreshUser();
    } catch (e: any) {
      Alert.alert("Couldn't update photo", e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    setOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Allow camera access in your phone settings to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) await upload(result.assets[0]);
  };

  const choosePhoto = async () => {
    setOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaTypes(),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) await upload(result.assets[0]);
  };

  const removePhoto = () => {
    setOpen(false);
    Alert.alert("Remove profile photo?", "Your initials will be shown instead.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await api("/users/me/avatar", { method: "DELETE" });
            await refreshUser();
          } catch (e: any) {
            Alert.alert("Couldn't remove photo", e.message || "Please try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const Row = ({ icon, label, onPress, danger }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 }}
    >
      <Ionicons name={icon} size={22} color={danger ? theme.danger : theme.primary} />
      <Text style={{ color: danger ? theme.danger : theme.textPrimary, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} disabled={busy} activeOpacity={0.85} accessibilityLabel="Change profile photo">
        <Avatar name={name} uri={uri} size={size} />
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.primary,
            borderWidth: 2,
            borderColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
        {busy ? (
          <View
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "rgba(0,0,0,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: spacing.lg,
              paddingBottom: spacing.xl,
            }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: spacing.sm }}>Profile photo</Text>
            <Row icon="camera-outline" label="Take a photo" onPress={takePhoto} />
            <Row icon="images-outline" label={uri ? "Choose a new photo" : "Choose from gallery"} onPress={choosePhoto} />
            {uri ? <Row icon="trash-outline" label="Remove photo" onPress={removePhoto} danger /> : null}
            <Row icon="close" label="Cancel" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
