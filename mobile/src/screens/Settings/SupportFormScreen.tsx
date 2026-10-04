import React, { useState } from "react";
import { Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { getAppInfo } from "../../utils/appInfo";
import { spacing, radius } from "../../theme/theme";

type TicketType = "PROBLEM" | "BUG" | "FEEDBACK";

const CONFIG: Record<TicketType, { title: string; intro: string; label: string; placeholder: string; categories?: string[]; thanks: string }> = {
  PROBLEM: {
    title: "Report a problem",
    intro: "Tell us what went wrong and our team will look into it. To report a person, use Settings › Report a user instead.",
    label: "What happened?",
    placeholder: "Describe the problem…",
    categories: ["Account", "Payments", "A job or bid", "Safety", "Other"],
    thanks: "Thanks — we've received your report.",
  },
  BUG: {
    title: "Report a bug",
    intro: "Something broken or behaving strangely? Tell us what you did and what you expected. Your app version and device details are attached automatically.",
    label: "What went wrong?",
    placeholder: "Which screen were you on, what did you tap, what happened?",
    thanks: "Thanks — bug report sent.",
  },
  FEEDBACK: {
    title: "Send feedback",
    intro: "Ideas, things you love, things that annoy you — we read all of it.",
    label: "Your feedback",
    placeholder: "What would make Idle better?",
    thanks: "Thanks for the feedback!",
  },
};

export default function SupportFormScreen({ route, navigation }: any) {
  const type: TicketType = route.params?.type ?? "FEEDBACK";
  const cfg = CONFIG[type];
  const { theme } = useTheme();
  const [category, setCategory] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setSending(true);
    try {
      const info = getAppInfo();
      await api("/support", {
        method: "POST",
        body: {
          type,
          category,
          message: message.trim(),
          appVersion: info.version,
          platform: info.platform,
          osVersion: info.osVersion,
          runtimeVersion: info.runtimeVersion ?? undefined,
        },
      });
      Alert.alert(cfg.thanks, undefined, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      setError(e.message || "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const tooShort = message.trim().length < 10;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
      <ScreenTitle>{cfg.title}</ScreenTitle>
      <Text style={{ color: theme.textSecondary, marginBottom: spacing.lg }}>{cfg.intro}</Text>

      {cfg.categories?.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => setCategory(c)}
          accessibilityRole="radio"
          accessibilityState={{ selected: category === c }}
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: category === c ? theme.primary : theme.surfaceAlt,
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ color: category === c ? theme.textInverse : theme.textPrimary, fontWeight: "600" }}>{c}</Text>
        </TouchableOpacity>
      ))}

      <Input label={cfg.label} value={message} onChangeText={(t) => setMessage(t.slice(0, 2000))} placeholder={cfg.placeholder} multiline />
      <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md }}>{message.length}/2000 · at least 10 characters</Text>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}
      <Button title="Send" onPress={submit} loading={sending} disabled={tooShort || (!!cfg.categories && !category)} />
    </ScrollView>
  );
}
