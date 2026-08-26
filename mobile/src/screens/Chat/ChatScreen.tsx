import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api, apiUpload } from "../../api/client";
import { Message } from "../../types";
import { spacing, typography, radius } from "../../theme/theme";

export default function ChatScreen({ route }: any) {
  const { jobId, jobTitle } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const data = await api<Message[]>(`/messages/job/${jobId}`);
    setMessages(data);
  }, [jobId]);

  useEffect(() => {
    load();
    // Simple polling — swap for a socket.io subscription for true real-time.
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    const body = text;
    setText("");
    await api("/messages", { method: "POST", body: { jobId, body } });
    load();
  };

  const sendPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;

    const form = new FormData();
    form.append("jobId", jobId);
    form.append("photo", { uri: result.assets[0].uri, name: "photo.jpg", type: "image/jpeg" } as any);
    await apiUpload("/messages/with-photo", form);
    load();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Text style={[typography.h3, { color: theme.textPrimary, padding: spacing.md }]} numberOfLines={1}>
        {jobTitle}
      </Text>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          if (item.systemEvent) {
            return (
              <View style={{ alignItems: "center", marginVertical: spacing.sm }}>
                <Text style={[typography.caption, { color: theme.textSecondary, backgroundColor: theme.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill }]}>
                  {item.body}
                </Text>
              </View>
            );
          }
          return (
            <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: spacing.sm }}>
              <View
                style={{
                  maxWidth: "78%",
                  backgroundColor: mine ? theme.primary : theme.surfaceAlt,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                }}
              >
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={{ width: 200, height: 150, borderRadius: radius.sm, marginBottom: item.body ? spacing.xs : 0 }} />
                )}
                {item.body ? <Text style={{ color: mine ? theme.textInverse : theme.textPrimary }}>{item.body}</Text> : null}
              </View>
            </View>
          );
        }}
      />
      <View style={{ flexDirection: "row", padding: spacing.md, gap: spacing.sm, alignItems: "center" }}>
        <TouchableOpacity onPress={sendPhoto} style={{ padding: 10 }}>
          <Text style={{ fontSize: 22 }}>📷</Text>
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={theme.textSecondary}
          style={{ flex: 1, backgroundColor: theme.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, color: theme.textPrimary }}
          onSubmitEditing={send}
        />
        <TouchableOpacity onPress={send} style={{ backgroundColor: theme.primary, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: spacing.md }}>
          <Text style={{ color: theme.textInverse, fontWeight: "700" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
