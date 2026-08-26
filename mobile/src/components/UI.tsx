import React from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, typography } from "../theme/theme";

// -------------------------------------------------------------
// Button — primary (indigo), secondary (outline), and accent (amber, used
// for the highest-priority action on a screen, e.g. "Place Bid", "Post Job").
// -------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "accent" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const bg =
    variant === "primary" ? theme.primary : variant === "accent" ? theme.accent : variant === "danger" ? theme.danger : "transparent";
  const textColor = variant === "secondary" ? theme.primary : variant === "accent" ? "#1F2937" : theme.textInverse;
  const borderColor = variant === "secondary" ? theme.primary : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor, borderWidth: variant === "secondary" ? 1.5 : 0, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

// -------------------------------------------------------------
// Card — the base surface used for job listings, profile blocks, etc.
// -------------------------------------------------------------
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// -------------------------------------------------------------
// Badge — status pills (job status, verification badge, trust signals)
// -------------------------------------------------------------
export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  const { theme } = useTheme();
  const colors: Record<string, { bg: string; text: string }> = {
    neutral: { bg: theme.chipBackground, text: theme.chipText },
    success: { bg: theme.mode === "dark" ? "#14532D" : "#DCFCE7", text: theme.success },
    warning: { bg: theme.mode === "dark" ? "#78350F" : "#FEF3C7", text: theme.warning },
    danger: { bg: theme.mode === "dark" ? "#7F1D1D" : "#FEE2E2", text: theme.danger },
    accent: { bg: theme.mode === "dark" ? "#78350F" : "#FEF3C7", text: theme.accentText },
  };
  const c = colors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[typography.small, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// -------------------------------------------------------------
// Input — labeled text field
// -------------------------------------------------------------
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
        style={[
          styles.input,
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
            color: theme.textPrimary,
            minHeight: multiline ? 90 : undefined,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[typography.h1, { color: theme.textPrimary, marginBottom: spacing.md }]}>{children}</Text>;
}

export function EmptyState({ message }: { message: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: spacing.xl, alignItems: "center" }}>
      <Text style={[typography.body, { color: theme.textSecondary, textAlign: "center" }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { ...typography.bodyBold },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
});
