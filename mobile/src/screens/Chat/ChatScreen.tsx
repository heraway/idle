import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { io, Socket } from "socket.io-client";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api, apiUpload, API_URL, getToken } from "../../api/client";
import { appendImage, imageMediaTypes } from "../../utils/media";
import { Job, Message } from "../../types";
import { Avatar } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

const abs = (u?: string | null) => (u ? (u.startsWith("http") ? u : `${API_URL}${u}`) : undefined);
const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatScreen({ route, navigation }: any) {
  const { jobId, jobTitle } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false); // photo / location upload in flight
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);

  const isHirer = !!job && job.hirerId === user?.id;

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  // A deleted message stays in the list as a quiet placeholder; nothing else changes.
  const markDeleted = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, body: "", imageUrl: null, latitude: null, longitude: null, locationLabel: null, locationKind: null, locationExpired: false, deletedAt: new Date().toISOString() }
          : m
      )
    );
  }, []);

  const confirmDelete = (item: Message) => {
    Alert.alert("Delete message?", "This removes the message for everyone in this chat. The conversation stays.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/messages/${item.id}`, { method: "DELETE" });
            markDeleted(item.id);
          } catch (e: any) {
            Alert.alert("Couldn't delete message", e.message);
          }
        },
      },
    ]);
  };

  const load = useCallback(async () => {
    try {
      setMessages(await api<Message[]>(`/messages/job/${jobId}`));
    } catch (e: any) {
      Alert.alert("Couldn't load messages", e.message);
    }
  }, [jobId]);

  useEffect(() => {
    load();
    api<Job>(`/jobs/${jobId}`)
      .then(setJob)
      .catch(() => {});

    // The chat socket is authenticated; the server only lets participants of
    // this job join its room.
    let socket: Socket | null = null;
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled || !token) return;
      socket = io(API_URL, { transports: ["websocket"], auth: { token } });
      socketRef.current = socket;
      socket.on("connect", () => socket?.emit("joinJobChat", jobId));
      socket.on("newMessage", (msg: Message) => addMessage(msg));
      socket.on("messageDeleted", ({ id }: { id: string }) => markDeleted(id));
    })();

    return () => {
      cancelled = true;
      socket?.emit("leaveJobChat", jobId);
      socket?.disconnect();
    };
  }, [jobId, load, addMessage, markDeleted]);

  // ---------------------------------------------------------- send text
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      const msg = await api<Message>("/messages", { method: "POST", body: { jobId, body } });
      addMessage(msg);
    } catch (e: any) {
      setText(body); // give the text back so nothing is lost
      Alert.alert("Message not sent", e.message);
    }
  };

  // ---------------------------------------------------------- send photo
  const sendAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("jobId", jobId);
      const caption = text.trim();
      if (caption) form.append("body", caption);
      await appendImage(form, "photo", asset, "chat");
      const msg = await apiUpload<Message>("/messages/with-photo", form);
      if (caption) setText("");
      addMessage(msg);
    } catch (e: any) {
      Alert.alert("Photo not sent", e.message);
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    setSheetOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Allow camera access in your phone settings to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) sendAsset(result.assets[0]);
  };

  const pickFromGallery = async () => {
    setSheetOpen(false);
    // The system photo picker on modern Android/iOS needs no permission prompt.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaTypes(),
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) sendAsset(result.assets[0]);
  };

  // ------------------------------------------------------- send location
  // Both actions are explicit, one-off taps. Nothing in this screen ever reads
  // or sends a location on its own.
  const sendJobLocation = async () => {
    setSheetOpen(false);
    setBusy(true);
    try {
      // No coordinates are sent: the server pins the job's own location, and only
      // shows it to people who are currently allowed to see it.
      const msg = await api<Message>("/messages/share-job-location", { method: "POST", body: { jobId } });
      addMessage(msg);
    } catch (e: any) {
      Alert.alert("Location not sent", e.message);
    } finally {
      setBusy(false);
    }
  };

  const shareMyLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Location permission needed", "Allow location access to share where you are.");
      return;
    }
    setBusy(true);
    const pos = await Location.getCurrentPositionAsync({}).catch(() => null);
    if (!pos) {
      setBusy(false);
      Alert.alert("Couldn't get your location", "Check that location is turned on and try again.");
      return;
    }
    try {
      const msg = await api<Message>("/messages/share-my-location", {
        method: "POST",
        body: { jobId, latitude: pos.coords.latitude, longitude: pos.coords.longitude, consent: true },
      });
      addMessage(msg);
    } catch (e: any) {
      Alert.alert("Location not sent", e.message);
    } finally {
      setBusy(false);
    }
  };

  const sendMyLocation = () => {
    setSheetOpen(false);
    const other = isHirer ? "the worker" : "the employer";
    Alert.alert(
      "Share your current location?",
      `This sends a one-time pin of where you are right now to ${other} in this chat. It isn't live and it stops being available when the job ends.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Share", onPress: shareMyLocation },
      ]
    );
  };

  // -------------------------------------------------------------- render
  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.senderId === user?.id;

    if (item.systemEvent) {
      return (
        <View style={{ alignItems: "center", marginVertical: spacing.sm }}>
          <Text
            style={[
              typography.caption,
              {
                color: theme.textSecondary,
                backgroundColor: theme.surfaceAlt,
                paddingHorizontal: spacing.md,
                paddingVertical: 5,
                borderRadius: radius.pill,
                overflow: "hidden",
              },
            ]}
          >
            {item.body}
          </Text>
        </View>
      );
    }

    const hasLocation = typeof item.latitude === "number" && typeof item.longitude === "number";
    const fg = mine ? "#FFFFFF" : theme.textPrimary;

    if (item.deletedAt) {
      return (
        <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.border }}>
            <Ionicons name="ban-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontStyle: "italic", fontSize: 13 }}>
              {mine ? "You deleted this message" : "This message was deleted"}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: spacing.sm }}>
        {!mine ? (
          <View style={{ marginRight: spacing.xs }}>
            <Avatar
              name={item.sender?.firstName}
              uri={item.sender?.avatarUrl}
              size={28}
              onPress={() => navigation.navigate("UserProfile", { userId: item.senderId })}
            />
          </View>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.95}
          onLongPress={mine ? () => confirmDelete(item) : undefined}
          delayLongPress={350}
          accessibilityHint={mine ? "Long press to delete this message" : undefined}
          style={{ maxWidth: "80%" }}
        >
        <View
          style={{
            backgroundColor: mine ? theme.primary : theme.bubbleOther,
            borderRadius: 18,
            borderBottomRightRadius: mine ? 4 : 18,
            borderBottomLeftRadius: mine ? 18 : 4,
            padding: item.imageUrl ? 4 : spacing.md,
            paddingVertical: item.imageUrl ? 4 : 10,
          }}
        >
          {item.imageUrl ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setViewerUrl(abs(item.imageUrl) || null)}>
              <Image
                source={{ uri: abs(item.imageUrl) }}
                style={{ width: 220, height: 170, borderRadius: 14, backgroundColor: theme.surfaceAlt }}
              />
            </TouchableOpacity>
          ) : null}

          {hasLocation ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Linking.openURL(mapsUrl(item.latitude as number, item.longitude as number))}
              style={{ minWidth: 190 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: mine ? "rgba(255,255,255,0.2)" : theme.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="location" size={22} color={mine ? "#fff" : theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: fg, fontWeight: "700" }} numberOfLines={2}>
                    {item.locationLabel || "Shared location"}
                  </Text>
                  <Text style={{ color: mine ? "rgba(255,255,255,0.85)" : theme.primary, fontSize: 12, fontWeight: "600", marginTop: 2 }}>
                    Open in Maps →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {item.locationExpired ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 190 }}>
              <Ionicons name="location-outline" size={20} color={mine ? "rgba(255,255,255,0.85)" : theme.textSecondary} />
              <Text style={{ color: mine ? "rgba(255,255,255,0.85)" : theme.textSecondary, fontSize: 13, flex: 1 }}>
                Location no longer available
              </Text>
            </View>
          ) : null}

          {item.body ? (
            <Text style={{ color: fg, fontSize: 15, lineHeight: 21, padding: item.imageUrl ? 8 : 0, paddingBottom: item.imageUrl ? 4 : 0 }}>
              {item.body}
            </Text>
          ) : null}
        </View>
        </TouchableOpacity>
        {mine ? (
          <View style={{ marginLeft: spacing.xs }}>
            <Avatar name={user?.firstName} uri={user?.avatarUrl} size={28} />
          </View>
        ) : null}
        <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3, marginHorizontal: 4 }}>{hhmm(item.createdAt)}</Text>
      </View>
    );
  };

  const SheetAction = ({
    icon,
    label,
    sub,
    onPress,
  }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    sub?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: spacing.md }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontWeight: "700", fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 1 }}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Job strip — tap to jump to the job itself */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate("JobDetail", { jobId })}
        style={{
          flexDirection: "row",
          alignItems: "center",
          margin: spacing.md,
          marginBottom: 0,
          padding: spacing.md,
          gap: spacing.md,
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: radius.lg,
        }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="briefcase" size={19} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textPrimary, fontWeight: "700" }} numberOfLines={1}>
            {job?.title || jobTitle}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 1 }}>
            {job ? job.status.replace("_", " ") : "Loading…"} · tap to view job
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m: Message) => m.id}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={renderMessage}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, marginTop: spacing.sm, textAlign: "center" }}>
              No messages yet. Say hello, share a photo{isHirer ? ", or send the job location" : ""}.
            </Text>
          </View>
        }
      />

      {busy ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: 6 }}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Sending…</Text>
        </View>
      ) : null}

      {/* Composer */}
      <View style={{ flexDirection: "row", padding: spacing.md, gap: spacing.sm, alignItems: "flex-end" }}>
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.8}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message…"
          placeholderTextColor={theme.textSecondary + "99"}
          multiline
          style={{
            flex: 1,
            maxHeight: 110,
            minHeight: 46,
            backgroundColor: theme.surfaceAlt,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 23,
            paddingHorizontal: spacing.md,
            paddingTop: 12,
            paddingBottom: 12,
            color: theme.textPrimary,
          }}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim()}
          activeOpacity={0.8}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: theme.primary,
            opacity: text.trim() ? 1 : 0.45,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="send" size={19} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* Attach sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setSheetOpen(false)} style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" }}>
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: spacing.lg,
              paddingBottom: spacing.xl,
              borderColor: theme.border,
              borderWidth: 1,
            }}
          >
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, marginBottom: spacing.md }} />
            <SheetAction icon="camera" label="Take a photo" sub="Use your camera" onPress={takePhoto} />
            <SheetAction icon="images" label="Choose from gallery" sub="Pick an existing photo" onPress={pickFromGallery} />
            {isHirer && job && (job.assignments?.length ?? 0) > 0 && !["COMPLETED", "CANCELLED"].includes(job.status) ? (
              <SheetAction
                icon="navigate"
                label="Send job location"
                sub="Exact job address, only visible to the hired worker while the job is active"
                onPress={sendJobLocation}
              />
            ) : null}
            <SheetAction
              icon="location"
              label="Share my current location"
              sub="Optional. You'll be asked to confirm, and it's sent once, never live"
              onPress={sendMyLocation}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Full-screen photo viewer */}
      <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setViewerUrl(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }}>
          {viewerUrl ? <Image source={{ uri: viewerUrl }} resizeMode="contain" style={{ width: "100%", height: "80%" }} /> : null}
          <Text style={{ color: "#fff", textAlign: "center", marginTop: spacing.md }}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
