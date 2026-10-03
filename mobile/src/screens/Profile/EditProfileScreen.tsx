import React, { useState } from "react";
import { ScrollView, Alert, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle, SectionLabel } from "../../components/UI";
import { SOCIAL_FIELDS } from "../../components/SocialLinks";
import { SocialLinks } from "../../types";
import { spacing } from "../../theme/theme";

const BIO_MAX = 500;

export default function EditProfileScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState(user?.bio ?? "");
  const [links, setLinks] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    SOCIAL_FIELDS.forEach((f) => {
      init[f.key] = user?.socialLinks?.[f.key] ?? "";
    });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    setLoading(true);
    try {
      // Empty strings are sent as-is; the backend drops empty links, so
      // clearing a field removes it.
      await api("/users/me", { method: "PATCH", body: { bio, socialLinks: links as SocialLinks } });
      await refreshUser();
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || "Couldn't save your profile");
      Alert.alert("Couldn't save", e.message || "Please check your links and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTitle>Edit profile</ScreenTitle>

      <Input label="Bio" value={bio} onChangeText={(t) => setBio(t.slice(0, BIO_MAX))} placeholder="Tell people a little about yourself" multiline />
      <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: "right", marginTop: -spacing.sm, marginBottom: spacing.md }}>
        {bio.length}/{BIO_MAX}
      </Text>

      <SectionLabel>Links (optional)</SectionLabel>
      {SOCIAL_FIELDS.map((f) => (
        <Input
          key={f.key}
          label={f.label}
          value={links[f.key]}
          onChangeText={(t) => setLinks((prev) => ({ ...prev, [f.key]: t }))}
          placeholder={f.placeholder}
        />
      ))}

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button title="Save" onPress={save} loading={loading} />
    </ScrollView>
  );
}
