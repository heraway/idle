import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TextScale = 1 | 1.15 | 1.3;

interface A11yState {
  textScale: TextScale;
  boldText: boolean;
}

interface A11yContextValue extends A11yState {
  setTextScale: (s: TextScale) => void;
  setBoldText: (b: boolean) => void;
  reset: () => void;
}

const DEFAULTS: A11yState = { textScale: 1, boldText: false };
const STORAGE_KEY = "idle:accessibility";

// Context the patched <Text> below reads. Lives outside the provider so the patch can be applied
// once at import time.
const StateContext = createContext<A11yState>(DEFAULTS);
const ActionsContext = createContext<A11yContextValue | undefined>(undefined);

// Idle's screens use fixed font sizes, so "Text size" and "Bold text" are applied by wrapping
// React Native's Text render once: every <Text> in the app reads the current setting and scales
// its own font size. It stacks on top of the phone's own font-size setting.
let patched = false;
function patchText() {
  if (patched) return;
  const T: any = Text;
  const original = T.render;
  if (typeof original !== "function") return; // unknown Text implementation: leave it alone
  patched = true;
  T.render = function patchedRender(props: any, ref: any) {
    const { textScale, boldText } = React.useContext(StateContext); // always called: keeps hook order stable
    if (textScale === 1 && !boldText) return original.call(this, props, ref);

    const flat: any = StyleSheet.flatten(props.style) || {};
    const next: any = {};
    next.fontSize = (flat.fontSize ?? 14) * textScale;
    if (flat.lineHeight) next.lineHeight = flat.lineHeight * textScale;
    if (boldText) {
      const w = flat.fontWeight === "bold" ? 700 : Number(flat.fontWeight) || 400;
      if (w < 600) next.fontWeight = "600";
    }
    return original.call(this, { ...props, style: [props.style, next] }, ref);
  };
}
patchText();

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<A11yState>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        const scale = [1, 1.15, 1.3].includes(saved.textScale) ? saved.textScale : 1;
        setState({ textScale: scale, boldText: saved.boldText === true });
      } catch {
        // ignore corrupt value
      }
    });
  }, []);

  const update = useCallback((patch: Partial<A11yState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const actions = useMemo<A11yContextValue>(
    () => ({
      ...state,
      setTextScale: (textScale) => update({ textScale }),
      setBoldText: (boldText) => update({ boldText }),
      reset: () => update(DEFAULTS),
    }),
    [state, update]
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useAccessibility must be used within an AccessibilityProvider");
  return ctx;
}
