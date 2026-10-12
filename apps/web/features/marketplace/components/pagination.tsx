import Link from 'next/link';

/**
 * Server-rendered numbered pagination. Links preserve active filters.
 */
export function Pagination({
  page,
  total,
  limit,
  searchParams,
}: {
  page: number;
  total: number;
  limit: number;
  searchParams: URLSearchParams;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const pageHref = (target: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(target));
    return `/marketplace?${next.toString()}`;
  };

  // Window of up to 5 page numbers around the current page
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const base =
    'flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors';
  const idle = 'border-[#E3DCC8] bg-[#FEFCF6] text-[#3F4A43] hover:border-[#0F4D3A]';
  const disabled = 'pointer-events-none border-[#EDE7D6] bg-[#FEFCF6] text-[#B8B3A3]';

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <Link
        aria-label="Previous page"
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        href={pageHref(Math.max(1, page - 1))}
        className={`${base} ${page <= 1 ? disabled : idle}`}
      >
        ‹
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`${base} ${
            p === page ? 'border-[#0F4D3A] bg-[#0F4D3A] text-white' : idle
          }`}
        >
          {p}
        </Link>
      ))}

      <Link
        aria-label="Next page"
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        href={pageHref(Math.min(totalPages, page + 1))}
        className={`${base} ${page >= totalPages ? disabled : idle}`}
      >
        ›
      </Link>
    </nav>
  );
}