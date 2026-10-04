import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api, API_URL } from "../../api/client";
import { Avatar, Badge, EmptyState } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

interface Conversation {
  jobId: string;
  jobTitle: string;
  status: string;
  iAmHirer: boolean;
  counterparts: { id: string; firstName: string; lastName?: string; avatarUrl?: string | null }[];
  lastMessage: {
    body: string;
    hasImage: boolean;
    hasLocation: boolean;
    systemEvent?: string | null;
    senderId: string;
    createdAt: string;
  } | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const abs = (u?: string | null) => (u ? (u.startsWith("http") ? u : `${API_URL}${u}`) : null);

export default function MessagesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRows(await api<Conversation[]>("/messages/conversations"));
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const preview = (c: Conversation) => {
    const m = c.lastMessage;
    if (!m) return "No messages yet — say hello";
    const prefix = m.senderId === user?.id && !m.systemEvent ? "You: " : "";
    if (m.hasLocation) return `${prefix}📍 Location`;
    if (m.hasImage) return `${prefix}📷 Photo${m.body ? ` · ${m.body}` : ""}`;
    return `${prefix}${m.body}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl + spacing.sm, paddingBottom: spacing.md }}>
        <Text style={[typography.h1, { color: theme.textPrimary }]}>Messages</Text>
        <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
          Chats open once a bid is accepted
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.jobId}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="chatbubbles-outline"
              message="No conversations yet. When you hire someone — or your bid is accepted — the job chat shows up here."
            />
          ) : null
        }
        renderItem={({ item }) => {
          const other = item.counterparts[0];
          const names = item.counterparts.map((p) => p.firstName).join(", ") || "Waiting for a worker";
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Chat", { jobId: item.jobId, jobTitle: item.jobTitle })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                gap: spacing.md,
              }}
            >
              {item.counterparts.length > 1 ? (
                // Several workers on one job: overlap the first two avatars
                <View style={{ width: 58, height: 46 }}>
                  {item.counterparts.slice(0, 2).map((p, i) => (
                    <View key={p.id} style={{ position: "absolute", left: i * 20, top: i * 6, borderWidth: 2, borderColor: theme.surface, borderRadius: 24 }}>
                      <Avatar name={`${p.firstName} ${p.lastName ?? ""}`} uri={abs(p.avatarUrl)} size={34} />
                    </View>
                  ))}
                </View>
              ) : (
                <Avatar name={other ? `${other.firstName} ${other.lastName ?? ""}` : "?"} uri={abs(other?.avatarUrl)} size={46} />
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: "700", fontSize: 15, flex: 1 }} numberOfLines={1}>
                    {item.jobTitle}
                  </Text>
                  {item.lastMessage ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>
                      {timeAgo(item.lastMessage.createdAt)}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                  {item.iAmHirer ? "Hiring" : "Working for"} · {item.iAmHirer ? names : other?.firstName}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
                  {preview(item)}
                </Text>
              </View>
              <Badge label={item.status.replace("_", " ")} tone={item.status === "COMPLETED" ? "success" : "accent"} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
