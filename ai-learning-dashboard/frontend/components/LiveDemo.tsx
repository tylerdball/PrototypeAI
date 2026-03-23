"use client";

interface LiveDemoProps {
  title: string;
  children: React.ReactNode;
  badge?: string;
}

export function LiveDemo({ title, children, badge = "Live Demo" }: LiveDemoProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-500 border border-brand-500/30 font-medium">
          {badge}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
