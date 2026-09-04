import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";
import { api, apiUpload } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";
import { JOB_CATEGORIES as CATEGORIES } from "../../constants/categories";

const MAX_PREVIEW_PHOTOS = 5;

export default function PostJobScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [payType, setPayType] = useState<"fixed" | "hourly">("fixed");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [durationEstimate, setDurationEstimate] = useState("");
  const [workersNeeded, setWorkersNeeded] = useState("1");
  const [hoursPerDayNeeded, setHoursPerDayNeeded] = useState("");
  const [requiresLicense, setRequiresLicense] = useState("");
  const [requiresIdVerification, setRequiresIdVerification] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([""]);
  const [photos, setPhotos] = useState<string[]>([]); // local URIs, uploaded after job creation
  const [submitting, setSubmitting] = useState(false);

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add pictures of the work site.");
      return;
    }
    const remaining = MAX_PREVIEW_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      // ImagePicker.MediaTypeOptions is deprecated as of newer expo-image-picker
      // versions — this is the replacement syntax (array of MediaType strings).
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PREVIEW_PHOTOS));
  };

  const removePhoto = (uri: string) => setPhotos((prev) => prev.filter((p) => p !== uri));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const loc = await Location.getCurrentPositionAsync({}).catch(() => null);
      const coords = loc?.coords || { latitude: 0, longitude: 0 };

      const job = await api<{ id: string }>("/jobs", {
        method: "POST",
        body: {
          title,
          description,
          category,
          payType,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          durationEstimate: durationEstimate || undefined,
          workersNeeded: Number(workersNeeded) || 1,
          hoursPerDayNeeded: hoursPerDayNeeded ? Number(hoursPerDayNeeded) : undefined,
          requiresLicense: requiresLicense || undefined,
          requiresIdVerification,
          latitude: coords.latitude,
          longitude: coords.longitude,
          checklist: checklist.filter((c) => c.trim().length > 0),
        },
      });

      if (photos.length > 0) {
        const form = new FormData();
        photos.forEach((uri, i) => {
          form.append("photos", { uri, name: `photo${i}.jpg`, type: "image/jpeg" } as any);
        });
        // Best-effort — the job itself is already posted at this point, so a
        // photo-upload hiccup shouldn't block the whole flow or lose the job.
        await apiUpload(`/jobs/${job.id}/preview-photos`, form).catch((e) =>
          Alert.alert("Job posted, but photos failed to upload", e.message)
        );
      }

      Alert.alert("Job posted!", "Your job is now live and open for bids.");
      navigation.navigate("JobFeed");
    } catch (e: any) {
      Alert.alert("Couldn't post job", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <ScreenTitle>Post a job</ScreenTitle>

      <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Mow my backyard lawn" />
      <Input label="Description" value={description} onChangeText={setDescription} placeholder="What needs doing, and any details a worker should know" multiline />

      <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>Photos of the work site (optional)</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
        Show bidders what they're actually walking into — up to {MAX_PREVIEW_PHOTOS} photos.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
        {photos.map((uri) => (
          <View key={uri} style={{ position: "relative" }}>
            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: radius.sm }} />
            <TouchableOpacity
              onPress={() => removePhoto(uri)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                backgroundColor: theme.danger,
                borderRadius: radius.pill,
                width: 22,
                height: 22,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_PREVIEW_PHOTOS && (
          <TouchableOpacity
            onPress={pickPhotos}
            style={{
              width: 80,
              height: 80,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              borderColor: theme.border,
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 22, color: theme.textSecondary }}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCategory(c)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              backgroundColor: category === c ? theme.primary : theme.chipBackground,
            }}
          >
            <Text style={{ color: category === c ? theme.textInverse : theme.chipText, fontWeight: "600", fontSize: 13 }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>Pay type</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
        {(["fixed", "hourly"] as const).map((pt) => (
          <TouchableOpacity
            key={pt}
            onPress={() => setPayType(pt)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: radius.md,
              alignItems: "center",
              backgroundColor: payType === pt ? theme.primary : theme.chipBackground,
            }}
          >
            <Text style={{ color: payType === pt ? theme.textInverse : theme.chipText, fontWeight: "600" }}>
              {pt === "fixed" ? "Fixed price" : "Hourly rate"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input label="Budget min ($)" value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" placeholder="20" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Budget max ($)" value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="40" />
        </View>
      </View>

      <Input label="Estimated duration" value={durationEstimate} onChangeText={setDurationEstimate} placeholder="e.g. 2-3 hours, 1 day" />

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input label="Workers needed" value={workersNeeded} onChangeText={setWorkersNeeded} keyboardType="numeric" placeholder="1" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Hours/day needed" value={hoursPerDayNeeded} onChangeText={setHoursPerDayNeeded} keyboardType="numeric" placeholder="optional" />
        </View>
      </View>

      <Input label="Requires a license? (optional)" value={requiresLicense} onChangeText={setRequiresLicense} placeholder="e.g. Driver's License" />

      <TouchableOpacity
        onPress={() => setRequiresIdVerification(!requiresIdVerification)}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.lg }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: theme.primary,
            backgroundColor: requiresIdVerification ? theme.primary : "transparent",
            marginRight: spacing.sm,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {requiresIdVerification && <Text style={{ color: theme.textInverse, fontWeight: "700" }}>✓</Text>}
        </View>
        <Text style={[typography.body, { color: theme.textPrimary, flex: 1 }]}>
          Only allow ID-verified applicants to bid (recommended for in-home jobs, driving, or jobs involving children)
        </Text>
      </TouchableOpacity>

      <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>Task checklist (optional)</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
        The worker ticks these off as they go, so you can follow progress in real time.
      </Text>
      {checklist.map((item, i) => (
        <Input
          key={i}
          label={`Task ${i + 1}`}
          value={item}
          onChangeText={(t) => setChecklist((c) => c.map((x, idx) => (idx === i ? t : x)))}
          placeholder="e.g. Mow front and back lawn"
        />
      ))}
      <Button title="+ Add another task" variant="secondary" onPress={() => setChecklist((c) => [...c, ""])} style={{ marginBottom: spacing.lg }} />

      <Button title="Post Job" onPress={handleSubmit} loading={submitting} disabled={!title || !description} />
    </ScrollView>
  );
}
