"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Project } from "@/libs/projects/types";
import { Field } from "@/components/field";
import { api, ApiClientError, GENERIC_ERROR } from "@/components/api";
import { Dialog } from "@/components/dialog";

type ProjectDialogProps = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProjectDialog({
  open,
  project,
  onClose,
  onSaved,
}: ProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
    >
      {open ? (
        <ProjectForm project={project} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Dialog>
  );
}

type ProjectFormProps = {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
};

function ProjectForm({ project, onClose, onSaved }: ProjectFormProps) {
  const alertRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const startedOn = String(data.get("started_on") ?? "");
    const payload = {
      title,
      description: description ? description : null,
      started_on: startedOn ? startedOn : null,
    };
    setPending(true);
    setError(null);
    try {
      if (project) {
        await api<Project>(`/api/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api<Project>("/api/projects", {
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
        label="Title"
        id="project-title"
        name="title"
        type="text"
        required
        maxLength={255}
        defaultValue={project?.title ?? ""}
        autoFocus
      />
      <div className="flex flex-col gap-2">
        <label
          htmlFor="project-description"
          className="text-sm font-medium text-ink"
        >
          Description
        </label>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          defaultValue={project?.description ?? ""}
          className="w-full rounded-sm border border-ink/50 bg-surface px-3 py-2 text-base text-ink placeholder:text-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
        <p className="font-mono text-xs text-ink/60">Optional</p>
      </div>
      <Field
        label="Started on"
        id="project-started-on"
        name="started_on"
        type="date"
        defaultValue={project?.started_on ?? ""}
        hint="Optional"
      />
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
            ? project
              ? "Saving…"
              : "Creating…"
            : project
              ? "Save changes"
              : "Create project"}
        </button>
      </div>
    </form>
  );
}
