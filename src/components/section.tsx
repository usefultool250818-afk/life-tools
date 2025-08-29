// src/components/section.tsx
export function Section({
  title, href, children,
}: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        <a href={href} className="text-sm text-indigo-600 hover:underline">
          すべて見る →
        </a>
      </div>
      {children}
    </section>
  );
}
