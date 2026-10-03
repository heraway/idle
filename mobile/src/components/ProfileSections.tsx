import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import { Card, Badge, Avatar, SectionLabel } from "./UI";
import { radius, spacing, typography } from "../theme/theme";

interface ReviewItem {
  id: string;
  stars: number;
  comment?: string | null;
  reference?: string | null;
  createdAt: string;
  reviewerRole: "Employer" | "Worker";
  reviewer: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
  job: { id: string; title: string };
}

interface HistoryItem {
  jobId: string;
  title: string;
  category: string;
  status: string;
  date: string;
  pay: { amount: number | null; min: number | null; max: number | null; currency: string; payType: string } | null;
  rating: { stars: number; comment?: string | null } | null;
}

const STATUS_TONE: Record<string, "success" | "accent" | "warning" | "danger" | "neutral"> = {
  OPEN: "success",
  ASSIGNED: "accent",
  IN_PROGRESS: "accent",
  SUBMITTED: "warning",
  COMPLETED: "success",
  DISPUTED: "danger",
  CANCELLED: "neutral",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const shortName = (u: { firstName: string; lastName?: string }) => `${u.firstName}${u.lastName ? ` ${u.lastName[0]}.` : ""}`;
const status = (s: string) => s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function payLabel(p: HistoryItem["pay"]) {
  if (!p) return null;
  const unit = p.payType === "hourly" ? "/hr" : "";
  if (p.amount != null) return `${p.currency} ${p.amount}${unit}`;
  if (p.min != null && p.max != null && p.min !== p.max) return `${p.currency} ${p.min}–${p.max}${unit}`;
  if (p.min != null || p.max != null) return `${p.currency} ${p.max ?? p.min}${unit}`;
  return null;
}

function Stars({ value }: { value: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= value ? "star" : "star-outline"} size={13} color={theme.primary} />
      ))}
    </View>
  );
}

const COLLAPSED = 3;

// Tab navigators (the Profile tab) have no push(); stack screens do. Use push
// when available so profile -> profile -> profile can be backed out of.
const go = (navigation: any, name: string, params: object) =>
  navigation.push ? navigation.push(name, params) : navigation.navigate(name, params);

// References, Reviews and Work history for a user. Used on the signed-in
// user's own Profile and on every other user's public/applicant profile; all
// data comes from /users/:id/reviews and /users/:id/history.
export default function ProfileSections({ userId, navigation }: { userId: string; navigation: any }) {
  const { theme } = useTheme();
  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [history, setHistory] = useState<{ posted: HistoryItem[]; worked: HistoryItem[] } | null>(null);
  const [tab, setTab] = useState<"posted" | "worked">("worked");
  const [showAllRefs, setShowAllRefs] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [r, h] = await Promise.all([
            api<ReviewItem[]>(`/users/${userId}/reviews`),
            api<{ posted: HistoryItem[]; worked: HistoryItem[] }>(`/users/${userId}/history`),
          ]);
          if (!alive) return;
          setReviews(r);
          setHistory(h);
          setError("");
        } catch (e: any) {
          if (alive) setError(e.message || "Couldn't load profile details");
        }
      })();
      return () => {
        alive = false;
      };
    }, [userId])
  );

  const empty = (msg: string) => <Text style={[typography.body, { color: theme.textSecondary }]}>{msg}</Text>;

  const references = (reviews ?? []).filter((r) => !!r.reference);
  const refsShown = showAllRefs ? references : references.slice(0, COLLAPSED);
  const reviewsShown = showAllReviews ? reviews ?? [] : (reviews ?? []).slice(0, COLLAPSED);
  const items = history ? history[tab] : [];

  const toggle = (open: boolean, set: (v: boolean) => void, total: number) =>
    total > COLLAPSED ? (
      <TouchableOpacity onPress={() => set(!open)} style={{ paddingTop: spacing.sm }}>
        <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>{open ? "Show less" : `Show all (${total})`}</Text>
      </TouchableOpacity>
    ) : null;

  const who = (r: ReviewItem) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 }}>
      <Avatar
        name={`${r.reviewer.firstName} ${r.reviewer.lastName}`}
        uri={r.reviewer.avatarUrl}
        size={34}
        onPress={() => go(navigation, "UserProfile", { userId: r.reviewer.id })}
      />
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyBold, { color: theme.textPrimary }]} numberOfLines={1}>
          {shortName(r.reviewer)}
        </Text>
        <Text style={[typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
          {r.reviewerRole} · {r.job.title}
        </Text>
      </View>
      <Text style={[typography.caption, { color: theme.textSecondary }]}>{fmtDate(r.createdAt)}</Text>
    </View>
  );

  return (
    <View>
      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.sm }}>{error}</Text> : null}

      <SectionLabel>References</SectionLabel>
      <Card>
        {reviews === null ? null : references.length === 0 ? (
          empty("No references yet.")
        ) : (
          <>
            {refsShown.map((r, i) => (
              <View
                key={r.id}
                style={i > 0 ? { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border } : undefined}
              >
                {who(r)}
                <Text style={[typography.body, { color: theme.textPrimary }]}>“{r.reference}”</Text>
              </View>
            ))}
            {toggle(showAllRefs, setShowAllRefs, references.length)}
          </>
        )}
      </Card>

      <SectionLabel>Reviews</SectionLabel>
      <Card>
        {reviews === null ? null : reviews.length === 0 ? (
          empty("No reviews yet.")
        ) : (
          <>
            {reviewsShown.map((r, i) => (
              <View
                key={r.id}
                style={i > 0 ? { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border } : undefined}
              >
                {who(r)}
                <Stars value={r.stars} />
                {r.comment ? <Text style={[typography.body, { color: theme.textPrimary, marginTop: 4 }]}>{r.comment}</Text> : null}
              </View>
            ))}
            {toggle(showAllReviews, setShowAllReviews, reviews.length)}
          </>
        )}
      </Card>

      <SectionLabel>Work history</SectionLabel>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
        {(["worked", "posted"] as const).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                height: 40,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? theme.accentSoft : theme.surfaceAlt,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
              }}
            >
              <Text style={{ color: active ? theme.primary : theme.textSecondary, fontWeight: "700", fontSize: 13 }}>
                {t === "worked" ? "Jobs Worked" : "Jobs Posted"}
                {history ? ` (${history[t].length})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {history === null ? null : items.length === 0 ? (
        <Card>{empty(tab === "worked" ? "No jobs worked yet." : "No jobs posted yet.")}</Card>
      ) : (
        items.map((j) => {
          const pay = payLabel(j.pay);
          return (
            <TouchableOpacity key={`${tab}-${j.jobId}`} activeOpacity={0.85} onPress={() => go(navigation, "JobDetail", { jobId: j.jobId })}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                  <Text style={[typography.h3, { color: theme.textPrimary, flex: 1 }]} numberOfLines={2}>
                    {j.title}
                  </Text>
                  <Badge label={status(j.status)} tone={STATUS_TONE[j.status] ?? "neutral"} />
                </View>
                <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
                  {fmtDate(j.date)}
                  {pay ? ` · ${pay}` : ""}
                </Text>
                {j.rating ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Stars value={j.rating.stars} />
                    {j.rating.comment ? (
                      <Text style={[typography.body, { color: theme.textPrimary, marginTop: 4 }]} numberOfLines={3}>
                        {j.rating.comment}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
