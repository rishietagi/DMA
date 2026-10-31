"use client";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSession } from "@/lib/store/session";
import { AssessmentProvider } from "./assessment-provider";

/** `?theme=dark|light` switches the theme (demos, audits). */
function ThemeFromUrl() {
  const { setTheme } = useTheme();
  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("theme");
    if (t === "dark" || t === "light") setTheme(t);
  }, [setTheme]);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));

  React.useEffect(() => {
    void useSession.persist.rehydrate();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <ThemeFromUrl />
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={250}>
            <AssessmentProvider>{children}</AssessmentProvider>
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
