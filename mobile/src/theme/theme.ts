// ------------------------------------------------------------
// IDLE — Design tokens ("Kinetic Obsidian")
// Dense dark slate canvas + concentrated bursts of kinetic orange for the
// high-intent actions (bid, post, send). Surfaces are separated by tone and
// 1px hairlines instead of drop shadows. A warm light variant is included
// for people who prefer it; dark is the default.
// Token KEYS are unchanged from the old theme so every existing screen
// picks up the new look automatically.
// ------------------------------------------------------------

export const brand = {
  orange: "#FF6B00",
  orangeDeep: "#E65A00",
  orangeLight: "#FF8C38",
  success: "#3DDC84",
  danger: "#FF5C5C",
  warning: "#FFB020",
};

export const lightTheme = {
  mode: "light" as const,
  background: "#FAF8F6",
  surface: "#FFFFFF",
  surfaceAlt: "#F2EEEA",
  border: "#E8E1DA",
  textPrimary: "#1B1612",
  textSecondary: "#6F665E",
  textInverse: "#FFFFFF",
  primary: brand.orangeDeep,
  primaryLight: brand.orange,
  accent: brand.orange,
  accentText: "#9A3F00",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  chipBackground: "#FFF0E6",
  chipText: "#B34700",
  shadow: "rgba(27, 22, 18, 0.08)",
  // new tokens
  surfaceRaised: "#FFFFFF",
  accentSoft: "rgba(230, 90, 0, 0.10)",
  accentBorder: "rgba(230, 90, 0, 0.30)",
  overlay: "rgba(0,0,0,0.45)",
  bubbleOther: "#F2EEEA",
};

export const darkTheme = {
  mode: "dark" as const,
  background: "#121316",
  surface: "#1A1C20",
  surfaceAlt: "#22252A",
  border: "#2E3238",
  textPrimary: "#F4F5F7",
  textSecondary: "#9DA3AE",
  textInverse: "#FFFFFF",
  primary: brand.orange,
  primaryLight: brand.orangeLight,
  accent: brand.orangeLight,
  accentText: "#FF8C38",
  success: brand.success,
  danger: brand.danger,
  warning: brand.warning,
  chipBackground: "#22252A",
  chipText: "#B4BAC4",
  shadow: "rgba(0, 0, 0, 0.5)",
  // new tokens
  surfaceRaised: "#2A2E35",
  accentSoft: "rgba(255, 107, 0, 0.12)",
  accentBorder: "rgba(255, 107, 0, 0.32)",
  overlay: "rgba(0,0,0,0.65)",
  bubbleOther: "#22252A",
};

export type Theme = typeof lightTheme | typeof darkTheme;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const typography = {
  h1: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  small: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.2 },
  label: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6, textTransform: "uppercase" as const },
  price: { fontSize: 22, fontWeight: "800" as const, fontVariant: ["tabular-nums" as const] },
};
