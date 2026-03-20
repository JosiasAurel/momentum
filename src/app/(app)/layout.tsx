import { redirect } from "next/navigation";
import { getServerSession } from "@/server/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
