"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "./api";

type UserHeaderProps = {
  onExpired: () => void;
};

export function UserHeader({ onExpired }: UserHeaderProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ username: string }>("/api/auth/me")
      .then((user) => {
        if (active) setUsername(user.username);
      })
      .catch((error) => {
        if (active && error instanceof ApiClientError && error.isExpired) {
          onExpired();
        }
      });
    return () => {
      active = false;
    };
  }, [onExpired]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  }

  return (
    <header className="border-b border-ink/50 bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
          Mianatra Manisa
        </p>
        <div className="flex items-center gap-4">
          {username ? (
            <span className="text-sm text-ink/70">{username}</span>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-10 rounded-sm px-3 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </header>
  );
}
