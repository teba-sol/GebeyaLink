'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { MobileNav } from './mobile-nav';

const NAV = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/orders', label: 'Orders' },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BuyerHeader({ email }: { email: string }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-[#E9E4D4] bg-[#FBF7EE]/90 shadow-[0_1px_0_0_rgba(35,30,20,0.04)] backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[var(--container-page)] items-center gap-8 px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-bold tracking-tight !text-[#0F3A2C]"
        >
          <svg className="h-6 w-6 text-[#0F4D3A]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3 20c0-9 5-16 18-16 0 11-6 17-14 17-1.5 0-3-.3-4-1zm2.2-1.2C7 12 11 9 15 7.5 11.5 10 8.5 13.5 7 19c-.6 0-1.2-.1-1.8-.2z" />
          </svg>
          GebeyaLink
        </Link>

        <nav aria-label="Buyer" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? '!text-[#0F3A2C]'
                    : '!text-[#4A554E] hover:!text-[#0F3A2C]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#0F5942] transition-transform duration-300 ease-out ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/account"
            className="hidden max-w-[16rem] items-center gap-2 rounded-full border border-[#E3DCC8] bg-[#FEFCF6] py-1 pr-3 pl-1 text-xs !text-[#3F4A43] transition-colors hover:border-[#0F4D3A] sm:inline-flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F3A2C] text-[0.65rem] font-semibold uppercase !text-white">
              {email.charAt(0)}
            </span>
            <span className="truncate">{email}</span>
          </Link>
          <SignOutButton className="hidden rounded-md px-3 py-1.5 text-xs font-medium text-[#4A554E] transition-colors hover:text-[#0F3A2C] md:inline-flex" />
          <MobileNav email={email} />
        </div>
      </div>
    </header>
  );
}