// ------------------------------------------------------------
// IDLE — Design tokens
// A warm, trustworthy, "neighborhood job board" feel rather than a cold
// corporate gig-app look — deep indigo as the brand anchor (trust, dusk),
// amber as the action color (effort, energy), and generous rounded corners.
// ------------------------------------------------------------

export const brand = {
  indigo: "#3730A3",
  indigoLight: "#6366F1",
  amber: "#F59E0B",
  amberDark: "#B45309",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
};

export const lightTheme = {
  mode: "light" as const,
  background: "#FAFAF9",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F6",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textInverse: "#FFFFFF",
  primary: brand.indigo,
  primaryLight: brand.indigoLight,
  accent: brand.amber,
  accentText: "#78350F",
  success: brand.success,
  danger: brand.danger,
  warning: brand.warning,
  chipBackground: "#EEF2FF",
  chipText: brand.indigo,
  shadow: "rgba(17, 24, 39, 0.08)",
};

export const darkTheme = {
  mode: "dark" as const,
  background: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#273549",
  border: "#334155",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textInverse: "#0F172A",
  primary: brand.indigoLight,
  primaryLight: "#818CF8",
  accent: brand.amber,
  accentText: "#FDE68A",
  success: "#4ADE80",
  danger: "#F87171",
  warning: "#FBBF24",
  chipBackground: "#312E81",
  chipText: "#C7D2FE",
  shadow: "rgba(0, 0, 0, 0.4)",
};

export type Theme = typeof lightTheme;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "700" as const },
  h3: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyBold: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  small: { fontSize: 11, fontWeight: "500" as const },
};
