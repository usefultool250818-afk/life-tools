// src/components/card.tsx
export function Card({
  title, desc, href,
}: { title: string; desc?: string; href: string }) {
  return (
    <a href={href} className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <h4 className="text-lg font-medium">{title}</h4>
      {desc && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{desc}</p>}
    </a>
  );
}
