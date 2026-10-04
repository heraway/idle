import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAccessibility, TextScale } from "../../context/AccessibilityContext";
import { Button, Card, SectionLabel } from "../../components/UI";
import { SwitchRow } from "./parts";
import { spacing, radius, typography } from "../../theme/theme";

const SIZES: { label: string; value: TextScale }[] = [
  { label: "Default", value: 1 },
  { label: "Large", value: 1.15 },
  { label: "Extra large", value: 1.3 },
];

async function openDeviceAccessibility() {
  try {
    if (Platform.OS === "android") {
      await Linking.sendIntent("android.settings.ACCESSIBILITY_SETTINGS");
      return;
    }
  } catch {
    // fall through to the generic settings screen
  }
  await Linking.openSettings();
}

export default function AccessibilityScreen() {
  const { theme } = useTheme();
  const { textScale, boldText, setTextScale, setBoldText, reset } = useAccessibility();
  const changed = textScale !== 1 || boldText;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      <SectionLabel>Text size</SectionLabel>
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {SIZES.map((s) => {
            const active = textScale === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                onPress={() => setTextScale(s.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  minHeight: 52,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? theme.accentSoft : theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                }}
              >
                <Text style={{ color: active ? theme.primary : theme.textSecondary, fontWeight: "700", fontSize: 12 }}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[typography.body, { color: theme.textPrimary, marginTop: spacing.md }]}>
          This is how text will look across Idle. Pick the size that's comfortable to read.
        </Text>
      </Card>

      <SectionLabel>Display</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <SwitchRow label="Bold text" subtitle="Makes regular-weight text heavier" value={boldText} onValueChange={setBoldText} last />
      </Card>

      <SectionLabel>Your device</SectionLabel>
      <Card>
        <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: spacing.md }}>
          Screen readers (VoiceOver / TalkBack), display zoom and the system font size are controlled by your phone. Idle follows the system font size on top of the setting above.
        </Text>
        <Button title="Open device settings" variant="secondary" onPress={openDeviceAccessibility} />
      </Card>

      {changed ? <Button title="Reset to defaults" variant="ghost" onPress={reset} style={{ marginTop: spacing.md }} /> : null}
    </ScrollView>
  );
}
