import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Card, Badge, Button, Avatar, ListRow } from "../../components/UI";
import { API_URL } from "../../api/client";
import SocialLinksRow from "../../components/SocialLinks";
import AvatarPicker from "../../components/AvatarPicker";
import ProfileSections from "../../components/ProfileSections";
import { spacing, typography, radius } from "../../theme/theme";

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();

  if (!user) return null;

  const verified = user.verificationStatus === "VERIFIED";
  const avatar = user.avatarUrl ? (user.avatarUrl.startsWith("http") ? user.avatarUrl : `${API_URL}${user.avatarUrl}`) : null;

  const Stat = ({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: string; label: string }) => (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <Text style={{ color: theme.textPrimary, fontWeight: "800", fontSize: 18, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl + spacing.sm, paddingBottom: spacing.xxl }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md, paddingHorizontal: 4 }}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Profile</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Settings"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.surfaceAlt,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="settings-outline" size={21} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <AvatarPicker name={`${user.firstName} ${user.lastName}`} uri={avatar} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: theme.textPrimary }]} numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 6 }]} numberOfLines={1}>
              {user.email}
            </Text>
            <Badge
              label={verified ? "ID Verified" : "Not ID verified"}
              tone={verified ? "success" : "neutral"}
              icon={verified ? "shield-checkmark" : "shield-outline"}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Stat icon="star" value={user.ratingCount ? user.avgRating.toFixed(1) : "—"} label={`${user.ratingCount} rating${user.ratingCount === 1 ? "" : "s"}`} />
        </View>
        <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={[typography.label, { color: theme.textSecondary }]}>About</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EditProfile")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Edit profile">
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
          </View>
          {user.bio ? (
            <Text style={[typography.body, { color: theme.textPrimary }]}>{user.bio}</Text>
          ) : (
            <Text style={[typography.body, { color: theme.textSecondary }]}>Add a short bio so people know who you are.</Text>
          )}
          <SocialLinksRow links={user.socialLinks} />
        </View>
      </Card>

      {!verified ? (
        <Card style={{ backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }}>
          <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: 4 }]}>Get ID verified</Text>
          <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.md }]}>
            Driving, in-home and childcare jobs require it. Verify once, reuse everywhere.
          </Text>
          <Button title="Start verification" icon="shield-checkmark-outline" onPress={() => navigation.navigate("Verification")} />
        </Card>
      ) : null}

      <ProfileSections userId={user.id} navigation={navigation} />

      {user.role === "ADMIN" || user.role === "SUPERADMIN" ? (
        <Card style={{ paddingVertical: spacing.xs }}>
          <ListRow icon="construct-outline" label="Admin dashboard" onPress={() => navigation.navigate("AdminDashboard")} last />
        </Card>
      ) : null}
    </ScrollView>
  );
}
