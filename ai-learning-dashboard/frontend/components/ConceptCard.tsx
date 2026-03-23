import Link from "next/link";

interface ConceptCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  tags: string[];
  color: string; // tailwind gradient class fragment
}

export function ConceptCard({ title, description, href, icon, tags, color }: ConceptCardProps) {
  return (
    <Link href={href} className="group block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-brand-500/60 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/10">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg text-2xl bg-gradient-to-br ${color}`}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white mb-1 group-hover:text-brand-500 transition-colors">{title}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">{description}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[var(--muted)] border border-white/10">
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
