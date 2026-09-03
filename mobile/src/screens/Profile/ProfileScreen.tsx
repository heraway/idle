import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Card, Badge, Button } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Profile</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Settings"
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.chipBackground,
          }}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <Card>
        <Text style={[typography.h2, { color: theme.textPrimary }]}>{user.firstName} {user.lastName}</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]}>{user.email}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          <Badge label={`⭐ ${user.avgRating.toFixed(1)} (${user.ratingCount})`} tone="accent" />
          <Badge label={`👍 ${user.likesReceived} likes`} />
          <Badge
            label={user.verificationStatus === "VERIFIED" ? "ID Verified" : "Not ID Verified"}
            tone={user.verificationStatus === "VERIFIED" ? "success" : "neutral"}
          />
        </View>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Availability</Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          {user.hoursPerDayAvailable ? `${user.hoursPerDayAvailable} hours/day` : "Not set — add this so hirers know your availability."}
        </Text>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Identity verification</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          Some jobs (driving, in-home work, childcare) require you to be ID-verified before you can bid. Verify once, reuse everywhere.
        </Text>
        <Button title="Go to verification" variant="secondary" onPress={() => navigation.navigate("Verification")} />
      </Card>

      {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
        <Button title="Admin Dashboard" variant="accent" onPress={() => navigation.navigate("AdminDashboard")} style={{ marginBottom: spacing.md }} />
      )}

      <Button title="Log out" variant="danger" onPress={logout} />
    </ScrollView>
  );
}
