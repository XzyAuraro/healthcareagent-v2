'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

type PrimaryTabsNavProps = {
  className?: string;
};

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/training', label: '虚拟病例训练' },
  { href: '/clinical', label: '临床决策辅助' },
  { href: '/policy', label: '政策解读' },
  { href: '/doctor', label: '医生管理后台' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PrimaryTabsNav({ className = '' }: PrimaryTabsNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`flex items-center gap-8 overflow-x-auto whitespace-nowrap ${className}`}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`border-b-2 pb-2 text-sm transition-colors ${
            isActive(pathname, item.href)
              ? 'border-primary font-semibold text-primary'
              : 'border-transparent font-medium text-slate-500 hover:text-primary'
          }`}
        >
          {item.label}
        </Link>
      ))}
      <span className="h-4 w-px bg-slate-200" />
      <LogoutButton />
    </nav>
  );
}
