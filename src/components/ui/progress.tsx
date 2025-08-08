import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0–100
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = "", value = 0, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, value));
    return (
      <div
        ref={ref}
        className={[
          "relative h-2 w-full overflow-hidden rounded-full bg-slate-200",
          className,
        ].join(" ")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        {...props}
      >
        <div
          className="h-full w-full rounded-full bg-emerald-500 transition-all"
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";