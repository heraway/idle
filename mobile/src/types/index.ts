export interface SocialLinks {
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  x?: string | null;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  socialLinks?: SocialLinks | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
  verificationStatus: "NOT_REQUESTED" | "PENDING" | "VERIFIED" | "REJECTED";
  avgRating: number;
  ratingCount: number;
  likesReceived: number;
  hoursPerDayAvailable?: number | null;
  city?: string | null;
  country?: string | null;
}

export interface Job {
  id: string;
  hirerId: string;
  title: string;
  description: string;
  category: string;
  requiresLicense?: string | null;
  requiresIdVerification: boolean;
  latitude: number;
  longitude: number;
  address?: string | null;
  // false when the server is only returning an approximate location for this viewer
  locationPrecise?: boolean;
  city?: string | null;
  payType: "fixed" | "hourly";
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency: string;
  durationEstimate?: string | null;
  workersNeeded: number;
  hoursPerDayNeeded?: number | null;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "DISPUTED" | "CANCELLED";
  expiresAt: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  previewPhotoUrls: string[];
  hirer?: Partial<User>;
  assignments?: JobAssignment[];
  bids?: Bid[];
  checklistItems?: ChecklistItem[];
  questions?: JobQuestion[];
  applicantCount?: number; // live count of bids from the server (identities are never included)
  distanceKm?: number;
}

// Slim, privacy-safe job shape returned by GET /jobs/map — approximate
// coordinates only, no address and no hirer/applicant identities.
export interface MapJob {
  id: string;
  title: string;
  category: string;
  payType: "fixed" | "hourly";
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency: string;
  city?: string | null;
  latitude: number;
  longitude: number;
  applicantCount?: number;
}

export interface JobAssignment {
  id: string;
  workerId: string;
  worker?: Partial<User>;
}

export interface JobQuestion {
  id: string;
  jobId: string;
  askerId: string;
  body: string;
  answerBody?: string | null;
  answeredAt?: string | null;
  createdAt: string;
  asker?: Partial<User>;
}

export interface Bid {
  id: string;
  jobId: string;
  bidderId: string;
  amount: number;
  message?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  bidder?: Partial<User>;
}

export interface ChecklistItem {
  id: string;
  jobId: string;
  label: string;
  isDone: boolean;
  proofPhotoUrl?: string | null;
}

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  body?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  // "JOB_SITE" (poster shared the job location) | "PERSONAL" (someone shared their own location)
  locationKind?: "JOB_SITE" | "PERSONAL" | null;
  // true when a pin existed but the server no longer serves its coordinates to this viewer
  locationExpired?: boolean;
  deletedAt?: string | null;
  systemEvent?: string | null;
  createdAt: string;
  sender?: Partial<User>;
}
