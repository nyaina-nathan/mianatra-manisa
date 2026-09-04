import type { ComponentProps } from "react";

type FieldProps = {
  label: string;
  hint?: string;
} & ComponentProps<"input">;

export function Field({ label, hint, id, ...inputProps }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className="h-10 w-full rounded-sm border border-ink/50 bg-surface px-3 text-base text-ink placeholder:text-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      />
      {hint ? <p className="font-mono text-xs text-ink/60">{hint}</p> : null}
    </div>
  );
}
