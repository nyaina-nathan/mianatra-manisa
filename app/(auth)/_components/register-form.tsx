"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Field } from "./field";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const alertRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (error === null) return;
    const timer = setTimeout(() => setError(null), 10_000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.get("username"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? GENERIC_ERROR);
        alertRef.current?.focus();
        return;
      }
      router.replace("/home");
    } catch {
      setError(GENERIC_ERROR);
      alertRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="mt-8 flex flex-col gap-6">
      {error ? (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-sm bg-danger/10 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-danger-dark">
            Error
          </p>
          <p className="mt-1 text-sm text-danger-dark">{error}</p>
        </div>
      ) : null}
      <Field
        label="Username"
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        required
        maxLength={20}
        hint="Max 20 characters"
      />
      <Field
        label="Email"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        hint="8–72 characters"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-sm bg-primary text-base font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-sm text-ink/70">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-secondary-dark underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
