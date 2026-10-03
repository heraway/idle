import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Card, Button, Avatar } from "./UI";
import { Job } from "../types";
import { spacing, typography } from "../theme/theme";

interface GivenRating {
  toUserId: string;
  stars: number;
  comment?: string | null;
  reference?: string | null;
}

// Shown on a COMPLETED job to the people who may review each other: the hirer
// can review each assigned worker, and each assigned worker can review the
// hirer. The server enforces the same rule (POST /ratings).
export default function ReviewPrompt({ job, navigation }: { job: Job; navigation: any }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [given, setGiven] = useState<GivenRating[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (job.status !== "COMPLETED") return;
      api<GivenRating[]>(`/ratings/job/${job.id}/mine`)
        .then(setGiven)
        .catch(() => {});
    }, [job.id, job.status])
  );

  if (job.status !== "COMPLETED" || !user) return null;

  const isHirer = user.id === job.hirerId;
  const targets: { id: string; name: string; avatarUrl?: string | null }[] = isHirer
    ? (job.assignments ?? []).map((a) => ({
        id: a.workerId,
        name: `${a.worker?.firstName ?? ""} ${a.worker?.lastName ?? ""}`.trim() || "Worker",
        avatarUrl: a.worker?.avatarUrl,
      }))
    : (job.assignments ?? []).some((a) => a.workerId === user.id)
      ? [
          {
            id: job.hirerId,
            name: `${job.hirer?.firstName ?? ""} ${job.hirer?.lastName ?? ""}`.trim() || "Employer",
            avatarUrl: job.hirer?.avatarUrl,
          },
        ]
      : [];
  if (targets.length === 0) return null;

  return (
    <Card>
      <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: 2 }]}>Rate & review</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.md }]}>
        Leave a rating, a short review and an optional written reference.
      </Text>
      {targets.map((t) => {
        const existing = given.find((g) => g.toUserId === t.id);
        return (
          <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm }}>
            <Avatar name={t.name} uri={t.avatarUrl} size={40} />
            <Text style={[typography.bodyBold, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
              {t.name}
            </Text>
            <Button
              title={existing ? "Edit review" : "Leave review"}
              variant={existing ? "secondary" : "primary"}
              onPress={() => navigation.navigate("LeaveReview", { jobId: job.id, toUserId: t.id, toName: t.name, existing })}
            />
          </View>
        );
      })}
    </Card>
  );
}
