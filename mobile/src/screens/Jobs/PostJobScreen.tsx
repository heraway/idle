import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";
import { api, apiUpload } from "../../api/client";
import { appendImage, imageMediaTypes } from "../../utils/media";
import { Button, Input, Chip, SectionLabel } from "../../components/UI";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography, radius } from "../../theme/theme";
import { JOB_CATEGORIES as CATEGORIES } from "../../constants/categories";

const MAX_PREVIEW_PHOTOS = 5;

export default function PostJobScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [payType, setPayType] = useState<"fixed" | "hourly">("fixed");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [durationEstimate, setDurationEstimate] = useState("");
  const [workersNeeded, setWorkersNeeded] = useState("1");
  const [hoursPerDayNeeded, setHoursPerDayNeeded] = useState("");
  const [requiresLicense, setRequiresLicense] = useState("");
  const [requiresIdVerification, setRequiresIdVerification] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([""]);
  const [photos, setPhotos] = useState<{ uri: string; mimeType?: string | null }[]>([]); // local picks, uploaded after job creation
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickPhotos = async () => {
    const remaining = MAX_PREVIEW_PHOTOS - photos.length;
    if (remaining <= 0) return;

    // The system photo picker needs no permission prompt on modern Android/iOS,
    // so don't block on one — that silently stopped some people adding photos.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaTypes(),
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPhotos((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }))].slice(0, MAX_PREVIEW_PHOTOS));
  };

  const takePhoto = async () => {
    if (photos.length >= MAX_PREVIEW_PHOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Allow camera access in your phone settings to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setPhotos((prev) => [...prev, { uri: a.uri, mimeType: a.mimeType }].slice(0, MAX_PREVIEW_PHOTOS));
  };

  const removePhoto = (uri: string) => setPhotos((prev) => prev.filter((p) => p.uri !== uri));

  const handleSubmit = async () => {
    if (!budgetMin || Number(budgetMin) <= 0) {
      Alert.alert("Pay amount needed", "Please enter a budget for this job before posting.");
      return;
    }
    if (budgetMax && Number(budgetMax) < Number(budgetMin)) {
      Alert.alert("Check your budget", "Budget max can't be less than budget min.");
      return;
    }

    setSubmitting(true);
    try {
      // Ask for location permission here too (the feed may not have been
      // opened with it granted). Without it the job would be pinned at 0,0.
      const perm = await Location.requestForegroundPermissionsAsync();
      const loc = perm.granted ? await Location.getCurrentPositionAsync({}).catch(() => null) : null;
      if (!loc) {
        Alert.alert(
          "Location needed",
          "Idle needs your location to pin this job on the map so nearby workers can find it. Turn location on and try again."
        );
        setSubmitting(false);
        return;
      }
      const coords = loc.coords;

      const job = await api<{ id: string }>("/jobs", {
        method: "POST",
        body: {
          title,
          description,
          category,
          payType,
          budgetMin: Number(budgetMin),
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          durationEstimate: durationEstimate || undefined,
          workersNeeded: Number(workersNeeded) || 1,
          hoursPerDayNeeded: hoursPerDayNeeded ? Number(hoursPerDayNeeded) : undefined,
          requiresLicense: requiresLicense || undefined,
          requiresIdVerification,
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: address.trim() || undefined,
          checklist: checklist.filter((c) => c.trim().length > 0),
        },
      });

      if (photos.length > 0) {
        const form = new FormData();
        for (let i = 0; i < photos.length; i++) {
          await appendImage(form, "photos", photos[i], `job${i}`);
        }
        // The job itself is already posted, so a photo hiccup shouldn't lose it —
        // but do tell the poster, with the real reason.
        try {
          await apiUpload(`/jobs/${job.id}/preview-photos`, form);
        } catch (e: any) {
          Alert.alert("Job posted, but photos failed to upload", e.message);
        }
      }

      Alert.alert("Job posted!", "Your job is now live and open for bids.");
      // "JobFeed" isn't a registered route — the feed screen is named "Jobs"
      // and lives inside the MainTabs tab navigator, so it needs to be
      // targeted explicitly rather than navigated to directly by its own name.
      navigation.navigate("MainTabs", { screen: "Jobs" });
    } catch (e: any) {
      Alert.alert("Couldn't post job", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Mow my backyard lawn" />
      <Input label="Description" value={description} onChangeText={setDescription} placeholder="What needs doing, and any details a worker should know" multiline />
      <Input label="Address or landmark (only shown to the hired worker)" value={address} onChangeText={setAddress} placeholder="e.g. House 12, Kabulonga Rd" />

      <SectionLabel>Photos of the work site (optional)</SectionLabel>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
        Show bidders what they're walking into — up to {MAX_PREVIEW_PHOTOS} photos.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
        {photos.map((p) => (
          <View key={p.uri} style={{ position: "relative" }}>
            <Image source={{ uri: p.uri }} style={{ width: 84, height: 84, borderRadius: radius.md }} />
            <TouchableOpacity
              onPress={() => removePhoto(p.uri)}
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
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_PREVIEW_PHOTOS && (
          <>
            {[
              { icon: "images-outline", label: "Gallery", onPress: pickPhotos },
              { icon: "camera-outline", label: "Camera", onPress: takePhoto },
            ].map((b) => (
              <TouchableOpacity
                key={b.label}
                onPress={b.onPress}
                activeOpacity={0.8}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  borderStyle: "dashed",
                  backgroundColor: theme.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Ionicons name={b.icon as any} size={22} color={theme.primary} />
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "600" }}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>

      <SectionLabel>Category</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <SectionLabel>Pay type</SectionLabel>
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
              backgroundColor: payType === pt ? theme.primary : theme.surfaceAlt,
              borderWidth: 1,
              borderColor: payType === pt ? theme.primary : theme.border,
            }}
          >
            <Text style={{ color: payType === pt ? "#fff" : theme.chipText, fontWeight: "700" }}>
              {pt === "fixed" ? "Fixed price" : "Hourly rate"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input label="Budget min *" value={budgetMin} onChangeText={setBudgetMin} keyboardType="numeric" placeholder="20" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Budget max" value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="40" />
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

      <SectionLabel>Task checklist (optional)</SectionLabel>
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

      <Button title="Post job" icon="flash" onPress={handleSubmit} loading={submitting} disabled={!title || !description} />
    </ScrollView>
  );
}
