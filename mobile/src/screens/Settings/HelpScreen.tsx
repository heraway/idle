import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Card, ListRow, SectionLabel } from "../../components/UI";
import { spacing } from "../../theme/theme";

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I post a job?",
    a: "Tap the orange + button in the middle of the bottom bar, fill in the details (what, where, pay and how many workers), and post it. Workers nearby can then bid on it.",
  },
  {
    q: "How do bids work?",
    a: "Open a job from the Feed and place a bid at your own price. The person who posted it can accept one or more bids. You'll be notified if yours is accepted (if notifications are on).",
  },
  {
    q: "What is identity verification?",
    a: "Some jobs ask for verified workers. You verify once from Settings › Identity verification and the badge applies to every job you bid on.",
  },
  {
    q: "I'm not getting notifications",
    a: "Check Settings › Notifications and make sure push notifications and the categories you want are on. If it says notifications are blocked, allow them for Idle in your phone's settings and restart the app.",
  },
  {
    q: "Someone is behaving badly or something feels unsafe",
    a: "Use Settings › Report a user, or Report a problem on the job itself. If you're in immediate danger, contact local emergency services first.",
  },
  {
    q: "How do I change my password?",
    a: "Settings › Change password. If you've forgotten it, use \"Forgot password\" on the login screen.",
  },
  {
    q: "How do I delete my account?",
    a: "Settings › Delete account. You'll need to finish or resolve any job that is assigned, in progress or in dispute first.",
  },
];

export default function HelpScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      <SectionLabel>Frequently asked questions</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <View key={item.q} style={{ borderBottomWidth: i === FAQ.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <TouchableOpacity
                onPress={() => setOpen(isOpen ? null : i)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                style={{ flexDirection: "row", alignItems: "center", minHeight: 52, paddingVertical: 10 }}
              >
                <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: "600", paddingRight: spacing.sm }}>{item.q}</Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              {isOpen ? <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, paddingBottom: spacing.md }}>{item.a}</Text> : null}
            </View>
          );
        })}
      </Card>

      <SectionLabel>Still need help?</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="alert-circle-outline" label="Report a problem" onPress={() => navigation.navigate("SupportForm", { type: "PROBLEM" })} />
        <ListRow icon="chatbubble-ellipses-outline" label="Send feedback" onPress={() => navigation.navigate("SupportForm", { type: "FEEDBACK" })} last />
      </Card>
    </ScrollView>
  );
}
