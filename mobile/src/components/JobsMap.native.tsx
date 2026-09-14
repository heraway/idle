import React from "react";
import { View, Text } from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import { Job } from "../types";

type Props = {
  jobs: Job[];
  initialRegion: Region;
  primaryColor: string;
  onPressJob: (jobId: string) => void;
};

// Renders on iOS/Android only — see JobsMap.web.tsx for the browser
// fallback. Metro picks whichever file matches the target platform based
// on the .native.tsx / .web.tsx suffix, so react-native-maps (a native-only
// library) is never even resolved when bundling for web.
export default function JobsMap({ jobs, initialRegion, primaryColor, onPressJob }: Props) {
  return (
    <MapView style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation showsMyLocationButton>
      {jobs.map((job) => (
        <Marker key={job.id} coordinate={{ latitude: job.latitude, longitude: job.longitude }} pinColor={primaryColor}>
          <Callout onPress={() => onPressJob(job.id)}>
            <View style={{ maxWidth: 220, padding: 4 }}>
              <Text style={{ fontWeight: "700", marginBottom: 2 }} numberOfLines={1}>
                {job.title}
              </Text>
              <Text style={{ color: "#555", fontSize: 12 }} numberOfLines={2}>
                {job.category} · {job.payType === "hourly" ? "hourly" : "fixed"}
                {job.budgetMin != null ? ` · ${job.currency} ${job.budgetMin}${job.budgetMax ? `–${job.budgetMax}` : ""}` : ""}
              </Text>
              <Text style={{ color: primaryColor, fontSize: 12, marginTop: 4, fontWeight: "600" }}>Tap for details →</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}
