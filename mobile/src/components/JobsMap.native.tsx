import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Job } from "../types";
import { useTheme } from "../context/ThemeContext";

type Props = {
  jobs: Job[];
  initialRegion: Region;
  primaryColor: string;
  onPressJob: (jobId: string) => void;
};

const money = (j: Job) => {
  const cur = j.currency === "USD" ? "$" : `${j.currency} `;
  if (j.budgetMin == null) return "—";
  return `${cur}${j.budgetMin}${j.payType === "hourly" ? "/hr" : ""}`;
};

// Renders on iOS/Android only — see JobsMap.web.tsx for the browser fallback.
// Pins are price bubbles (so the map answers "what pays what, and where"
// at a glance) and tapping one opens a preview card instead of a tiny callout.
export default function JobsMap({ jobs, initialRegion, primaryColor, onPressJob }: Props) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<Job | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSelected(null)}
        userInterfaceStyle={theme.mode === "dark" ? "dark" : "light"}
      >
        {jobs.map((job) => {
          const active = selected?.id === job.id;
          return (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.latitude, longitude: job.longitude }}
              onPress={(e) => {
                e.stopPropagation?.();
                setSelected(job);
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

      {selected ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onPressJob(selected.id)}
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
              {selected.category}
              {typeof selected.distanceKm === "number" ? ` · ${selected.distanceKm.toFixed(1)} km` : ""}
            </Text>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>
              {selected.title}
            </Text>
            <Text style={{ color: primaryColor, fontSize: 15, fontWeight: "800", marginTop: 2 }}>
              {money(selected)}
              {selected.budgetMax ? `–${selected.budgetMax}` : ""}
            </Text>
          </View>
          <View style={{ backgroundColor: primaryColor, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>View</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
