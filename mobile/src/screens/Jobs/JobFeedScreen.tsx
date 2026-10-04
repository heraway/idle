import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Image } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Job, MapJob } from "../../types";
import { Badge, Button, Chip, EmptyState, Avatar } from "../../components/UI";
import JobsMap from "../../components/JobsMap";
import { spacing, typography, radius } from "../../theme/theme";
import { FEED_CATEGORIES as CATEGORIES } from "../../constants/categories";

type Sort = "newest" | "pay_high" | "pay_low" | "nearest" | "ending_soon";

type PostedWindow = "hour" | "today" | "week" | "month" | "year" | "all";

interface Filters {
  category?: string;
  minPay?: string;
  sort: Sort;
  postedWindow?: PostedWindow; // undefined == "all"
  minRating?: number; // poster rating, N stars and up
}

const POSTED_OPTIONS: { key: PostedWindow; label: string }[] = [
  { key: "hour", label: "Last hour" },
  { key: "today", label: "Today" },
  { key: "week", label: "Past week" },
  { key: "month", label: "Past month" },
  { key: "year", label: "Past year" },
  { key: "all", label: "All time" },
];

// Turns a posted-time choice into the moment jobs must have been posted
// after. Computed on the device so "Today" means since *your* midnight.
function postedAfter(window?: PostedWindow): Date | undefined {
  const now = new Date();
  switch (window) {
    case "hour":
      return new Date(now.getTime() - 60 * 60 * 1000);
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    default:
      return undefined;
  }
}

// One place that turns filter state into query params, so the list and the
// map always apply exactly the same filters.
function buildFilterParams(filters: Filters, search: string) {
  const p = new URLSearchParams();
  const add = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && v !== "" && v !== false) p.append(k, String(v));
  };
  if (filters.category && filters.category !== "All") add("category", filters.category);
  add("minPay", filters.minPay);
  add("minRating", filters.minRating);
  add("postedAfter", postedAfter(filters.postedWindow)?.toISOString());
  add("sort", filters.sort);
  add("q", search.trim());
  return p;
}

// Centre on the user when jobs are nearby, otherwise frame the jobs
// themselves — so the first thing on the map is never empty ocean.
function initialMapRegion(jobs: MapJob[], user: { latitude: number; longitude: number } | null) {
  if (jobs.length > 0) {
    if (user && jobs.some((j) => Math.abs(j.latitude - user.latitude) < 0.3 && Math.abs(j.longitude - user.longitude) < 0.3)) {
      return { ...user, latitudeDelta: 0.25, longitudeDelta: 0.25 };
    }
    const lats = jobs.map((j) => j.latitude);
    const lngs = jobs.map((j) => j.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.08),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.08),
    };
  }
  if (user) return { ...user, latitudeDelta: 0.25, longitudeDelta: 0.25 };
  return { latitude: 0, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 };
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
  return [f.minPay, f.postedWindow && f.postedWindow !== "all" ? f.postedWindow : undefined, f.minRating].filter(
    (v) => v !== undefined && v !== ""
  ).length;
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

  const [mapJobs, setMapJobs] = useState<MapJob[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mappableJobs = useMemo(
    () => mapJobs.filter((j) => Number.isFinite(j.latitude) && Number.isFinite(j.longitude)),
    [mapJobs]
  );

  const mapInitialRegion = useMemo(() => initialMapRegion(mappableJobs, userLocation), [mappableJobs, userLocation]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const p = buildFilterParams(filters, debouncedSearch);

      // Distance sorting only works when we know where the phone is.
      if (userLocation && filters.sort === "nearest") {
        p.append("lat", String(userLocation.latitude));
        p.append("lng", String(userLocation.longitude));
        p.append("radiusKm", "20000");
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

  // The map has its own endpoint: every available job (not just the first
  // page of the list), at approximate locations, with the same filters.
  const loadMapJobs = useCallback(async () => {
    setMapError(null);
    try {
      const qs = buildFilterParams(filters, debouncedSearch).toString();
      const res = await api<{ jobs: MapJob[] }>(`/jobs/map${qs ? `?${qs}` : ""}`);
      setMapJobs(res.jobs || []);
      setMapLoaded(true);
    } catch (e: any) {
      console.error("Failed to load map jobs:", e);
      setMapError(e?.message || "Please check your connection.");
    }
  }, [filters, debouncedSearch]);

  useEffect(() => {
    if (viewMode === "map") loadMapJobs();
  }, [viewMode, loadMapJobs]);

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
              placeholder="Search gigs, e.g. cleaning, moving"
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
          {mapError ? (
            <View style={{ flex: 1, padding: spacing.lg }}>
              <EmptyState icon="alert-circle-outline" message={`Couldn't load jobs for the map. ${mapError}`} />
              <Button title="Try again" onPress={loadMapJobs} />
            </View>
          ) : !mapLoaded ? (
            <EmptyState icon="map-outline" message="Loading jobs..." />
          ) : mappableJobs.length === 0 ? (
            <EmptyState icon="map-outline" message="No jobs to show on the map. Try widening your filters." />
          ) : (
            <JobsMap
              jobs={mappableJobs}
              initialRegion={mapInitialRegion}
              primaryColor={theme.primary}
              userLocation={userLocation}
              onPressJob={(jobId: string) => navigation.navigate("JobDetail", { jobId })}
            />
          )}
        </View>
      )}

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
  const applicants = job.applicantCount ?? 0;

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
              {applicants === 0 ? "Be the first to bid" : `${applicants} applicant${applicants === 1 ? "" : "s"}`}
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

  const Label = ({ children }: { children: string }) => (
    <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }]}>{children}</Text>
  );

  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{children}</View>
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
            <TouchableOpacity onPress={() => setLocal({ ...DEFAULT_FILTERS, category: local.category, sort: local.sort })}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>Reset all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
            <Label>Posted Time</Label>
            <Row>
              {POSTED_OPTIONS.map((o) => (
                <Chip
                  key={o.key}
                  label={o.label}
                  active={(local.postedWindow ?? "all") === o.key}
                  onPress={() => setLocal((f) => ({ ...f, postedWindow: o.key === "all" ? undefined : o.key }))}
                />
              ))}
            </Row>

            <Label>Rating</Label>
            <Row>
              {[1, 2, 3, 4, 5].map((n) => (
                <Chip
                  key={n}
                  label={`${n} star${n === 1 ? "" : "s"}`}
                  active={local.minRating === n}
                  onPress={() => setLocal((f) => ({ ...f, minRating: f.minRating === n ? undefined : n }))}
                />
              ))}
            </Row>

            <Label>Pay</Label>
            <TextInput
              placeholder="Minimum Pay"
              placeholderTextColor={theme.textSecondary + "99"}
              keyboardType="numeric"
              value={local.minPay || ""}
              onChangeText={(t) => setLocal((f) => ({ ...f, minPay: t.replace(/[^0-9.]/g, "") }))}
              style={{
                height: 48,
                backgroundColor: theme.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                color: theme.textPrimary,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            />
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
