import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Image } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Job } from "../../types";
import { Card, Badge, Button, EmptyState } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";
import { FEED_CATEGORIES as CATEGORIES } from "../../constants/categories";

interface Filters {
  category?: string;
  minPay?: string;
  maxPay?: string;
  payType?: "fixed" | "hourly";
  minWorkers?: string;
  q?: string;
}

export default function JobFeedScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({}).catch(() => null);
      if (loc) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  // Jobs missing coordinates (shouldn't happen — lat/lng is required at
  // posting time — but the map would silently drop pins for undefined ones).
  const mappableJobs = useMemo(
    () => jobs.filter((j) => typeof j.latitude === "number" && typeof j.longitude === "number"),
    [jobs]
  );

  const mapInitialRegion = useMemo(() => {
    if (userLocation) return { ...userLocation, latitudeDelta: 0.25, longitudeDelta: 0.25 };
    if (mappableJobs.length > 0) {
      return { latitude: mappableJobs[0].latitude, longitude: mappableJobs[0].longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 };
    }
    return { latitude: 0, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 };
  }, [userLocation, mappableJobs]);

  const buildQueryString = (params: Record<string, string | undefined>) => {
    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== "" && value !== "All")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
      .join("&");
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = buildQueryString({
        category: filters.category,
        minPay: filters.minPay,
        maxPay: filters.maxPay,
        payType: filters.payType,
        minWorkers: filters.minWorkers,
        q: searchText,
      });

      const endpoint = queryString ? `/jobs/search?${queryString}` : "/jobs/search";
      const res = await api<{ jobs: Job[] }>(endpoint);
      setJobs(res.jobs || []);
    } catch (e) {
      console.error("Failed to load jobs:", e);
    } finally {
      setLoading(false);
    }
  }, [filters, searchText]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: spacing.md, paddingTop: spacing.xl }}>
        <Text style={[typography.h1, { color: theme.textPrimary, marginBottom: spacing.md }]}>
          Jobs near you
        </Text>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surfaceAlt,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <TextInput
              placeholder="Search jobs (e.g. lawn, braiding)"
              placeholderTextColor={theme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={loadJobs}
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 12, color: theme.textPrimary }}
            />
          </View>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={{
              backgroundColor: theme.primary,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.textInverse, fontWeight: "700" }}>Filters</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            marginTop: spacing.sm,
            backgroundColor: theme.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 3,
            alignSelf: "flex-start",
          }}
        >
          {(["list", "map"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: radius.md - 2,
                backgroundColor: viewMode === mode ? theme.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: viewMode === mode ? theme.textInverse : theme.chipText,
                  fontWeight: "600",
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category quick-chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
          {CATEGORIES.map((cat) => {
            const active = (filters.category || "All") === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setFilters((f) => ({ ...f, category: cat }))}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  backgroundColor: active ? theme.primary : theme.chipBackground,
                  marginRight: spacing.sm,
                }}
              >
                <Text
                  style={{
                    color: active ? theme.textInverse : theme.chipText,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {viewMode === "list" ? (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
          refreshing={loading}
          onRefresh={loadJobs}
          ListEmptyComponent={
            !loading ? (
              <EmptyState message="No jobs match your search yet. Try widening your filters, or be the first to post one!" />
            ) : null
          }
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => navigation.navigate("JobDetail", { jobId: item.id })} />
          )}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {mappableJobs.length === 0 && !loading ? (
            <EmptyState message="No jobs match your search yet. Try widening your filters, or be the first to post one!" />
          ) : (
            <MapView style={{ flex: 1 }} initialRegion={mapInitialRegion} showsUserLocation showsMyLocationButton>
              {mappableJobs.map((job) => (
                <Marker key={job.id} coordinate={{ latitude: job.latitude, longitude: job.longitude }} pinColor={theme.primary}>
                  <Callout onPress={() => navigation.navigate("JobDetail", { jobId: job.id })}>
                    <View style={{ maxWidth: 220, padding: 4 }}>
                      <Text style={{ fontWeight: "700", marginBottom: 2 }} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={{ color: "#555", fontSize: 12 }} numberOfLines={2}>
                        {job.category} · {job.payType === "hourly" ? "hourly" : "fixed"}
                        {job.budgetMin != null ? ` · ${job.currency} ${job.budgetMin}${job.budgetMax ? `–${job.budgetMax}` : ""}` : ""}
                      </Text>
                      <Text style={{ color: theme.primary, fontSize: 12, marginTop: 4, fontWeight: "600" }}>
                        Tap for details →
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate("PostJob")}
        style={{
          position: "absolute",
          bottom: spacing.lg,
          right: spacing.lg,
          backgroundColor: theme.accent,
          borderRadius: radius.pill,
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: theme.shadow,
          shadowOpacity: 1,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <Text style={{ fontWeight: "700", color: "#1F2937" }}>+ Post a Job</Text>
      </TouchableOpacity>

      <FilterModal
        visible={filterModalVisible}
        filters={filters}
        onApply={(f) => {
          setFilters(f);
          setFilterModalVisible(false);
        }}
        onClose={() => setFilterModalVisible(false)}
      />
    </View>
  );
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { theme } = useTheme();
  const payLabel =
    job.payType === "hourly"
      ? `${job.currency} ${job.budgetMin ?? "?"}–${job.budgetMax ?? "?"}/hr`
      : `${job.currency} ${job.budgetMin ?? "?"}–${job.budgetMax ?? "?"}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card>
        {job.previewPhotoUrls && job.previewPhotoUrls.length > 0 && (
          <Image
            source={{ uri: job.previewPhotoUrls[0] }}
            style={{ width: "100%", height: 140, borderRadius: radius.md, marginBottom: spacing.sm }}
          />
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs }}>
          <Text style={[typography.h3, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
            {job.title}
          </Text>
          <Badge label={job.category} />
        </View>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]} numberOfLines={2}>
          {job.description}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Badge label={payLabel} tone="accent" />
          {job.durationEstimate && <Badge label={job.durationEstimate} />}
          {job.workersNeeded > 1 && <Badge label={`${job.workersNeeded} workers needed`} />}
          {job.requiresIdVerification && <Badge label="ID verification required" tone="warning" />}
          {typeof job.distanceKm === "number" && (
            <Badge label={`${job.distanceKm.toFixed(1)} km away`} tone="neutral" />
          )}
          {job._count && <Badge label={`${job._count.bids} bid${job._count.bids === 1 ? "" : "s"}`} tone="neutral" />}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function FilterModal({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
          }}
        >
          <Text style={[typography.h2, { color: theme.textPrimary, marginBottom: spacing.md }]}>
            Filter jobs
          </Text>

          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>
            Pay type
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            {(["fixed", "hourly"] as const).map((pt) => (
              <TouchableOpacity
                key={pt}
                onPress={() => setLocal((f) => ({ ...f, payType: f.payType === pt ? undefined : pt }))}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  backgroundColor: local.payType === pt ? theme.primary : theme.chipBackground,
                }}
              >
                <Text style={{ color: local.payType === pt ? theme.textInverse : theme.chipText, fontWeight: "600" }}>
                  {pt === "fixed" ? "Fixed price" : "Hourly rate"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>
            Pay range
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            <TextInput
              placeholder="Min"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={local.minPay || ""}
              onChangeText={(t) => setLocal((f) => ({ ...f, minPay: t }))}
              style={{
                flex: 1,
                backgroundColor: theme.surfaceAlt,
                borderRadius: radius.md,
                padding: 12,
                color: theme.textPrimary,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            />
            <TextInput
              placeholder="Max"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={local.maxPay || ""}
              onChangeText={(t) => setLocal((f) => ({ ...f, maxPay: t }))}
              style={{
                flex: 1,
                backgroundColor: theme.surfaceAlt,
                borderRadius: radius.md,
                padding: 12,
                color: theme.textPrimary,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            />
          </View>

          <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.xs }]}>
            Minimum workers needed
          </Text>
          <TextInput
            placeholder="e.g. 2"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            value={local.minWorkers || ""}
            onChangeText={(t) => setLocal((f) => ({ ...f, minWorkers: t }))}
            style={{
              backgroundColor: theme.surfaceAlt,
              borderRadius: radius.md,
              padding: 12,
              color: theme.textPrimary,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: spacing.lg,
            }}
          />

          <Button title="Apply filters" onPress={() => onApply(local)} />
          <Button title="Cancel" variant="secondary" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    </Modal>
  );
}