import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Card, Badge, Button, ScreenTitle, EmptyState } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

type Tab = "overview" | "users" | "jobs" | "reports";

export default function AdminDashboardScreen() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <ScreenTitle>Admin</ScreenTitle>
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md }}>
        {(["overview", "users", "jobs", "reports"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              backgroundColor: tab === t ? theme.primary : theme.chipBackground,
            }}
          >
            <Text style={{ color: tab === t ? theme.textInverse : theme.chipText, fontWeight: "600", textTransform: "capitalize" }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab />}
      {tab === "jobs" && <JobsTab />}
      {tab === "reports" && <ReportsTab />}
    </View>
  );
}

function OverviewTab() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api("/admin/overview").then(setStats).catch(() => {});
  }, []);

  if (!stats) return <EmptyState message="Loading..." />;

  const cards = [
    { label: "Total users", value: stats.users },
    { label: "Active jobs", value: stats.activeJobs },
    { label: "Disputed jobs", value: stats.disputedJobs },
    { label: "Open reports", value: stats.openReports },
    { label: "Banned users", value: stats.bannedUsers },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {cards.map((c) => (
          <Card key={c.label} style={{ width: "47%" }}>
            <Text style={[typography.h1, { color: theme.primary }]}>{c.value}</Text>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>{c.label}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

function UsersTab() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = () => api(`/admin/users?q=${encodeURIComponent(q)}`).then(setUsers).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const moderate = async (id: string, action: "suspend" | "ban" | "reinstate") => {
    Alert.prompt?.(
      "Reason",
      `Why are you ${action === "reinstate" ? "reinstating" : action + "ing"} this user?`,
      async (reason) => {
        if (!reason) return;
        await api(`/admin/users/${id}/${action}`, { method: "POST", body: { reason } });
        load();
      }
    ) ??
      // Alert.prompt is iOS-only; fall back to a fixed reason on Android.
      (async () => {
        await api(`/admin/users/${id}/${action}`, { method: "POST", body: { reason: `${action} via admin dashboard` } });
        load();
      })();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
      <TextInput
        placeholder="Search by name or email"
        placeholderTextColor={theme.textSecondary}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={load}
        style={{ backgroundColor: theme.surfaceAlt, borderRadius: radius.md, padding: 12, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md }}
      />
      {users.map((u) => (
        <Card key={u.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs }}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{u.firstName} {u.lastName}</Text>
            <Badge label={u.accountStatus} tone={u.accountStatus === "ACTIVE" ? "success" : u.accountStatus === "SUSPENDED" ? "warning" : "danger"} />
          </View>
          <Text style={{ color: theme.textSecondary, marginBottom: spacing.sm }}>{u.email}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {u.accountStatus !== "SUSPENDED" && <Button title="Suspend" variant="secondary" onPress={() => moderate(u.id, "suspend")} />}
            {u.accountStatus !== "BANNED" && <Button title="Ban" variant="danger" onPress={() => moderate(u.id, "ban")} />}
            {u.accountStatus !== "ACTIVE" && <Button title="Reinstate" variant="secondary" onPress={() => moderate(u.id, "reinstate")} />}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function JobsTab() {
  const { theme } = useTheme();
  const [jobs, setJobs] = useState<any[]>([]);

  const load = () => api("/admin/jobs").then(setJobs).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const cancelJob = async (id: string) => {
    await api(`/admin/jobs/${id}/cancel`, { method: "POST", body: { reason: "Cancelled by admin — policy violation or dispute resolution" } });
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
      {jobs.map((j) => (
        <Card key={j.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs }}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>{j.title}</Text>
            <Badge label={j.status} tone={j.status === "DISPUTED" ? "danger" : "neutral"} />
          </View>
          <Text style={{ color: theme.textSecondary, marginBottom: spacing.sm }}>
            Hirer: {j.hirer?.firstName} {j.hirer?.lastName} {j.worker ? `· Worker: ${j.worker.firstName} ${j.worker.lastName}` : ""}
          </Text>
          {j.status !== "CANCELLED" && j.status !== "COMPLETED" && <Button title="Cancel job" variant="danger" onPress={() => cancelJob(j.id)} />}
        </Card>
      ))}
    </ScrollView>
  );
}

function ReportsTab() {
  const { theme } = useTheme();
  const [reports, setReports] = useState<any[]>([]);

  const load = () => api("/reports").then(setReports).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const resolve = async (id: string, status: "RESOLVED" | "DISMISSED") => {
    await api(`/reports/${id}`, { method: "PATCH", body: { status, resolutionNote: `Marked ${status} via admin dashboard` } });
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
      {reports.length === 0 && <EmptyState message="No reports." />}
      {reports.map((r) => (
        <Card key={r.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs }}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>{r.reason.replace("_", " ")}</Text>
            <Badge label={r.status} tone={r.status === "OPEN" ? "warning" : "neutral"} />
          </View>
          <Text style={{ color: theme.textSecondary, marginBottom: spacing.sm }}>
            {r.reporter?.firstName} reported {r.target?.firstName} {r.details ? `— "${r.details}"` : ""}
          </Text>
          {r.status === "OPEN" && (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Button title="Resolve" onPress={() => resolve(r.id, "RESOLVED")} />
              <Button title="Dismiss" variant="secondary" onPress={() => resolve(r.id, "DISMISSED")} />
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
