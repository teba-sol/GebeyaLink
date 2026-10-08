import type { ReactNode } from 'react';

type SystemSectionProps = {
  index: string;
  title: string;
  intent: string;
  /** Marks a section built from fixtures (not live data). */
  reference?: boolean;
  children: ReactNode;
};

/** Section scaffolding for the design-system page and future screens. */
export function SystemSection({
  index,
  title,
  intent,
  reference = false,
  children,
}: SystemSectionProps) {
  return (
    <section className="ds-section">
      <header className="ds-section__head">
        <span className="ds-section__index">{index}</span>
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="ds-section__title">{title}</h2>
          {reference ? (
            <span className="rounded-pill bg-surface-2 px-2.5 py-1 font-mono text-[0.625rem] font-semibold tracking-[0.1em] text-ink-soft uppercase">
              Reference · fixture data
            </span>
          ) : null}
          <p className="ds-section__intent">{intent}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
