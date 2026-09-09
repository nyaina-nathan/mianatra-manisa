"use client";

import type { Count } from "@/libs/counts/types";

type EntryListProps = {
  entries: Count[];
  startIndex: number;
  onDelete: (entry: Count) => void;
  onEdit: (entry: Count) => void;
};

export function EntryList({
  entries,
  startIndex,
  onDelete,
  onEdit,
}: EntryListProps) {
  return (
    <ul className="mt-6 flex flex-col gap-2">
      {entries.map((entry, index) => {
        const dateLabel = entry.logged_on ?? "No date";
        return (
          <li
            key={entry.id}
            className="flex items-center gap-4 rounded-sm border border-ink/50 bg-surface px-4 py-2"
          >
            <span className="w-10 shrink-0 font-mono text-xs text-ink/60">
              #{startIndex + index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-sm text-ink">{dateLabel}</span>
              {entry.description ? (
                <span className="text-sm text-ink/70">{entry.description}</span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="h-10 rounded-sm px-3 text-sm font-semibold text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry)}
              aria-label={`Delete entry logged on ${dateLabel}`}
              className="h-10 rounded-sm px-3 text-sm font-semibold text-danger-dark hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
}
