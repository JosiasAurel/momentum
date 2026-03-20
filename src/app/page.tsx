import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SignedOutShell } from "@/components/layout/signed-out-shell";
import { getServerSession } from "@/server/auth/session";

export default async function HomePage() {
  const session = await getServerSession();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <SignedOutShell />
      <SiteFooter />
    </div>
  );
}
