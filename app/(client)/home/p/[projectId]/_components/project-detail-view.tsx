"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Count, CountList } from "@/libs/counts/types";
import type { ProjectWithCount } from "@/libs/projects/types";
import {
  api,
  ApiClientError,
  ConfirmDialog,
  GENERIC_ERROR,
  ProjectDialog,
  SessionExpired,
  UserHeader,
} from "@/_components";
import { EntryDialog } from "./entry-dialog";
import { EntryList } from "./entry-list";

const PAGE_SIZE = 20;

type ProjectState = "loading" | "ready" | "error" | "notfound";

type DialogState =
  | { kind: "closed" }
  | { kind: "editProject" }
  | { kind: "deleteProject" }
  | { kind: "addEntry" }
  | { kind: "editEntry"; entry: Count }
  | { kind: "deleteEntry"; entry: Count };

const CLOSED: DialogState = { kind: "closed" };

type ProjectDetailViewProps = {
  projectId: string;
};

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectWithCount | null>(null);
  const [projectState, setProjectState] = useState<ProjectState>("loading");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Count[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expired, setExpired] = useState(false);
  const [pageAlert, setPageAlert] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>(CLOSED);

  const handleExpired = useCallback(() => setExpired(true), []);

  useEffect(() => {
    if (pageAlert === null) return;
    const timer = setTimeout(() => setPageAlert(null), 10_000);
    return () => clearTimeout(timer);
  }, [pageAlert]);

  useEffect(() => {
    let active = true;
    api<ProjectWithCount>(`/api/projects/${projectId}`)
      .then((loaded) => {
        if (!active) return;
        setProject(loaded);
        setProjectState("ready");
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && err.isExpired) {
          setExpired(true);
          return;
        }
        if (err instanceof ApiClientError && err.status === 404) {
          setProjectState("notfound");
          return;
        }
        setProjectError(
          err instanceof ApiClientError ? err.message : GENERIC_ERROR
        );
        setProjectState("error");
      });
    api<CountList>(`/api/projects/${projectId}/counts?limit=${PAGE_SIZE}&offset=0`)
      .then((list) => {
        if (!active) return;
        setEntries(list.items);
        setEntriesTotal(list.total);
        setEntriesLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && err.isExpired) {
          setExpired(true);
          return;
        }
        if (err instanceof ApiClientError && err.status === 404) {
          setProjectState("notfound");
          return;
        }
        setEntriesError(
          err instanceof ApiClientError ? err.message : GENERIC_ERROR
        );
        setEntriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function reloadProject() {
    try {
      const loaded = await api<ProjectWithCount>(`/api/projects/${projectId}`);
      setProject(loaded);
      setProjectState("ready");
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      if (err instanceof ApiClientError && err.status === 404) {
        setProjectState("notfound");
        return;
      }
      setProjectError(
        err instanceof ApiClientError ? err.message : GENERIC_ERROR
      );
      setProjectState("error");
    }
  }

  async function reloadEntries() {
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const list = await api<CountList>(
        `/api/projects/${projectId}/counts?limit=${PAGE_SIZE}&offset=0`
      );
      setEntries(list.items);
      setEntriesTotal(list.total);
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      setEntriesError(
        err instanceof ApiClientError ? err.message : GENERIC_ERROR
      );
    } finally {
      setEntriesLoading(false);
    }
  }

  async function loadMoreEntries() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const list = await api<CountList>(
        `/api/projects/${projectId}/counts?limit=${PAGE_SIZE}&offset=${entries.length}`
      );
      setEntries((current) => [...current, ...list.items]);
      setEntriesTotal(list.total);
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      setPageAlert(
        err instanceof ApiClientError ? err.message : GENERIC_ERROR
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleProjectDelete() {
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      throw err;
    }
    router.replace("/home");
  }

  function handleEntrySaved() {
    const wasCreate = dialogState.kind === "addEntry";
    setDialogState(CLOSED);
    if (wasCreate) {
      setProject((current) =>
        current ? { ...current, total_count: current.total_count + 1 } : current
      );
    }
    void reloadEntries();
  }

  async function handleEntryDeleteConfirm() {
    if (dialogState.kind !== "deleteEntry") return;
    const entry = dialogState.entry;
    try {
      await api(`/api/projects/${projectId}/counts/${entry.id}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      throw err;
    }
    setDialogState(CLOSED);
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setEntriesTotal((current) => Math.max(0, current - 1));
    setProject((current) =>
      current
        ? { ...current, total_count: Math.max(0, current.total_count - 1) }
        : current
    );
  }

  if (expired) {
    return <SessionExpired />;
  }

  if (projectState === "notfound") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
          Not found
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Project not found.</h1>
        <p className="mt-2 text-sm text-ink/70">It may have been deleted.</p>
        <Link
          href="/home"
          className="mt-6 flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Back to projects
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-cream">
      <UserHeader onExpired={handleExpired} />
      <main className="mx-auto max-w-3xl px-6 py-8 lg:py-12">
        <Link
          href="/home"
          className="inline-block font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          &larr; All projects
        </Link>
        {projectState === "loading" ? (
          <div
            role="status"
            aria-label="Loading project"
            className="mt-8 animate-pulse"
            aria-hidden="true"
          >
            <div className="h-10 w-2/3 rounded bg-ink/10" />
            <div className="mt-3 h-4 w-1/2 rounded bg-ink/10" />
            <div className="mt-6 h-24 rounded bg-ink/10" />
          </div>
        ) : projectState === "error" ? (
          <div role="alert" className="mt-8 rounded-sm bg-danger/10 p-4">
            <p className="text-sm text-danger-dark">{projectError}</p>
            <button
              type="button"
              onClick={() => void reloadProject()}
              className="mt-3 h-10 rounded-sm border border-ink/50 bg-surface px-4 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Try again
            </button>
          </div>
        ) : project ? (
          <>
            <div className="mt-8 flex items-start justify-between gap-6">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-ink">{project.title}</h1>
                {project.description ? (
                  <p className="mt-2 text-sm text-ink/70">
                    {project.description}
                  </p>
                ) : null}
                {project.started_on ? (
                  <p className="mt-2 font-mono text-xs text-ink/60">
                    Started {project.started_on}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-center rounded-md bg-primary px-6 py-4 text-ink">
                <p className="font-mono text-xs font-medium uppercase tracking-[0.2em]">
                  Counts
                </p>
                <p className="text-2xl font-bold">{project.total_count}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDialogState({ kind: "editProject" })}
                className="h-10 rounded-sm border border-ink/50 bg-surface px-3 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                Edit project
              </button>
              <button
                type="button"
                onClick={() => setDialogState({ kind: "deleteProject" })}
                className="h-10 rounded-sm px-3 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                Delete project
              </button>
            </div>
            <section className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-ink">Entries</h2>
                <button
                  type="button"
                  onClick={() => setDialogState({ kind: "addEntry" })}
                  className="h-10 rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:translate-y-px"
                >
                  Add entry
                </button>
              </div>
              {pageAlert ? (
                <div role="alert" className="mt-4 rounded-sm bg-danger/10 p-4">
                  <p className="text-sm text-danger-dark">{pageAlert}</p>
                </div>
              ) : null}
              {entriesLoading ? (
                <div
                  role="status"
                  aria-label="Loading entries"
                  aria-hidden="true"
                  className="mt-6 flex animate-pulse flex-col gap-2"
                >
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="h-14 rounded-sm border border-ink/50 bg-surface"
                    />
                  ))}
                </div>
              ) : entriesError ? (
                <div role="alert" className="mt-6 rounded-sm bg-danger/10 p-4">
                  <p className="text-sm text-danger-dark">{entriesError}</p>
                  <button
                    type="button"
                    onClick={() => void reloadEntries()}
                    className="mt-3 h-10 rounded-sm border border-ink/50 bg-surface px-4 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                  >
                    Try again
                  </button>
                </div>
              ) : entries.length === 0 ? (
                <div className="mt-6 flex flex-col items-center rounded-md border border-dashed border-ink/50 bg-surface px-6 py-12 text-center">
                  <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
                    No entries yet
                  </p>
                  <p className="mt-2 text-sm text-ink/70">
                    Log your first count for this project.
                  </p>
                </div>
              ) : (
                <EntryList
                  entries={entries}
                  startIndex={0}
                  onDelete={(entry) =>
                    setDialogState({ kind: "deleteEntry", entry })
                  }
                  onEdit={(entry) =>
                    setDialogState({ kind: "editEntry", entry })
                  }
                />
              )}
              {!entriesLoading && !entriesError && entries.length < entriesTotal ? (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <p className="font-mono text-xs text-ink/60">
                    Showing {entries.length} of {entriesTotal}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadMoreEntries()}
                    disabled={loadingMore}
                    className="h-10 rounded-sm border border-ink/50 bg-surface px-4 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
      <ProjectDialog
        open={dialogState.kind === "editProject"}
        project={project}
        onClose={() => setDialogState(CLOSED)}
        onSaved={() => {
          setDialogState(CLOSED);
          void reloadProject();
        }}
      />
      <ConfirmDialog
        open={dialogState.kind === "deleteProject"}
        title="Delete project?"
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onClose={() => setDialogState(CLOSED)}
        onConfirm={handleProjectDelete}
        body={
          project ? (
            <p className="text-sm text-ink/70">
              This permanently deletes{" "}
              <span className="font-semibold text-ink">
                &ldquo;{project.title}&rdquo;
              </span>{" "}
              and its {project.total_count}{" "}
              {project.total_count === 1 ? "count" : "counts"}.
            </p>
          ) : null
        }
      />
      <EntryDialog
        open={dialogState.kind === "addEntry" || dialogState.kind === "editEntry"}
        projectId={projectId}
        entry={dialogState.kind === "editEntry" ? dialogState.entry : null}
        onClose={() => setDialogState(CLOSED)}
        onSaved={handleEntrySaved}
      />
      <ConfirmDialog
        open={dialogState.kind === "deleteEntry"}
        title="Delete entry?"
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onClose={() => setDialogState(CLOSED)}
        onConfirm={handleEntryDeleteConfirm}
        body={
          dialogState.kind === "deleteEntry" ? (
            <p className="text-sm text-ink/70">
              This permanently deletes the entry logged on{" "}
              <span className="font-semibold text-ink">
                {dialogState.entry.logged_on ?? "no date"}
              </span>
              .
            </p>
          ) : null
        }
      />
    </div>
  );
}
