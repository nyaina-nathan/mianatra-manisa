"use client";

import type { ProjectWithCount } from "@/libs/projects/types";

type ProjectCardProps = {
  project: ProjectWithCount;
  adding: boolean;
  onQuickAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const secondaryButton =
  "h-10 rounded-sm border border-ink/50 bg-surface px-3 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50";

export function ProjectCard({
  project,
  adding,
  onQuickAdd,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-ink/50 bg-surface shadow-sm">
      <div className="flex h-28 flex-col items-center justify-center gap-1 bg-primary px-4">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-ink">
          Counts
        </p>
        <p className="text-2xl font-bold text-ink">{project.total_count}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate text-lg font-semibold text-ink" title={project.title}>
          {project.title}
        </h3>
        <p className="line-clamp-2 text-sm text-ink/70">
          {project.description ? project.description : "No description yet."}
        </p>
        {project.started_on ? (
          <p className="font-mono text-xs text-ink/60">
            Started {project.started_on}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-ink/50 p-3">
        <button
          type="button"
          onClick={onQuickAdd}
          disabled={adding}
          aria-busy={adding}
          aria-label={`Add one count to ${project.title}`}
          className="h-10 min-w-20 rounded-sm bg-primary px-3 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? "Adding…" : "+1"}
        </button>
        <button type="button" onClick={onEdit} className={secondaryButton}>
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto h-10 rounded-sm px-3 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
