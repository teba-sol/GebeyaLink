import { WHY } from '../lib/content';
import { LandingSection, LandingSectionHeading } from './section';

export function LandingWhy() {
  return (
    <LandingSection id="why" className="border-t border-[#E3DCC8]">
      <LandingSectionHeading
        index="04"
        eyebrow="Why GebeyaLink"
        title="Built for trust across the chain"
        description="A single system of record for buyers, cooperatives, field agents and transporters — so everyone works from the same truth."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        {WHY.map((item) => (
          <div
            key={item.title}
            className="flex flex-col gap-3 rounded-card border border-[#E9E4D4] bg-[#FEFCF6] p-6"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E2F3E4] text-[#0F5942]"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <h3 className="font-display text-lg font-semibold text-[#103D30]">
              {item.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#5F6B63]">{item.text}</p>
          </div>
        ))}
      </div>
    </LandingSection>
  );
}
