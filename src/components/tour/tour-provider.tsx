"use client";
/** Placeholder — the guided tour lands in phase 4. */
import * as React from "react";
import { toast } from "sonner";

interface TourCtx {
  start: () => void;
}
const Ctx = React.createContext<TourCtx>({ start: () => toast("Guided assessment arrives in phase 4.") });

export function TourProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ start: () => toast("Guided assessment arrives in phase 4.") }}>{children}</Ctx.Provider>;
}
export const useTour = () => React.useContext(Ctx);
export function TourOverlay() {
  return null;
}
