"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-md bg-surface p-6 text-ink shadow-xl backdrop:bg-ink/50 open:flex open:flex-col"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-sm text-xl text-ink/70 hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          &times;
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  );
}
