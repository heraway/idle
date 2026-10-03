import React, { useState } from "react";
import { View, ScrollView, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

// Rating + review + optional written reference for the other party on a
// completed job. Saving again edits the existing review (server upserts).
export default function LeaveReviewScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { jobId, toUserId, toName, existing } = route.params;
  const [stars, setStars] = useState<number>(existing?.stars ?? 0);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [reference, setReference] = useState<string>(existing?.reference ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await api("/ratings", {
        method: "POST",
        body: { jobId, toUserId, stars, comment: comment.trim() || undefined, reference: reference.trim() },
      });
      Alert.alert("Thanks!", "Your review has been saved.");
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || "Couldn't save your review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTitle>Review {toName}</ScreenTitle>

      <Text style={[typography.label, { color: theme.textSecondary, marginBottom: 6 }]}>Rating</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => setStars(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} accessibilityLabel={`${i} star${i > 1 ? "s" : ""}`}>
            <Ionicons name={i <= stars ? "star" : "star-outline"} size={38} color={theme.primary} />
          </TouchableOpacity>
        ))}
      </View>

      <Input label="Review (optional)" value={comment} onChangeText={(t) => setComment(t.slice(0, 500))} placeholder="How did the job go?" multiline />
      <Input
        label="Written reference (optional)"
        value={reference}
        onChangeText={(t) => setReference(t.slice(0, 1000))}
        placeholder="A short reference others can read on their profile"
        multiline
      />

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button title={existing ? "Save changes" : "Submit review"} onPress={submit} loading={loading} disabled={stars < 1} />
    </ScrollView>
  );
}
