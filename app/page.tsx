"use client";

import { AppProvider } from "@/context/AppContext";
import { MainAppLayout } from "@/components/MainAppLayout";

export default function Home() {
  return (
    <AppProvider>
      <MainAppLayout />
    </AppProvider>
  );
}
