import React from "react";
import { View, Text } from "react-native";
import { Job } from "../types";

type Props = {
  jobs: Job[];
  initialRegion: unknown; // unused on web — kept so JobFeedScreen doesn't need platform branching at the call site
  primaryColor: string;
  onPressJob: (jobId: string) => void;
};

// react-native-maps has no web support, and even importing it inside a file
// that Metro bundles for web breaks the entire web bundle (a known Metro +
// react-native-maps incompatibility). So the web build gets this simple
// list fallback instead of a real map — the phone/Expo Go build still gets
// the real MapView via JobsMap.native.tsx.
export default function JobsMap({ jobs, primaryColor, onPressJob }: Props) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: "700", marginBottom: 12 }}>
        Map view isn't available in the browser — open the app on your phone to see jobs on a map.
      </Text>
      {jobs.map((job) => (
        <Text
          key={job.id}
          style={{ color: primaryColor, marginBottom: 8, fontWeight: "600" }}
          onPress={() => onPressJob(job.id)}
        >
          {job.title} →
        </Text>
      ))}
    </View>
  );
}
