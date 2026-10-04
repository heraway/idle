// ------------------------------------------------------------
// JOB LOCATION PRIVACY — single source of truth, enforced server-side.
//
// Lifecycle of a job's PRECISE location (exact coordinates + street address):
//   - Before hiring (no assignment)      -> approximate only, for everyone but the poster/admins
//   - After acceptance (assigned worker) -> precise for that worker
//   - While the job is active            -> precise stays available to that worker
//   - After COMPLETED / CANCELLED        -> worker access expires; only approximate is returned
//
// The poster always sees their own address; admins can see it for moderation.
// Nobody else (bidders, rejected bidders, browsers, ex-workers) ever gets it.
// ------------------------------------------------------------

export type JobStatusLike = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "CANCELLED" | "DISPUTED";

// Statuses after which a worker's access to the precise location expires.
export const ENDED_STATUSES: JobStatusLike[] = ["COMPLETED", "CANCELLED"];

export const isJobEnded = (status: string) => (ENDED_STATUSES as string[]).includes(status);

export interface Viewer {
  userId: string;
  role: string;
}

export const isAdminRole = (role?: string) => role === "ADMIN" || role === "SUPERADMIN";

// ~1.1km grid. Deterministic, so true coordinates can't be recovered from it.
export function approxCoord(n: number) {
  return Math.round(n * 100) / 100;
}

interface LocationJob {
  hirerId: string;
  status: string;
  assignments?: { workerId: string }[];
}

export function canSeePreciseLocation(job: LocationJob, viewer?: Viewer): boolean {
  if (!viewer) return false;
  if (isAdminRole(viewer.role)) return true;
  if (viewer.userId === job.hirerId) return true;
  const isAssignedWorker = !!job.assignments?.some((a) => a.workerId === viewer.userId);
  return isAssignedWorker && !isJobEnded(job.status);
}

export function maskJobLocation<
  T extends LocationJob & { latitude: number; longitude: number; address?: string | null }
>(job: T, viewer?: Viewer): T & { locationPrecise: boolean } {
  if (canSeePreciseLocation(job, viewer)) return { ...job, locationPrecise: true };
  return {
    ...job,
    latitude: approxCoord(job.latitude),
    longitude: approxCoord(job.longitude),
    address: null,
    locationPrecise: false,
  };
}
