import { STATS } from '../lib/content';

/** Forest band that separates the hero from the role sections. */
export function LandingStatsBand() {
  return (
    <section aria-label="Platform at a glance" className="full-bleed bg-[#0F3A2C]">
      <dl className="mx-auto grid w-full max-w-[var(--container-page)] grid-cols-2 gap-x-6 gap-y-8 px-6 py-12 sm:py-14 lg:grid-cols-4 lg:px-10">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1.5">
            <dt className="sr-only">{stat.label}</dt>
            <dd className="font-display text-3xl font-semibold text-[#F3E9CE] sm:text-4xl">
              {stat.value}
            </dd>
            <p className="text-sm leading-snug text-[#BFD3C4]">{stat.label}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
