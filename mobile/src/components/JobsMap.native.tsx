import React, { useMemo, useRef } from "react";
import { WebView } from "react-native-webview";
import { Job } from "../types";

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

type Props = {
  jobs: Job[];
  initialRegion: Region;
  primaryColor: string;
  onPressJob: (jobId: string) => void;
};

// Renders on iOS/Android only — see JobsMap.web.tsx for the browser
// fallback. Metro picks whichever file matches the target platform based
// on the .native.tsx / .web.tsx suffix.
//
// Uses Leaflet + OpenStreetMap tiles inside a WebView instead of
// react-native-maps/Google Maps. Google Maps Platform now requires a
// billing account (card on file) to issue a working API key, even within
// the free tier — this approach needs no account, no key, and no billing
// of any kind.
function buildHtml(jobs: Job[], initialRegion: Region, primaryColor: string): string {
  const markers = jobs.map((job) => ({
    id: job.id,
    lat: job.latitude,
    lng: job.longitude,
    title: job.title.replace(/</g, "&lt;"),
    category: job.category.replace(/</g, "&lt;"),
    payType: job.payType,
    budgetMin: job.budgetMin ?? null,
    budgetMax: job.budgetMax ?? null,
    currency: job.currency ?? "",
  }));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .popup-title { font-weight: 700; margin-bottom: 2px; }
    .popup-meta { color: #555; font-size: 12px; margin-bottom: 4px; }
    .popup-link { color: ${primaryColor}; font-size: 12px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${initialRegion.latitude}, ${initialRegion.longitude}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Blue dot for the user's current position (center of initialRegion).
    L.circleMarker([${initialRegion.latitude}, ${initialRegion.longitude}], {
      radius: 7, color: '#1a73e8', fillColor: '#4285F4', fillOpacity: 1, weight: 2,
    }).addTo(map);

    const jobs = ${JSON.stringify(markers)};
    jobs.forEach((job) => {
      const payLine = job.budgetMin != null
        ? job.currency + ' ' + job.budgetMin + (job.budgetMax ? ('–' + job.budgetMax) : '')
        : '';
      const html =
        '<div class="popup-title">' + job.title + '</div>' +
        '<div class="popup-meta">' + job.category + ' · ' + (job.payType === 'hourly' ? 'hourly' : 'fixed') +
          (payLine ? (' · ' + payLine) : '') + '</div>' +
        '<div class="popup-link" onclick="window.ReactNativeWebView.postMessage(\\'' + job.id + '\\')">Tap for details →</div>';
      L.marker([job.lat, job.lng]).addTo(map).bindPopup(html);
    });
  </script>
</body>
</html>`;
}

export default function JobsMap({ jobs, initialRegion, primaryColor, onPressJob }: Props) {
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(() => buildHtml(jobs, initialRegion, primaryColor), [jobs, initialRegion, primaryColor]);

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1 }}
      onMessage={(event) => onPressJob(event.nativeEvent.data)}
    />
  );
}