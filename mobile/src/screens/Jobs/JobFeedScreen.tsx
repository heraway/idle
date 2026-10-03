import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Image } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Job } from "../../types";
import { Badge, Button, Chip, EmptyState, Avatar } from "../../components/UI";
import JobsMap from "../../components/JobsMap";
import { spacing, typography, radius } from "../../theme/theme";
import { FEED_CATEGORIES as CATEGORIES } from "../../constants/categories";

type Sort = "newest" | "pay_high" | "pay_low" | "nearest" | "ending_soon";

interface Filters {
  category?: string;
  payType?: "fixed" | "hourly";
  minPay?: string;
  maxPay?: string;
  workers?: "solo" | "team"; // solo = exactly 1, team = 2+
  sort: Sort;
  radiusKm?: number;
  postedWithinHours?: number;
  hasPhotos?: boolean;
  noIdRequired?: boolean;
  minRating?: number;
  endingWithinHours?: number;
}

const DEFAULT_FILTERS: Filters = { sort: "newest" };

const SORTS: { key: Sort; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "newest", label: "Newest", icon: "time-outline" },
  { key: "pay_high", label: "Highest pay", icon: "trending-up-outline" },
  { key: "nearest", label: "Nearest", icon: "navigate-outline" },
  { key: "ending_soon", label: "Ending soon", icon: "hourglass-outline" },
];

// How many filters (beyond category/sort quick-chips) are switched on —
// shown as a badge on the filter button.
function countActive(f: Filters) {
  return [
    f.payType,
    f.minPay,
    f.maxPay,
    f.workers,
    f.radiusKm,
    f.postedWithinHours,
    f.hasPhotos,
    f.noIdRequired,
    f.minRating,
    f.endingWithinHours,
  ].filter((v) => v !== undefined && v !== "" && v !== false).length;
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function JobFeedScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounced(searchText, 400);
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

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      const add = (k: string, v: unknown) => {
        if (v !== undefined && v !== null && v !== "" && v !== false) p.append(k, String(v));
      };
      if (filters.category && filters.category !== "All") add("category", filters.category);
      add("payType", filters.payType);
      add("minPay", filters.minPay);
      add("maxPay", filters.maxPay);
      if (filters.workers === "solo") add("maxWorkers", 1);
      if (filters.workers === "team") add("minWorkers", 2);
      add("sort", filters.sort);
      add("postedWithinHours", filters.postedWithinHours);
      add("endingWithinHours", filters.endingWithinHours);
      add("minRating", filters.minRating);
      if (filters.hasPhotos) add("hasPhotos", "true");
      if (filters.noIdRequired) add("noIdRequired", "true");
      add("q", debouncedSearch.trim());

      // Distance only works when we know where the phone is.
      if (userLocation && (filters.radiusKm || filters.sort === "nearest")) {
        add("lat", userLocation.latitude);
        add("lng", userLocation.longitude);
        add("radiusKm", filters.radiusKm ?? 20000);
      }

      const qs = p.toString();
      const res = await api<{ jobs: Job[] }>(`/jobs/search${qs ? `?${qs}` : ""}`);
      setJobs(res.jobs || []);
    } catch (e) {
      console.error("Failed to load jobs:", e);
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch, userLocation]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const activeCount = countActive(filters);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xl + spacing.sm }}>
        {/* Title row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ color: theme.primary, fontSize: 26, fontWeight: "900", letterSpacing: -1 }}>idle</Text>
            <Text style={[typography.h3, { color: theme.textSecondary }]}>Job Feed</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 3,
            }}
          >
            {(["list", "map"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                accessibilityLabel={`${mode} view`}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: radius.md - 3,
                  backgroundColor: viewMode === mode ? theme.primary : "transparent",
                }}
              >
                <Ionicons
                  name={mode === "list" ? "list" : "map"}
                  size={18}
                  color={viewMode === mode ? "#fff" : theme.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search + filter */}
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
              height: 48,
            }}
          >
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              placeholder="Search gigs, e.g. lawn, braiding"
              placeholderTextColor={theme.textSecondary + "99"}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              style={{ flex: 1, color: theme.textPrimary, marginLeft: 10 }}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            accessibilityLabel="Filters"
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.md,
              backgroundColor: activeCount > 0 ? theme.accentSoft : theme.surfaceAlt,
              borderWidth: 1,
              borderColor: activeCount > 0 ? theme.accentBorder : theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="options" size={22} color={activeCount > 0 ? theme.primary : theme.textPrimary} />
            {activeCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{activeCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} contentContainerStyle={{ gap: spacing.sm }}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={(filters.category || "All") === cat}
              onPress={() => setFilters((f) => ({ ...f, category: cat }))}
            />
          ))}
        </ScrollView>

        {/* Sort chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.sm }} contentContainerStyle={{ gap: spacing.sm }}>
          {SORTS.map((s) => {
            const active = filters.sort === s.key;
            const disabled = s.key === "nearest" && !userLocation;
            return (
              <TouchableOpacity
                key={s.key}
                disabled={disabled}
                onPress={() => setFilters((f) => ({ ...f, sort: s.key }))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: active ? theme.accentBorder : theme.border,
                  backgroundColor: active ? theme.accentSoft : "transparent",
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                <Ionicons name={s.icon} size={14} color={active ? theme.primary : theme.textSecondary} />
                <Text style={{ color: active ? theme.primary : theme.textSecondary, fontWeight: "700", fontSize: 12 }}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {viewMode === "list" ? (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xs }}
          refreshing={loading}
          onRefresh={loadJobs}
          ListEmptyComponent={
            !loading ? (
              <EmptyState message="No jobs match your search yet. Try widening your filters, or be the first to post one!" />
            ) : null
          }
          renderItem={({ item }) => <JobCard job={item} onPress={() => navigation.navigate("JobDetail", { jobId: item.id })} />}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {mappableJobs.length === 0 && !loading ? (
            <EmptyState icon="map-outline" message="No jobs to show on the map. Try widening your filters." />
          ) : (
            <JobsMap
              jobs={mappableJobs}
              initialRegion={mapInitialRegion}
              primaryColor={theme.primary}
              onPressJob={(jobId: string) => navigation.navigate("JobDetail", { jobId })}
            />
          )}
        </View>
      )}

      <FilterModal
        visible={filterModalVisible}
        filters={filters}
        hasLocation={!!userLocation}
        onApply={(f) => {
          setFilters(f);
          setFilterModalVisible(false);
        }}
        onClose={() => setFilterModalVisible(false)}
      />
    </View>
  );
}

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "Ends in <1h";
  if (h < 24) return `Ends in ${h}h`;
  return `Ends in ${Math.floor(h / 24)}d`;
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { theme } = useTheme();
  const cur = job.currency === "USD" ? "$" : `${job.currency} `;
  const price =
    job.budgetMin == null
      ? "—"
      : job.budgetMax && job.budgetMax !== job.budgetMin
      ? `${cur}${job.budgetMin}–${job.budgetMax}`
      : `${cur}${job.budgetMin}`;
  const left = timeLeft(job.expiresAt);
  const urgent = new Date(job.expiresAt).getTime() - Date.now() < 24 * 3600 * 1000;
  const bids = job._count?.bids ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        {/* Hirer row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
          <Avatar name={`${job.hirer?.firstName ?? ""} ${job.hirer?.lastName ?? ""}`} uri={job.hirer?.avatarUrl} size={34} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
              {job.hirer?.firstName ?? "Someone"} {job.hirer?.lastName?.[0] ? `${job.hirer.lastName[0]}.` : ""}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="star" size={11} color={theme.primary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                {job.hirer?.avgRating ? Number(job.hirer.avgRating).toFixed(1) : "New"}
                {typeof job.distanceKm === "number" ? `  ·  ${job.distanceKm.toFixed(1)} km away` : ""}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: urgent ? theme.danger + "22" : theme.surfaceAlt,
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Ionicons name={urgent ? "alert-circle" : "time-outline"} size={12} color={urgent ? theme.danger : theme.textSecondary} />
            <Text style={{ color: urgent ? theme.danger : theme.textSecondary, fontSize: 11, fontWeight: "700" }}>{left}</Text>
          </View>
        </View>

        {job.previewPhotoUrls && job.previewPhotoUrls.length > 0 ? (
          <Image
            source={{ uri: job.previewPhotoUrls[0] }}
            style={{ width: "100%", height: 150, borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: theme.surfaceAlt }}
          />
        ) : null}

        <Text style={[typography.h3, { color: theme.textPrimary, fontSize: 18 }]} numberOfLines={2}>
          {job.title}
        </Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginTop: 4, marginBottom: spacing.sm }]} numberOfLines={2}>
          {job.description}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.md }}>
          <Badge label={job.category} />
          {job.durationEstimate ? <Badge label={job.durationEstimate} icon="time-outline" /> : null}
          {job.workersNeeded > 1 ? <Badge label={`${job.workersNeeded} workers`} icon="people-outline" /> : null}
          {job.requiresIdVerification ? <Badge label="ID required" tone="warning" icon="shield-checkmark-outline" /> : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
              <Text style={[typography.price, { color: theme.textPrimary }]}>{price}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "700" }}>
                {job.payType === "hourly" ? "/HR" : "FIXED"}
              </Text>
            </View>
            <Text style={{ color: theme.accentText, fontSize: 12, marginTop: 2 }}>
              {bids === 0 ? "Be the first to bid" : `${bids} bid${bids === 1 ? "" : "s"} so far`}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: theme.primary,
              borderRadius: radius.md,
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          >
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800" }}>Bid now</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------- filters
function FilterModal({
  visible,
  filters,
  hasLocation,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  hasLocation: boolean;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const Label = ({ children }: { children: string }) => (
    <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }]}>{children}</Text>
  );

  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{children}</View>
  );

  const Toggle = ({
    label,
    sub,
    value,
    onChange,
  }: {
    label: string;
    sub?: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontWeight: "600", fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: value ? theme.primary : theme.border,
          backgroundColor: value ? theme.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </View>
    </TouchableOpacity>
  );

  const numInput = (key: "minPay" | "maxPay", placeholder: string) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary + "99"}
      keyboardType="numeric"
      value={local[key] || ""}
      onChangeText={(t) => setLocal((f) => ({ ...f, [key]: t.replace(/[^0-9.]/g, "") }))}
      style={{
        flex: 1,
        height: 48,
        backgroundColor: theme.surfaceAlt,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        color: theme.textPrimary,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    />
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay }}>
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderColor: theme.border,
            borderWidth: 1,
            maxHeight: "88%",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, paddingBottom: spacing.sm }}>
            <Text style={[typography.h2, { color: theme.textPrimary }]}>Filters</Text>
            <TouchableOpacity onPress={() => setLocal({ ...DEFAULT_FILTERS, category: local.category })}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>Reset all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
            <Label>Pay type</Label>
            <Row>
              {(["fixed", "hourly"] as const).map((pt) => (
                <Chip
                  key={pt}
                  label={pt === "fixed" ? "Fixed price" : "Hourly rate"}
                  active={local.payType === pt}
                  onPress={() => setLocal((f) => ({ ...f, payType: f.payType === pt ? undefined : pt }))}
                />
              ))}
            </Row>

            <Label>Pay range</Label>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {numInput("minPay", "Min")}
              {numInput("maxPay", "Max")}
            </View>

            <Label>Distance</Label>
            {hasLocation ? (
              <Row>
                {[undefined, 5, 10, 25, 50].map((km) => (
                  <Chip
                    key={String(km)}
                    label={km ? `${km} km` : "Any"}
                    active={local.radiusKm === km}
                    onPress={() => setLocal((f) => ({ ...f, radiusKm: km }))}
                  />
                ))}
              </Row>
            ) : (
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                Turn on location for Idle in your phone settings to filter by distance.
              </Text>
            )}

            <Label>Posted</Label>
            <Row>
              {[
                { l: "Any time", v: undefined },
                { l: "Last 24h", v: 24 },
                { l: "Last 3 days", v: 72 },
                { l: "Last week", v: 168 },
              ].map((o) => (
                <Chip key={o.l} label={o.l} active={local.postedWithinHours === o.v} onPress={() => setLocal((f) => ({ ...f, postedWithinHours: o.v }))} />
              ))}
            </Row>

            <Label>Team size</Label>
            <Row>
              <Chip label="Any" active={!local.workers} onPress={() => setLocal((f) => ({ ...f, workers: undefined }))} />
              <Chip label="Solo job" active={local.workers === "solo"} onPress={() => setLocal((f) => ({ ...f, workers: "solo" }))} />
              <Chip label="Team (2+)" active={local.workers === "team"} onPress={() => setLocal((f) => ({ ...f, workers: "team" }))} />
            </Row>

            <Label>Poster</Label>
            <Row>
              <Chip label="Any rating" active={!local.minRating} onPress={() => setLocal((f) => ({ ...f, minRating: undefined }))} />
              <Chip label="4★ and up" active={local.minRating === 4} onPress={() => setLocal((f) => ({ ...f, minRating: 4 }))} />
              <Chip label="4.5★ and up" active={local.minRating === 4.5} onPress={() => setLocal((f) => ({ ...f, minRating: 4.5 }))} />
            </Row>

            <View style={{ marginTop: spacing.md }}>
              <Toggle label="Has photos" sub="Only jobs with pictures of the work site" value={!!local.hasPhotos} onChange={(v) => setLocal((f) => ({ ...f, hasPhotos: v }))} />
              <Toggle
                label="No ID verification needed"
                sub="Hide jobs that require you to be ID-verified"
                value={!!local.noIdRequired}
                onChange={(v) => setLocal((f) => ({ ...f, noIdRequired: v }))}
              />
              <Toggle
                label="Ending in the next 24h"
                sub="Jobs about to close for bids"
                value={local.endingWithinHours === 24}
                onChange={(v) => setLocal((f) => ({ ...f, endingWithinHours: v ? 24 : undefined }))}
              />
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingTop: spacing.sm }}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Show jobs" onPress={() => onApply(local)} style={{ flex: 2 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
