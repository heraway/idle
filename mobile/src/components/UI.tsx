import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, typography } from "../theme/theme";
import { API_URL } from "../api/client";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// -------------------------------------------------------------
// Button — primary (kinetic orange), secondary (outlined surface), accent
// (same orange, kept for back-compat), danger (outlined red).
// 48px tall, 12px radius, per the design system.
// -------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "accent" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
}) {
  const { theme } = useTheme();
  const solid = variant === "primary" || variant === "accent";
  const bg = solid ? theme.primary : variant === "secondary" ? theme.surfaceAlt : "transparent";
  const textColor = solid
    ? "#FFFFFF"
    : variant === "danger"
    ? theme.danger
    : variant === "ghost"
    ? theme.textSecondary
    : theme.textPrimary;
  const borderColor = variant === "secondary" ? theme.border : variant === "danger" ? theme.danger + "66" : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "secondary" || variant === "danger" ? 1 : 0,
          opacity: disabled ? 0.45 : 1,
        },
        solid && theme.mode === "dark" ? styles.glow : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// -------------------------------------------------------------
// Card — rounded-2xl surface with a 1px hairline instead of a drop shadow.
// -------------------------------------------------------------
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>
  );
}

// -------------------------------------------------------------
// Badge — pill for status / trust signals
// -------------------------------------------------------------
export function Badge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  icon?: IconName;
}) {
  const { theme } = useTheme();
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    neutral: { bg: theme.chipBackground, text: theme.chipText, border: "transparent" },
    success: { bg: theme.success + "22", text: theme.success, border: theme.success + "44" },
    warning: { bg: theme.warning + "22", text: theme.warning, border: theme.warning + "44" },
    danger: { bg: theme.danger + "22", text: theme.danger, border: theme.danger + "44" },
    accent: { bg: theme.accentSoft, text: theme.accentText, border: theme.accentBorder },
  };
  const c = colors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon ? <Ionicons name={icon} size={11} color={c.text} style={{ marginRight: 4 }} /> : null}
      <Text style={[typography.small, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// -------------------------------------------------------------
// Chip — selectable filter pill
// -------------------------------------------------------------
export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: active ? theme.primary : theme.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.border,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? "#fff" : theme.chipText} style={{ marginRight: 6 }} /> : null}
      <Text style={{ color: active ? "#fff" : theme.chipText, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// -------------------------------------------------------------
// Avatar — the one avatar used across the app. Resolves relative "/uploads/…"
// paths against the API, falls back to initials, and is tappable if onPress
// is given.
// -------------------------------------------------------------
export function resolveMediaUrl(u?: string | null) {
  if (!u) return null;
  return /^(https?:|file:|data:|blob:)/i.test(u) ? u : `${API_URL}${u}`;
}

export function Avatar({
  name,
  uri,
  size = 40,
  onPress,
}: {
  name?: string;
  uri?: string | null;
  size?: number;
  onPress?: () => void;
}) {
  const base = <AvatarBase name={name} uri={resolveMediaUrl(uri)} size={size} />;
  if (!onPress) return base;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel={name ? `${name}'s profile` : "Profile"}>
      {base}
    </TouchableOpacity>
  );
}

// -------------------------------------------------------------
// AvatarBase — photo, or initials on an orange-tinted disc
// -------------------------------------------------------------
function AvatarBase({
  name,
  uri,
  size = 40,
}: {
  name?: string;
  uri?: string | null;
  size?: number;
}) {
  const { theme } = useTheme();
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surfaceAlt }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.accentBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: theme.accentText, fontWeight: "800", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// -------------------------------------------------------------
// ListRow — settings-style row with icon, label and chevron. Replaces the
// full-width buttons that made the Legal section huge.
// -------------------------------------------------------------
export function ListRow({
  icon,
  label,
  subtitle,
  onPress,
  tone = "default",
  last,
}: {
  icon?: IconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  tone?: "default" | "danger";
  last?: boolean;
}) {
  const { theme } = useTheme();
  const color = tone === "danger" ? theme.danger : theme.textPrimary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 52,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: tone === "danger" ? theme.danger + "22" : theme.accentSoft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: spacing.md,
          }}
        >
          <Ionicons name={icon} size={17} color={tone === "danger" ? theme.danger : theme.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color, fontSize: 15, fontWeight: "600" }}>{label}</Text>
        {subtitle ? <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm }]}>
      {children}
    </Text>
  );
}

// -------------------------------------------------------------
// Input — labeled text field, 48px, orange focus border
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
  const [revealed, setRevealed] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.label, { color: theme.textSecondary, marginBottom: 6 }]}>{label}</Text>
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary + "99"}
          secureTextEntry={isPasswordField && !revealed}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: focused ? theme.primary : theme.border,
              color: theme.textPrimary,
              minHeight: multiline ? 100 : 48,
              textAlignVertical: multiline ? "top" : "center",
              paddingRight: isPasswordField ? 64 : undefined,
            },
          ]}
        />
        {isPasswordField ? (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ position: "absolute", right: spacing.md }}
          >
            <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>{revealed ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[typography.h1, { color: theme.textPrimary, marginBottom: spacing.md }]}>{children}</Text>;
}

export function EmptyState({ message, icon = "briefcase-outline" }: { message: string; icon?: IconName }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: spacing.xl, alignItems: "center" }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.accentSoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
        }}
      >
        <Ionicons name={icon} size={26} color={theme.primary} />
      </View>
      <Text style={[typography.body, { color: theme.textSecondary, textAlign: "center" }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { ...typography.bodyBold },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
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
