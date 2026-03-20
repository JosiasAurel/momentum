"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { trpc, useTrpcClients } from "@/lib/trpc";

export function Providers({ children }: { children: ReactNode }) {
  const { queryClient, trpcClient } = useTrpcClients();

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  );
}
