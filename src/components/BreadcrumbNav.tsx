import Link from 'next/link';

interface Crumb {
  href: string;
  label: string;
}

export default function BreadcrumbNav({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-light-muted dark:text-dark-muted mb-6" aria-label="面包屑导航">
      <Link href="/" className="hover:text-accent dark:hover:text-accent-dark transition-colors">首页</Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          <Link href={item.href} className="hover:text-accent dark:hover:text-accent-dark transition-colors">{item.label}</Link>
        </span>
      ))}
    </nav>
  );
}