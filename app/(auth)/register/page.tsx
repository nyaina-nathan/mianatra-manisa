import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Create account — Mianatra Manisa",
};

export default function RegisterPage() {
  return (
    <>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
        Get started
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-ink/70">Start counting in seconds.</p>
      <RegisterForm />
    </>
  );
}
