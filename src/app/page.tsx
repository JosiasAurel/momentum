import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SignedOutShell } from "@/components/layout/signed-out-shell";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <SignedOutShell />
      <SiteFooter />
    </div>
  );
}
