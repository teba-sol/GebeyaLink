'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Public landing header — transparent over the immersive hero at the top of the
 * page, then settles into a solid cream surface once the visitor scrolls. Text
 * inverts from light to dark at the same break so it always stays legible.
 */
export function LandingHeader({ home }: { home: string | null }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-[#E9E4D4] bg-[#FBF7EE]/90 shadow-[0_1px_0_0_rgba(35,30,20,0.05)] backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[var(--container-page)] items-center gap-6 px-6 lg:px-10">
        <Link
          href="/"
          className={`flex items-center gap-2 font-display text-xl font-bold tracking-tight transition-colors duration-300 ${
            scrolled ? '!text-[#0F3A2C]' : '!text-white'
          }`}
        >
          <svg
            className={`h-6 w-6 transition-colors duration-300 ${scrolled ? 'text-[#0F4D3A]' : 'text-[#A8D5B0]'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M3 20c0-9 5-16 18-16 0 11-6 17-14 17-1.5 0-3-.3-4-1zm2.2-1.2C7 12 11 9 15 7.5 11.5 10 8.5 13.5 7 19c-.6 0-1.2-.1-1.8-.2z" />
          </svg>
          GebeyaLink
        </Link>

        <nav
          aria-label="Landing"
          className={`ml-2 hidden items-center gap-7 text-sm font-medium transition-colors lg:flex ${
            scrolled ? 'text-[#4A554E]' : 'text-white/85'
          }`}
        >
          <a
            href="#roles"
            className={`transition-colors ${scrolled ? 'hover:text-[#0F3A2C]' : 'hover:text-white'}`}
          >
            Who it&apos;s for
          </a>
          <a
            href="#how-it-works"
            className={`transition-colors ${scrolled ? 'hover:text-[#0F3A2C]' : 'hover:text-white'}`}
          >
            How it works
          </a>
          <a
            href="#commodities"
            className={`transition-colors ${scrolled ? 'hover:text-[#0F3A2C]' : 'hover:text-white'}`}
          >
            Commodities
          </a>
          <a
            href="#why"
            className={`transition-colors ${scrolled ? 'hover:text-[#0F3A2C]' : 'hover:text-white'}`}
          >
            Why GebeyaLink
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {home ? (
            <Link
              href={home}
              className={`inline-flex min-h-10 items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                scrolled
                  ? 'bg-[#0F5942] !text-white hover:bg-[#0B4232]'
                  : 'bg-white !text-[#0F3A2C] hover:bg-[#F3E9CE]'
              }`}
            >
              Open your workspace
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={`hidden rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:inline-flex ${
                  scrolled
                    ? '!text-[#0F3A2C] hover:bg-[#EDE6D4]'
                    : '!text-white hover:bg-white/10'
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={`inline-flex min-h-10 items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  scrolled
                    ? 'bg-[#0F5942] !text-white hover:bg-[#0B4232]'
                    : 'bg-white !text-[#0F3A2C] hover:bg-[#F3E9CE]'
                }`}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
