"use client";

import { useState } from "react";
import type { ProjectWithCount } from "@/libs/projects/types";
import { api, ApiClientError, GENERIC_ERROR } from "./api";
import { Dialog } from "./dialog";

type ConfirmDeleteDialogProps = {
  open: boolean;
  project: ProjectWithCount | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function ConfirmDeleteDialog({
  open,
  project,
  onClose,
  onDeleted,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Delete project?">
      {open && project ? (
        <ConfirmDeleteBody
          project={project}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      ) : null}
    </Dialog>
  );
}

type ConfirmDeleteBodyProps = {
  project: ProjectWithCount;
  onClose: () => void;
  onDeleted: () => void;
};

function ConfirmDeleteBody({
  project,
  onClose,
  onDeleted,
}: ConfirmDeleteBodyProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : GENERIC_ERROR);
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
      <p className="text-sm text-ink/70">
        This permanently deletes{" "}
        <span className="font-semibold text-ink">
          &ldquo;{project.title}&rdquo;
        </span>{" "}
        and its {project.total_count}{" "}
        {project.total_count === 1 ? "count" : "counts"}.
      </p>
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
          onClick={handleDelete}
          disabled={pending}
          aria-busy={pending}
          className="h-10 rounded-sm bg-danger px-4 text-sm font-semibold text-white hover:bg-danger-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
