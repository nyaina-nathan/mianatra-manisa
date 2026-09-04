"use client";

import { useState, type ReactNode } from "react";
import { GENERIC_ERROR } from "./api";
import { Dialog } from "./dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: ReactNode | null;
  confirmLabel: string;
  pendingLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pendingLabel = "Working…",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {open && body !== null ? (
        <ConfirmBody
          body={body}
          confirmLabel={confirmLabel}
          pendingLabel={pendingLabel}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}

type ConfirmBodyProps = {
  body: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function ConfirmBody({
  body,
  confirmLabel,
  pendingLabel,
  onClose,
  onConfirm,
}: ConfirmBodyProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div role="alert" className="rounded-sm bg-danger/10 p-4">
          <p className="text-sm text-danger-dark">{error}</p>
        </div>
      ) : null}
      {body}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="h-10 rounded-sm border border-ink/50 px-4 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          aria-busy={pending}
          className="h-10 rounded-sm bg-danger px-4 text-sm font-semibold text-white hover:bg-danger-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </div>
  );
}
