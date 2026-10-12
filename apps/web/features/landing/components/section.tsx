import type { ReactNode } from 'react';

/** Shared landing section container — consistent page gutters and width. */
export function LandingSection({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-[var(--container-page)] scroll-mt-24 px-6 py-16 sm:py-20 lg:px-10 ${className}`}
    >
      {children}
    </section>
  );
}

/** Section heading with a numbered rail and an eyebrow, matching the design system. */
export function LandingSectionHeading({
  index,
  eyebrow,
  title,
  description,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-4 border-t border-[#E3DCC8] pt-6">
        <span className="font-mono text-xs font-semibold text-[#9B978A]">{index}</span>
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-[#174F3D] uppercase">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[#0F3A2C] sm:text-4xl">
            {title}
          </h2>
        </div>
      </div>
      {description ? (
        <p className="mt-4 max-w-[60ch] text-[0.95rem] leading-7 text-[#5F6B63]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
