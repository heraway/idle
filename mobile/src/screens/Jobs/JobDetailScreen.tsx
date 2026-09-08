import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Alert,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
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

const resolveImageUrl = (path?: string | null) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
};

export default function JobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Job>(`/jobs/${jobId}`);
      if (isMounted.current) {
        setJob(data);
      }
    } catch (e: any) {
      if (isMounted.current) {
        Alert.alert("Error", e.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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
  const isWorker =
    job.assignments?.some((assignment) => assignment.workerId === user?.id) ??
    false;
  const assignedWorkerId = job.assignments?.[0]?.workerId;
  const myBid = job.bids?.find((b) => b.bidderId === user?.id);

  const placeBid = async () => {
    try {
      await api("/bids", {
        method: "POST",
        body: {
          jobId: job.id,
          amount: Number(bidAmount),
          message: bidMessage || undefined,
        },
      });
      Alert.alert("Bid placed!", "The hirer will be notified.");
      load();
    } catch (e: any) {
      Alert.alert("Couldn't place bid", e.message);
    }
  };

  const acceptBid = async (bid: Bid) => {
    try {
      const result = await api<{
        status: Job["status"];
        escrowAmount: number;
      }>(`/bids/${bid.id}/accept`, { method: "POST" });
      if (result.status === "ASSIGNED") {
        await api("/escrow/fund", {
          method: "POST",
          body: { jobId: job.id, amount: result.escrowAmount },
        });
        Alert.alert(
          "Bid accepted",
          "All worker slots are filled and payment is now held in escrow."
        );
      } else {
        Alert.alert(
          "Bid accepted",
          "The worker was added. Accept more bids to fill the remaining slots."
        );
      }
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const askQuestion = async () => {
    try {
      await api("/questions", {
        method: "POST",
        body: { jobId: job.id, body: questionText.trim() },
      });
      setQuestionText("");
      load();
    } catch (e: any) {
      Alert.alert("Couldn't post question", e.message);
    }
  };

  const answerQuestion = async (questionId: string) => {
    const text = (answerDrafts[questionId] || "").trim();
    if (!text) return;
    try {
      await api(`/questions/${questionId}/answer`, {
        method: "PATCH",
        body: { answerBody: text },
      });
      setAnswerDrafts((d) => ({ ...d, [questionId]: "" }));
      load();
    } catch (e: any) {
      Alert.alert("Couldn't post reply", e.message);
    }
  };

  const uploadPhoto = async (endpoint: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "Permission required",
        "Camera permission is required to capture photos."
      );
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]?.uri) return;

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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    let result = null;

    if (status === "granted") {
      result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    }

    const form = new FormData();
    if (result && !result.canceled && result.assets?.[0]?.uri) {
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
      Alert.alert(
        "Submitted",
        "The hirer has been notified to review your work."
      );
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const confirmComplete = async () => {
    try {
      await api(`/checklist/job/${job.id}/confirm-complete`, {
        method: "POST",
      });
      await api(`/escrow/${job.id}/release`, { method: "POST" });
      Alert.alert(
        "Job completed!",
        "Payment has been released to the worker. Don't forget to leave a rating."
      );
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.h1, { color: theme.textPrimary, flex: 1 }]}>
          {job.title}
        </Text>
        <Badge
          label={job.status.replace("_", " ")}
          tone={STATUS_TONE[job.status]}
        />
      </View>

      <View style={styles.badgeRow}>
        <Badge label={job.category} />
        <Badge
          label={
            job.payType === "hourly"
              ? `${job.currency} ${job.budgetMin}-${job.budgetMax}/hr`
              : `${job.currency} ${job.budgetMin}-${job.budgetMax}`
          }
          tone="accent"
        />
        {job.durationEstimate && <Badge label={job.durationEstimate} />}
        {job.workersNeeded > 1 && (
          <Badge label={`${job.workersNeeded} workers needed`} />
        )}
        {job.requiresLicense && (
          <Badge label={`Requires: ${job.requiresLicense}`} tone="warning" />
        )}
        {job.requiresIdVerification && (
          <Badge label="ID verification required" tone="warning" />
        )}
      </View>

      <Text
        style={[
          typography.body,
          { color: theme.textPrimary, marginBottom: spacing.lg },
        ]}
      >
        {job.description}
      </Text>

      {job.previewPhotoUrls && job.previewPhotoUrls.length > 0 && (
        <Card>
          <Text
            style={[
              typography.h3,
              { color: theme.textPrimary, marginBottom: spacing.sm },
            ]}
          >
            Photos of the work site
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {job.previewPhotoUrls.map((url) => {
              const fullUrl = resolveImageUrl(url);
              return (
                <Image
                  key={url}
                  source={{ uri: fullUrl || undefined }}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: radius.md,
                    marginRight: spacing.sm,
                  }}
                />
              );
            })}
          </ScrollView>
        </Card>
      )}

      <Card>
        <Text
          style={[
            typography.h3,
            { color: theme.textPrimary, marginBottom: spacing.xs },
          ]}
        >
          Posted by
        </Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          {job.hirer?.firstName} {job.hirer?.lastName} · ⭐{" "}
          {job.hirer?.avgRating ?? "—"}
        </Text>
      </Card>

      {/* Q&A */}
      <Card>
        <Text
          style={[
            typography.h3,
            { color: theme.textPrimary, marginBottom: spacing.sm },
          ]}
        >
          Questions & answers
        </Text>
        {(!job.questions || job.questions.length === 0) && (
          <Text
            style={{ color: theme.textSecondary, marginBottom: spacing.sm }}
          >
            No questions yet.
          </Text>
        )}
        {job.questions?.map((q) => (
          <View
            key={q.id}
            style={[styles.borderTop, { borderTopColor: theme.border }]}
          >
            <Text
              style={[typography.bodyBold, { color: theme.textPrimary }]}
            >
              {q.asker?.firstName} {q.asker?.lastName}
            </Text>
            <Text
              style={[
                typography.body,
                { color: theme.textPrimary, marginBottom: spacing.xs },
              ]}
            >
              {q.body}
            </Text>
            {q.answerBody ? (
              <View
                style={{
                  backgroundColor: theme.surfaceAlt,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: theme.textSecondary, marginBottom: 2 },
                  ]}
                >
                  Poster replied
                </Text>
                <Text
                  style={[typography.body, { color: theme.textPrimary }]}
                >
                  {q.answerBody}
                </Text>
              </View>
            ) : isHirer ? (
              <View style={{ marginTop: spacing.xs }}>
                <TextInput
                  placeholder="Write a reply..."
                  placeholderTextColor={theme.textSecondary}
                  value={answerDrafts[q.id] || ""}
                  onChangeText={(t) =>
                    setAnswerDrafts((d) => ({ ...d, [q.id]: t }))
                  }
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surfaceAlt,
                      color: theme.textPrimary,
                      borderColor: theme.border,
                    },
                  ]}
                />
                <Button
                  title="Post reply"
                  variant="secondary"
                  onPress={() => answerQuestion(q.id)}
                  disabled={!(answerDrafts[q.id] || "").trim()}
                />
              </View>
            ) : (
              <Text
                style={{
                  color: theme.textSecondary,
                  fontStyle: "italic",
                }}
              >
                Awaiting reply from the poster
              </Text>
            )}
          </View>
        ))}

        {!isHirer && (
          <View style={{ marginTop: spacing.md }}>
            <TextInput
              placeholder="Ask the poster a question..."
              placeholderTextColor={theme.textSecondary}
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                  minHeight: 60,
                  textAlignVertical: "top",
                },
              ]}
            />
            <Button
              title="Ask question"
              variant="secondary"
              onPress={askQuestion}
              disabled={questionText.trim().length < 3}
            />
          </View>
        )}
      </Card>

      {/* Before / after proof photos */}
      <Card>
        <Text
          style={[
            typography.h3,
            { color: theme.textPrimary, marginBottom: spacing.sm },
          ]}
        >
          Proof of condition
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <PhotoSlot
            label="Before"
            url={resolveImageUrl(job.beforePhotoUrl)}
          />
          <PhotoSlot label="After" url={resolveImageUrl(job.afterPhotoUrl)} />
        </View>
        {isHirer && job.status === "ASSIGNED" && !job.beforePhotoUrl && (
          <Button
            title="Take before photo"
            variant="secondary"
            onPress={() => uploadPhoto("before-photo")}
            style={{ marginTop: spacing.md }}
          />
        )}
        {isHirer &&
          (job.status === "SUBMITTED" || job.status === "COMPLETED") &&
          !job.afterPhotoUrl && (
            <Button
              title="Take after photo"
              variant="secondary"
              onPress={() => uploadPhoto("after-photo")}
              style={{ marginTop: spacing.md }}
            />
          )}
      </Card>

      {/* Checklist */}
      {job.checklistItems && job.checklistItems.length > 0 && (
        <Card>
          <Text
            style={[
              typography.h3,
              { color: theme.textPrimary, marginBottom: spacing.sm },
            ]}
          >
            Task checklist
          </Text>
          {job.checklistItems.map((item) => {
            const isDisabled = !isWorker || item.isDone;
            return (
              <TouchableOpacity
                key={item.id}
                disabled={isDisabled}
                onPress={() => completeChecklistItem(item.id)}
                style={[
                  styles.checklistItem,
                  { opacity: isDisabled ? 0.6 : 1 },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.isDone ? theme.success : theme.border,
                      backgroundColor: item.isDone
                        ? theme.success
                        : "transparent",
                    },
                  ]}
                >
                  {item.isDone && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    typography.body,
                    {
                      color: theme.textPrimary,
                      flex: 1,
                      textDecorationLine: item.isDone
                        ? "line-through"
                        : "none",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>
      )}

      {/* Bidding */}
      {job.status === "OPEN" && !isHirer && (
        <Card>
          <Text
            style={[
              typography.h3,
              { color: theme.textPrimary, marginBottom: spacing.sm },
            ]}
          >
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
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
              />
              <TextInput
                placeholder="Optional message"
                placeholderTextColor={theme.textSecondary}
                value={bidMessage}
                onChangeText={setBidMessage}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                    marginBottom: spacing.md,
                  },
                ]}
              />
              <Button title="Submit bid" onPress={placeBid} disabled={!bidAmount} />
            </>
          )}
        </Card>
      )}

      {/* Hirer's view of all bids */}
      {isHirer && job.status === "OPEN" && (
        <Card>
          <Text
            style={[
              typography.h3,
              { color: theme.textPrimary, marginBottom: spacing.sm },
            ]}
          >
            Bids ({job.bids?.filter((b) => b.status === "PENDING").length || 0})
          </Text>
          {job.bids?.filter((b) => b.status === "PENDING").length === 0 && (
            <Text style={{ color: theme.textSecondary }}>No bids yet.</Text>
          )}
          {job.bids
            ?.filter((b) => b.status === "PENDING")
            .map((bid) => (
              <View
                key={bid.id}
                style={[styles.borderTop, { borderTopColor: theme.border }]}
              >
                <Text
                  style={[typography.bodyBold, { color: theme.textPrimary }]}
                >
                  {bid.bidder?.firstName} {bid.bidder?.lastName} — {job.currency}{" "}
                  {bid.amount}
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    marginBottom: spacing.sm,
                  }}
                >
                  ⭐ {bid.bidder?.avgRating ?? "—"}{" "}
                  {bid.message ? `· "${bid.message}"` : ""}
                </Text>
                <Button title="Accept bid" onPress={() => acceptBid(bid)} />
              </View>
            ))}
        </Card>
      )}

      {/* Chat / messages link */}
      {(isHirer || isWorker) && job.status !== "OPEN" && (
        <Button
          title="Open job chat"
          variant="secondary"
          onPress={() =>
            navigation.navigate("Chat", {
              jobId: job.id,
              jobTitle: job.title,
            })
          }
          style={{ marginBottom: spacing.md }}
        />
      )}

      {/* Worker actions */}
      {isWorker &&
        (job.status === "ASSIGNED" || job.status === "IN_PROGRESS") && (
          <Button title="Mark job as complete" onPress={submitJob} />
        )}

      {/* Hirer actions */}
      {isHirer && job.status === "SUBMITTED" && (
        <Button
          title="Confirm & release payment"
          variant="accent"
          onPress={confirmComplete}
        />
      )}

      {/* Cancel */}
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
          onPress={() =>
            navigation.navigate("ReportUser", {
              jobId: job.id,
              targetUserId: isHirer ? assignedWorkerId : job.hirerId,
            })
          }
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
      <Text
        style={[
          typography.caption,
          { color: theme.textSecondary, marginBottom: spacing.xs },
        ]}
      >
        {label}
      </Text>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: "100%", height: 120, borderRadius: radius.md }}
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: 120,
            borderRadius: radius.md,
            backgroundColor: theme.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.textSecondary }}>No photo yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  borderTop: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
  },
});