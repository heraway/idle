// Single source of truth for job categories. Used by both the feed filter
// (which needs the "All" pseudo-category) and the post-job form (which
// doesn't — you can't post a job as "All").
export const JOB_CATEGORIES = [
  "Home & Cleaning",
  "Outdoor & Yard",
  "Child & Pet Care",
  "Errands & Delivery",
  "Moving & Lifting",
  "Repairs & Assembly",
  "Beauty & Personal Care",
  "Tech & Digital",
  "Events & Hospitality",
  "Tutoring & Lessons",
  "Creative & Media",
  "Other",
] as const;

export const FEED_CATEGORIES = ["All", ...JOB_CATEGORIES] as const;
