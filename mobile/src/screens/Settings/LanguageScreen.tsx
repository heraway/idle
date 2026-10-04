import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { Card } from "../../components/UI";
import { LANGUAGES } from "../../i18n/translations";
import { spacing, typography } from "../../theme/theme";

export default function LanguageScreen() {
  const { theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.md }]}>{t("language.intro")}</Text>
      <Card style={{ paddingVertical: spacing.xs }}>
        {LANGUAGES.map((l, i) => {
          const active = l.code === language;
          return (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLanguage(l.code)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                minHeight: 52,
                borderBottomWidth: i === LANGUAGES.length - 1 ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "600" }}>{l.native}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{l.name}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : <Ionicons name="ellipse-outline" size={22} color={theme.border} />}
            </TouchableOpacity>
          );
        })}
      </Card>
      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: spacing.md, lineHeight: 18 }]}>{t("language.note")}</Text>
    </ScrollView>
  );
}
