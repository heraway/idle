export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface JobCluster<T extends GeoPoint> {
  key: string;
  latitude: number;
  longitude: number;
  jobs: T[];
  // true when every job sits on exactly the same (approximate) spot — zooming
  // in can never separate them, so the UI lists them instead.
  sameSpot: boolean;
}

export function applicantsLabel(n: number) {
  return `${n} applicant${n === 1 ? "" : "s"}`;
}

// Groups jobs into screen-sized grid cells for the current zoom level. Cells
// are ~1/7 of the viewport tall and ~1/4 wide, which is roughly square on a
// portrait phone. Cells with a single job stay as normal price pins.
export function clusterJobs<T extends GeoPoint & { id: string }>(
  jobs: T[],
  region: { latitudeDelta: number; longitudeDelta: number }
): JobCluster<T>[] {
  const cellLat = Math.max(region.latitudeDelta, 0.0005) / 7;
  const cellLng = Math.max(region.longitudeDelta, 0.0005) / 4;

  const buckets = new Map<string, T[]>();
  for (const job of jobs) {
    const cell = `${Math.floor(job.latitude / cellLat)}:${Math.floor(job.longitude / cellLng)}`;
    const list = buckets.get(cell);
    if (list) list.push(job);
    else buckets.set(cell, [job]);
  }

  const out: JobCluster<T>[] = [];
  buckets.forEach((list, cell) => {
    const first = list[0];
    if (list.length === 1) {
      out.push({ key: first.id, latitude: first.latitude, longitude: first.longitude, jobs: list, sameSpot: true });
      return;
    }
    const latitude = list.reduce((s, j) => s + j.latitude, 0) / list.length;
    const longitude = list.reduce((s, j) => s + j.longitude, 0) / list.length;
    const sameSpot = list.every((j) => j.latitude === first.latitude && j.longitude === first.longitude);
    out.push({ key: `c:${cell}:${list.length}`, latitude, longitude, jobs: list, sameSpot });
  });
  return out;
}

// A region that frames the given jobs with some breathing room.
export function regionForJobs(jobs: GeoPoint[]) {
  const lats = jobs.map((j) => j.latitude);
  const lngs = jobs.map((j) => j.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.02),
  };
}

export function approxDistanceKm(a: GeoPoint, b: GeoPoint) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
