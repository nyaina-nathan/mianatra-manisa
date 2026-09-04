import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Log in — Mianatra Manisa",
};

export default function LoginPage() {
  return (
    <>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
        Welcome back
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Log in</h1>
      <p className="mt-2 text-sm text-ink/70">Pick up where you left off.</p>
      <LoginForm />
    </>
  );
}
