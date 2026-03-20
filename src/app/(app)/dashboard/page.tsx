import { getServerSession } from "@/server/auth/session";
import { DashboardShell } from "@/components/workspace/dashboard-shell";

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <DashboardShell
      initialName={session?.user.name ?? ""}
      initialEmail={session?.user.email ?? ""}
      initialUsername=""
      initialIsProfilePublic={false}
    />
  );
}
