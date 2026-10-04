import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Avatar, EmptyState } from "../../components/UI";
import { spacing, radius, typography } from "../../theme/theme";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

// Settings › Report a user. Lists only people you've dealt with on a job (hired, bid on, or been
// hired by) and hands off to the existing ReportUser screen, which files the report via /reports.
export default function ReportUserPickerScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Contact[]>("/users/me/contacts")
      .then(setContacts)
      .catch((e) => setError(e.message || "Couldn't load people"));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: spacing.lg }}>
        <Text style={{ color: theme.danger }}>{error}</Text>
      </View>
    );
  }
  if (!contacts) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 }}
      data={contacts}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        contacts.length ? (
          <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.md }]}>Who would you like to report? These are people you've worked with, been hired by, or who bid on your jobs.</Text>
        ) : null
      }
      ListEmptyComponent={<EmptyState icon="people-outline" message="You can report people you've worked with, been hired by, or who've bid on your jobs. You haven't interacted with anyone yet." />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("ReportUser", { targetUserId: item.id })}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: spacing.md,
            marginBottom: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            gap: spacing.md,
          }}
        >
          <Avatar name={`${item.firstName} ${item.lastName}`} uri={item.avatarUrl} size={40} />
          <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: "600" }}>
            {item.firstName} {item.lastName}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    />
  );
}
