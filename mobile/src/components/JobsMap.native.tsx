import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { MapJob } from "../types";
import { useTheme } from "../context/ThemeContext";
import { applicantsLabel, approxDistanceKm, clusterJobs, JobCluster, regionForJobs } from "../utils/mapUtils";

type Props = {
  jobs: MapJob[];
  initialRegion: Region;
  primaryColor: string;
  userLocation?: { latitude: number; longitude: number } | null;
  onPressJob: (jobId: string) => void;
};

// Below this zoom there's nothing left to split apart, so a cluster opens as a list.
const MIN_CLUSTER_ZOOM_DELTA = 0.02;

const money = (j: MapJob) => {
  const cur = j.currency === "USD" ? "$" : `${j.currency} `;
  if (j.budgetMin == null) return "—";
  return `${cur}${j.budgetMin}${j.payType === "hourly" ? "/hr" : ""}`;
};

// Renders on iOS/Android only — see JobsMap.web.tsx for the browser fallback.
// Pins are price bubbles (so the map answers "what pays what, and where"
// at a glance); nearby jobs merge into count bubbles. Everything shown here is
// approximate — the server never sends exact coordinates or addresses.
export default function JobsMap({ jobs, initialRegion, primaryColor, userLocation, onPressJob }: Props) {
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [selected, setSelected] = useState<MapJob[] | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [jobs]);

  const clusters = useMemo(() => clusterJobs(jobs, region), [jobs, region]);

  const onPressCluster = (c: JobCluster<MapJob>) => {
    if (c.sameSpot || region.latitudeDelta <= MIN_CLUSTER_ZOOM_DELTA) {
      setSelected(c.jobs);
      return;
    }
    mapRef.current?.animateToRegion(regionForJobs(c.jobs), 350);
  };

  const single = selected && selected.length === 1 ? selected[0] : null;
  const group = selected && selected.length > 1 ? selected : null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSelected(null)}
        onRegionChangeComplete={(r) => setRegion(r)}
        userInterfaceStyle={theme.mode === "dark" ? "dark" : "light"}
      >
        {clusters.map((c) => {
          if (c.jobs.length === 1) {
            const job = c.jobs[0];
            const active = single?.id === job.id;
            return (
              <Marker
                key={c.key}
                coordinate={{ latitude: job.latitude, longitude: job.longitude }}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setSelected([job]);
                }}
                zIndex={active ? 10 : 1}
              >
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: active ? "#FFFFFF" : primaryColor,
                      borderColor: active ? primaryColor : "#FFFFFF",
                      borderWidth: 2,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ color: active ? primaryColor : "#FFFFFF", fontWeight: "800", fontSize: 12 }}>{money(job)}</Text>
                  </View>
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 5,
                      borderRightWidth: 5,
                      borderTopWidth: 6,
                      borderLeftColor: "transparent",
                      borderRightColor: "transparent",
                      borderTopColor: active ? "#FFFFFF" : primaryColor,
                    }}
                  />
                </View>
              </Marker>
            );
          }

          const size = c.jobs.length < 10 ? 40 : c.jobs.length < 100 ? 46 : 52;
          return (
            <Marker
              key={c.key}
              coordinate={{ latitude: c.latitude, longitude: c.longitude }}
              onPress={(e) => {
                e.stopPropagation?.();
                onPressCluster(c);
              }}
              zIndex={5}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: primaryColor,
                  borderColor: "#FFFFFF",
                  borderWidth: 3,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>{c.jobs.length}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 10,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: theme.surface + "EE",
          borderColor: theme.border,
          borderWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
        }}
      >
        <Ionicons name="shield-checkmark" size={13} color={theme.textSecondary} />
        <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "600" }}>
          {jobs.length} job{jobs.length === 1 ? "" : "s"} · locations are approximate
        </Text>
      </View>

      {single ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressJob(single.id)}
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 14,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 }}>
              {single.category}
              {userLocation ? ` · ~${approxDistanceKm(userLocation, single).toFixed(1)} km` : ""}
            </Text>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>
              {single.title}
            </Text>
            <Text style={{ color: primaryColor, fontSize: 15, fontWeight: "800", marginTop: 2 }}>
              {money(single)}
              {single.budgetMax && single.budgetMax !== single.budgetMin ? `–${single.budgetMax}` : ""}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{applicantsLabel(single.applicantCount ?? 0)}</Text>
          </View>
          <View style={{ backgroundColor: primaryColor, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>View</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {group ? (
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 14,
            maxHeight: 280,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 8 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "800" }}>{group.length} jobs in this area</Text>
            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {group.map((job) => (
              <TouchableOpacity
                key={job.id}
                activeOpacity={0.85}
                onPress={() => onPressJob(job.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {job.category} · {applicantsLabel(job.applicantCount ?? 0)}
                  </Text>
                </View>
                <Text style={{ color: primaryColor, fontSize: 15, fontWeight: "800" }}>{money(job)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
