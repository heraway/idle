import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { spacing } from "../../theme/theme";

export function SwitchRow({
  label,
  subtitle,
  value,
  onValueChange,
  disabled,
  last,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 56,
        paddingVertical: 10,
        opacity: disabled ? 0.5 : 1,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "600" }}>{label}</Text>
        {subtitle ? <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
}

export function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        gap: spacing.md,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
      }}
    >
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text selectable style={{ color: theme.textPrimary, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}
