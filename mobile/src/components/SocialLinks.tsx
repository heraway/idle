import React from "react";
import { View, Text, TouchableOpacity, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing } from "../theme/theme";
import { SocialLinks } from "../types";

export const SOCIAL_FIELDS: {
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { key: "website", label: "Website", placeholder: "yourwebsite.com", icon: "globe-outline" },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/yourname", icon: "logo-instagram" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/yourname", icon: "logo-facebook" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/yourname", icon: "logo-linkedin" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@yourname", icon: "logo-tiktok" },
  { key: "x", label: "X (Twitter)", placeholder: "x.com/yourname", icon: "logo-twitter" },
];

// Renders only the links a user actually filled in. Renders nothing if none.
export default function SocialLinksRow({ links }: { links?: SocialLinks | null }) {
  const { theme } = useTheme();
  const present = SOCIAL_FIELDS.filter((f) => !!links?.[f.key]);
  if (present.length === 0) return null;

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open link", url);
    }
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
      {present.map((f) => (
        <TouchableOpacity
          key={f.key}
          onPress={() => open(links![f.key] as string)}
          activeOpacity={0.8}
          accessibilityLabel={f.label}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: spacing.md,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: theme.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name={f.icon} size={16} color={theme.primary} />
          <Text style={{ color: theme.textPrimary, fontWeight: "600", fontSize: 13 }}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
