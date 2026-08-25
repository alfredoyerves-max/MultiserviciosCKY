import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityHeartbeat } from "@/components/auth/activity-heartbeat";
import type { ReactNode } from "react";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireSession();

  return (
    <AppShell user={{ email: user.email, nombre: user.nombre }}>
      <ActivityHeartbeat />
      {children}
    </AppShell>
  );
}
