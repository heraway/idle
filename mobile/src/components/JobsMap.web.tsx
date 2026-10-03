import React from "react";
import { View, Text } from "react-native";
import { MapJob } from "../types";

type Props = {
  jobs: MapJob[];
  userLocation?: unknown; // unused on web
  initialRegion: unknown; // unused on web — kept so JobFeedScreen doesn't need platform branching at the call site
  primaryColor: string;
  onPressJob: (jobId: string) => void;
};

// react-native-maps has no web support (and importing it breaks the web
// bundle), so the browser gets this simple list fallback. The phone build
// uses the real map via JobsMap.native.tsx.
export default function JobsMap({ jobs, primaryColor, onPressJob }: Props) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: "700", marginBottom: 12, color: primaryColor }}>
        Map view isn't available in the browser — open the app on your phone to see jobs on a map.
      </Text>
      {jobs.map((job) => (
        <Text key={job.id} style={{ color: primaryColor, marginBottom: 8, fontWeight: "600" }} onPress={() => onPressJob(job.id)}>
          {job.title} →
        </Text>
      ))}
    </View>
  );
}
