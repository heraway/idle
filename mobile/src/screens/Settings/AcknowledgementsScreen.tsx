import React from "react";
import { Text, ScrollView, View, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Card, SectionLabel } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

// Direct dependencies from mobile/package.json and backend/package.json. Licenses are the ones the
// projects publish; update this list when dependencies change.
const APP: [string, string][] = [
  ["React & React Native", "MIT"],
  ["Expo (SDK, Constants, Location, Notifications, Image Picker, Updates)", "MIT"],
  ["React Navigation", "MIT"],
  ["react-native-maps", "MIT"],
  ["react-native-screens & safe-area-context", "MIT"],
  ["react-native-webview", "MIT"],
  ["AsyncStorage", "MIT"],
  ["Socket.IO client", "MIT"],
  ["Ionicons (via @expo/vector-icons)", "MIT"],
];
const SERVER: [string, string][] = [
  ["Node.js & Express", "MIT"],
  ["Prisma", "Apache-2.0"],
  ["Socket.IO", "MIT"],
  ["Zod", "MIT"],
  ["jsonwebtoken, bcryptjs, helmet, cors, multer", "MIT"],
  ["express-rate-limit", "MIT"],
];

function Group({ title, items }: { title: string; items: [string, string][] }) {
  const { theme } = useTheme();
  return (
    <>
      <SectionLabel>{title}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {items.map(([name, license], i) => (
          <View
            key={name}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: spacing.md,
              paddingVertical: 12,
              borderBottomWidth: i === items.length - 1 ? 0 : StyleSheet.hairlineWidth,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 14, flex: 1 }}>{name}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{license}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

export default function AcknowledgementsScreen() {
  const { theme } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
        Idle is built on the work of many open-source projects. Thank you to everyone who builds and maintains them.
      </Text>
      <Group title="In the app" items={APP} />
      <Group title="On the server" items={SERVER} />
    </ScrollView>
  );
}
