export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  bio?: string | null;
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
  workerId?: string | null;
  title: string;
  description: string;
  category: string;
  requiresLicense?: string | null;
  requiresIdVerification: boolean;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  payType: "fixed" | "hourly";
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency: string;
  durationEstimate?: string | null;
  workersNeeded: number;
  hoursPerDayNeeded?: number | null;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "DISPUTED" | "CANCELLED";
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  previewPhotoUrls: string[];
  hirer?: Partial<User>;
  worker?: Partial<User>;
  bids?: Bid[];
  checklistItems?: ChecklistItem[];
  questions?: JobQuestion[];
  _count?: { bids: number };
  distanceKm?: number;
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
  systemEvent?: string | null;
  createdAt: string;
  sender?: Partial<User>;
}
