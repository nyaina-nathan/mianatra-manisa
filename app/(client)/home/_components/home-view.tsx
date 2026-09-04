"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ProjectList, ProjectWithCount } from "@/libs/projects/types";
import { api, ApiClientError, GENERIC_ERROR } from "./api";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { ProjectCard } from "./project-card";
import { ProjectDialog } from "./project-dialog";
import { UserHeader } from "./user-header";

const PAGE_SIZE = 20;

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; project: ProjectWithCount }
  | { kind: "delete"; project: ProjectWithCount };

const CLOSED: DialogState = { kind: "closed" };

export function HomeView() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
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
    api<ProjectList>(`/api/projects?limit=${PAGE_SIZE}&offset=0`)
      .then((list) => {
        if (!active) return;
        setProjects(list.items);
        setTotal(list.total);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && err.isExpired) {
          setExpired(true);
          return;
        }
        setLoadError(
          err instanceof ApiClientError ? err.message : GENERIC_ERROR
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await api<ProjectList>(
        `/api/projects?limit=${PAGE_SIZE}&offset=0`
      );
      setProjects(list.items);
      setTotal(list.total);
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      setLoadError(err instanceof ApiClientError ? err.message : GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const list = await api<ProjectList>(
        `/api/projects?limit=${PAGE_SIZE}&offset=${projects.length}`
      );
      setProjects((current) => [...current, ...list.items]);
      setTotal(list.total);
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

  async function handleQuickAdd(project: ProjectWithCount) {
    if (addingId !== null) return;
    setAddingId(project.id);
    setPageAlert(null);
    try {
      await api(`/api/projects/${project.id}/counts`, {
        method: "POST",
        body: "{}",
      });
      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? { ...item, total_count: item.total_count + 1 }
            : item
        )
      );
    } catch (err) {
      if (err instanceof ApiClientError && err.isExpired) {
        setExpired(true);
        return;
      }
      setPageAlert(
        err instanceof ApiClientError ? err.message : GENERIC_ERROR
      );
    } finally {
      setAddingId(null);
    }
  }

  function handleListRefresh() {
    setDialogState(CLOSED);
    void load();
  }

  if (expired) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
          Session expired
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          Your session has ended.
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          Log in again to keep counting.
        </p>
        <Link
          href="/login"
          className="mt-6 flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Log in
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-cream">
      <UserHeader onExpired={handleExpired} />
      <main className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-ink">Projects</h1>
          <button
            type="button"
            onClick={() => setDialogState({ kind: "create" })}
            className="h-10 rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:translate-y-px"
          >
            New project
          </button>
        </div>
        {pageAlert ? (
          <div role="alert" className="mt-6 rounded-sm bg-danger/10 p-4">
            <p className="text-sm text-danger-dark">{pageAlert}</p>
          </div>
        ) : null}
        {loading ? (
          <div
            role="status"
            aria-label="Loading projects"
            className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                aria-hidden="true"
                className="animate-pulse rounded-md border border-ink/50 bg-surface"
              >
                <div className="h-28 bg-ink/10" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-5 w-2/3 rounded bg-ink/10" />
                  <div className="h-4 w-full rounded bg-ink/10" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="mt-8 rounded-sm bg-danger/10 p-4">
            <p className="text-sm text-danger-dark">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 h-10 rounded-sm border border-ink/50 bg-surface px-4 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Try again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-md border border-dashed border-ink/50 bg-surface px-6 py-16 text-center">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
              No projects yet
            </p>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Track your first tally
            </h2>
            <p className="mt-2 text-sm text-ink/70">
              Create a project to start counting.
            </p>
            <button
              type="button"
              onClick={() => setDialogState({ kind: "create" })}
              className="mt-6 h-10 rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:translate-y-px"
            >
              New project
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                adding={addingId === project.id}
                onQuickAdd={() => void handleQuickAdd(project)}
                onEdit={() =>
                  setDialogState({ kind: "edit", project })
                }
                onDelete={() =>
                  setDialogState({ kind: "delete", project })
                }
              />
            ))}
          </div>
        )}
        {!loading && !loadError && projects.length < total ? (
          <div className="mt-8 flex items-center justify-center gap-3">
            <p className="font-mono text-xs text-ink/60">
              Showing {projects.length} of {total}
            </p>
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="h-10 rounded-sm border border-ink/50 bg-surface px-4 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </main>
      <ProjectDialog
        key={
          dialogState.kind === "edit" ? `edit-${dialogState.project.id}` : "new"
        }
        open={dialogState.kind === "create" || dialogState.kind === "edit"}
        project={dialogState.kind === "edit" ? dialogState.project : null}
        onClose={() => setDialogState(CLOSED)}
        onSaved={handleListRefresh}
      />
      <ConfirmDeleteDialog
        open={dialogState.kind === "delete"}
        project={dialogState.kind === "delete" ? dialogState.project : null}
        onClose={() => setDialogState(CLOSED)}
        onDeleted={handleListRefresh}
      />
    </div>
  );
}
