import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api, apiUpload, uriToBlob, API_URL } from "../../api/client";
import { Job, Bid } from "../../types";
import { Card, Badge, Button, EmptyState } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

const STATUS_TONE: Record<string, any> = {
  OPEN: "success",
  ASSIGNED: "accent",
  IN_PROGRESS: "accent",
  SUBMITTED: "warning",
  COMPLETED: "success",
  DISPUTED: "danger",
  CANCELLED: "neutral",
};

export default function JobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Job>(`/jobs/${jobId}`);
      setJob(data);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !job) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState message="Loading job..." />
      </View>
    );
  }

  const isHirer = user?.id === job.hirerId;
  const isWorker = user?.id === job.workerId;
  const myBid = job.bids?.find((b) => b.bidderId === user?.id);

  const placeBid = async () => {
    try {
      await api("/bids", { method: "POST", body: { jobId: job.id, amount: Number(bidAmount), message: bidMessage || undefined } });
      Alert.alert("Bid placed!", "The hirer will be notified.");
      load();
    } catch (e: any) {
      Alert.alert("Couldn't place bid", e.message);
    }
  };

  const acceptBid = async (bid: Bid) => {
    try {
      await api(`/bids/${bid.id}/accept`, { method: "POST" });
      await api("/escrow/fund", { method: "POST", body: { jobId: job.id, amount: bid.amount } });
      Alert.alert("Bid accepted", "Payment is now held in escrow until you confirm the job is done.");
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const uploadPhoto = async (endpoint: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera permission needed");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;

    const form = new FormData();
    const blob = await uriToBlob(result.assets[0].uri);
    form.append("photo", blob, "photo.jpg");
    try {
      await apiUpload(`/jobs/${job.id}/${endpoint}`, form);
      load();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    }
  };

  const completeChecklistItem = async (itemId: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const result = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.6 }) : null;

    const form = new FormData();
    if (result && !result.canceled) {
      const blob = await uriToBlob(result.assets[0].uri);
      form.append("photo", blob, "proof.jpg");
    }
    try {
      await apiUpload(`/checklist/${itemId}/complete`, form);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const submitJob = async () => {
    try {
      await api(`/checklist/job/${job.id}/submit`, { method: "POST" });
      Alert.alert("Submitted", "The hirer has been notified to review your work.");
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const confirmComplete = async () => {
    try {
      await api(`/checklist/job/${job.id}/confirm-complete`, { method: "POST" });
      await api(`/escrow/${job.id}/release`, { method: "POST" });
      Alert.alert("Job completed!", "Payment has been released to the worker. Don't forget to leave a rating.");
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[typography.h1, { color: theme.textPrimary, flex: 1 }]}>{job.title}</Text>
        <Badge label={job.status.replace("_", " ")} tone={STATUS_TONE[job.status]} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md }}>
        <Badge label={job.category} />
        <Badge label={job.payType === "hourly" ? `${job.currency} ${job.budgetMin}-${job.budgetMax}/hr` : `${job.currency} ${job.budgetMin}-${job.budgetMax}`} tone="accent" />
        {job.durationEstimate && <Badge label={job.durationEstimate} />}
        {job.workersNeeded > 1 && <Badge label={`${job.workersNeeded} workers needed`} />}
        {job.requiresLicense && <Badge label={`Requires: ${job.requiresLicense}`} tone="warning" />}
        {job.requiresIdVerification && <Badge label="ID verification required" tone="warning" />}
      </View>

      <Text style={[typography.body, { color: theme.textPrimary, marginBottom: spacing.lg }]}>{job.description}</Text>

      {job.previewPhotoUrls && job.previewPhotoUrls.length > 0 && (
        <Card>
          <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Photos of the work site</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {job.previewPhotoUrls.map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={{ width: 160, height: 160, borderRadius: radius.md, marginRight: spacing.sm }}
              />
            ))}
          </ScrollView>
        </Card>
      )}

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.xs }]}>Posted by</Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          {job.hirer?.firstName} {job.hirer?.lastName} · ⭐ {job.hirer?.avgRating ?? "—"}
        </Text>
      </Card>

      {/* Before / after proof photos */}
      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Proof of condition</Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <PhotoSlot label="Before" url={job.beforePhotoUrl} />
          <PhotoSlot label="After" url={job.afterPhotoUrl} />
        </View>
        {isHirer && job.status === "ASSIGNED" && !job.beforePhotoUrl && (
          <Button title="Take before photo" variant="secondary" onPress={() => uploadPhoto("before-photo")} style={{ marginTop: spacing.md }} />
        )}
        {isHirer && (job.status === "SUBMITTED" || job.status === "COMPLETED") && !job.afterPhotoUrl && (
          <Button title="Take after photo" variant="secondary" onPress={() => uploadPhoto("after-photo")} style={{ marginTop: spacing.md }} />
        )}
      </Card>

      {/* Checklist */}
      {job.checklistItems && job.checklistItems.length > 0 && (
        <Card>
          <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Task checklist</Text>
          {job.checklistItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              disabled={!isWorker || item.isDone}
              onPress={() => completeChecklistItem(item.id)}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: item.isDone ? theme.success : theme.border,
                  backgroundColor: item.isDone ? theme.success : "transparent",
                  marginRight: spacing.sm,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.isDone && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={[typography.body, { color: theme.textPrimary, flex: 1, textDecorationLine: item.isDone ? "line-through" : "none" }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Bidding (visible to everyone browsing an OPEN job) */}
      {job.status === "OPEN" && !isHirer && (
        <Card>
          <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>
            {myBid ? "Your bid" : "Place a bid"}
          </Text>
          {myBid ? (
            <Text style={[typography.body, { color: theme.textSecondary }]}>
              You bid {job.currency} {myBid.amount} — status: {myBid.status}
            </Text>
          ) : (
            <>
              <TextInput
                placeholder="Your price ($)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
                style={{ backgroundColor: theme.surfaceAlt, borderRadius: radius.md, padding: 12, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.sm }}
              />
              <TextInput
                placeholder="Optional message"
                placeholderTextColor={theme.textSecondary}
                value={bidMessage}
                onChangeText={setBidMessage}
                style={{ backgroundColor: theme.surfaceAlt, borderRadius: radius.md, padding: 12, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.md }}
              />
              <Button title="Submit bid" onPress={placeBid} disabled={!bidAmount} />
            </>
          )}
        </Card>
      )}

      {/* Hirer's view of all bids */}
      {isHirer && job.status === "OPEN" && (
        <Card>
          <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>
            Bids ({job.bids?.filter((b) => b.status === "PENDING").length || 0})
          </Text>
          {job.bids?.filter((b) => b.status === "PENDING").length === 0 && <Text style={{ color: theme.textSecondary }}>No bids yet.</Text>}
          {job.bids
            ?.filter((b) => b.status === "PENDING")
            .map((bid) => (
              <View key={bid.id} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: spacing.sm, marginTop: spacing.sm }}>
                <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
                  {bid.bidder?.firstName} {bid.bidder?.lastName} — {job.currency} {bid.amount}
                </Text>
                <Text style={{ color: theme.textSecondary, marginBottom: spacing.sm }}>⭐ {bid.bidder?.avgRating ?? "—"} {bid.message ? `· "${bid.message}"` : ""}</Text>
                <Button title="Accept bid" onPress={() => acceptBid(bid)} />
              </View>
            ))}
        </Card>
      )}

      {/* Chat / messages link */}
      {(isHirer || isWorker) && job.status !== "OPEN" && (
        <Button title="Open job chat" variant="secondary" onPress={() => navigation.navigate("Chat", { jobId: job.id, jobTitle: job.title })} style={{ marginBottom: spacing.md }} />
      )}

      {/* Worker: submit job */}
      {isWorker && (job.status === "ASSIGNED" || job.status === "IN_PROGRESS") && (
        <Button title="Mark job as complete" onPress={submitJob} />
      )}

      {/* Hirer: confirm completion */}
      {isHirer && job.status === "SUBMITTED" && (
        <Button title="Confirm & release payment" variant="accent" onPress={confirmComplete} />
      )}

      {/* Cancel (hirer, before assignment) */}
      {isHirer && job.status === "OPEN" && (
        <Button
          title="Cancel job"
          variant="danger"
          onPress={async () => {
            try {
              await api(`/jobs/${job.id}/cancel`, { method: "POST" });
              load();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          }}
          style={{ marginTop: spacing.sm }}
        />
      )}

      {/* Report */}
      {(isHirer || isWorker) && (
        <Button
          title="Report a problem"
          variant="secondary"
          onPress={() => navigation.navigate("ReportUser", { jobId: job.id, targetUserId: isHirer ? job.workerId : job.hirerId })}
          style={{ marginTop: spacing.sm }}
        />
      )}
    </ScrollView>
  );
}

function PhotoSlot({ label, url }: { label: string; url?: string | null }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.xs }]}>{label}</Text>
      {url ? (
        <Image source={{ uri: url }} style={{ width: "100%", height: 120, borderRadius: radius.md }} />
      ) : (
        <View style={{ width: "100%", height: 120, borderRadius: radius.md, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.textSecondary }}>No photo yet</Text>
        </View>
      )}
    </View>
  );
}
