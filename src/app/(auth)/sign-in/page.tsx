import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <Card className="w-full border-primary/20">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Momentum</p>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Return to your workspace garden and continue the next sprint.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/sign-in/email" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button className="w-full" type="submit">Sign in</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link className="text-primary underline-offset-4 hover:underline" href="/sign-up">
              Create a Momentum account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
