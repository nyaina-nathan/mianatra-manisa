"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Count } from "@/libs/counts/types";
import { Field } from "@/components/field";
import { api, ApiClientError, GENERIC_ERROR } from "@/components/api";
import { Dialog } from "@/components/dialog";

type EntryDialogProps = {
  open: boolean;
  projectId: string;
  entry: Count | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EntryDialog({
  open,
  projectId,
  entry,
  onClose,
  onSaved,
}: EntryDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={entry ? "Edit entry" : "Add entry"}
    >
      {open ? (
        <EntryForm
          projectId={projectId}
          entry={entry}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

type EntryFormProps = {
  projectId: string;
  entry: Count | null;
  onClose: () => void;
  onSaved: () => void;
};

function EntryForm({ projectId, entry, onClose, onSaved }: EntryFormProps) {
  const alertRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const loggedOn = String(data.get("logged_on") ?? "");
    const description = String(data.get("description") ?? "").trim();
    const payload = entry
      ? {
          logged_on: loggedOn ? loggedOn : null,
          description: description ? description : null,
        }
      : {
          ...(loggedOn && { logged_on: loggedOn }),
          ...(description && { description }),
        };
    setPending(true);
    setError(null);
    try {
      if (entry) {
        await api<Count>(`/api/projects/${projectId}/counts/${entry.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api<Count>(`/api/projects/${projectId}/counts`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : GENERIC_ERROR);
      alertRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="flex flex-col gap-6">
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
        label="Logged on"
        id="entry-logged-on"
        name="logged_on"
        type="date"
        defaultValue={entry?.logged_on ?? ""}
        hint={entry ? "Optional — clearing removes the date" : "Optional — defaults to today"}
      />
      <div className="flex flex-col gap-2">
        <label
          htmlFor="entry-description"
          className="text-sm font-medium text-ink"
        >
          Description
        </label>
        <textarea
          id="entry-description"
          name="description"
          rows={3}
          defaultValue={entry?.description ?? ""}
          className="w-full rounded-sm border border-ink/50 bg-surface px-3 py-2 text-base text-ink placeholder:text-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
        <p className="font-mono text-xs text-ink/60">Optional</p>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="h-10 rounded-sm border border-ink/50 px-4 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? entry
              ? "Saving…"
              : "Adding…"
            : entry
              ? "Save changes"
              : "Add entry"}
        </button>
      </div>
    </form>
  );
}
