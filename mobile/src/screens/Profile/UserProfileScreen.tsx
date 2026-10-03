import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { api, API_URL } from "../../api/client";
import { Card, Badge, Avatar } from "../../components/UI";
import SocialLinksRow from "../../components/SocialLinks";
import ProfileSections from "../../components/ProfileSections";
import { SocialLinks } from "../../types";
import { spacing, typography } from "../../theme/theme";

interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  avgRating: number;
  ratingCount: number;
  verificationStatus: string;
  socialLinks?: SocialLinks | null;
}

export default function UserProfileScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const userId: string = route.params?.userId;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setProfile(await api<PublicProfile>(`/users/${userId}/profile`));
      } catch (e: any) {
        setError(e.message || "Couldn't load profile");
      }
    })();
  }, [userId]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: spacing.lg }}>
        <Text style={{ color: theme.danger }}>{error}</Text>
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const verified = profile.verificationStatus === "VERIFIED";
  const avatar = profile.avatarUrl ? (profile.avatarUrl.startsWith("http") ? profile.avatarUrl : `${API_URL}${profile.avatarUrl}`) : null;
  const place = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={avatar} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: theme.textPrimary }]} numberOfLines={1}>
              {profile.firstName} {profile.lastName}
            </Text>
            {place ? (
              <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 6 }]} numberOfLines={1}>
                {place}
              </Text>
            ) : null}
            <Badge
              label={verified ? "ID Verified" : "Not ID verified"}
              tone={verified ? "success" : "neutral"}
              icon={verified ? "shield-checkmark" : "shield-outline"}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Ionicons name="star" size={18} color={theme.primary} />
            <Text style={{ color: theme.textPrimary, fontWeight: "800", fontSize: 18, marginTop: 4 }}>
              {profile.ratingCount ? profile.avgRating.toFixed(1) : "—"}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              {`${profile.ratingCount} rating${profile.ratingCount === 1 ? "" : "s"}`}
            </Text>
          </View>
        </View>

        {profile.bio || profile.socialLinks ? (
          <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border }}>
            {profile.bio ? <Text style={[typography.body, { color: theme.textPrimary }]}>{profile.bio}</Text> : null}
            <SocialLinksRow links={profile.socialLinks} />
          </View>
        ) : null}
      </Card>

      <ProfileSections userId={profile.id} navigation={navigation} />
    </ScrollView>
  );
}
