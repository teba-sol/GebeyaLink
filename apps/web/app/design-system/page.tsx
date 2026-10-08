import type { Metadata } from 'next';

import { SystemSection } from '@/features/design-system/section';
import { AgentScreen } from '@/features/design-system/screens/agent';
import { InventoryScreen } from '@/features/design-system/screens/inventory';
import { JourneyScreen } from '@/features/design-system/screens/journey';
import { ListingScreen } from '@/features/design-system/screens/listing';
import { MarketplaceScreen } from '@/features/design-system/screens/marketplace';
import { Specimen } from '@/features/design-system/screens/specimen';

export const metadata: Metadata = {
  title: 'Design system · GebeyaLink',
  description:
    'The locked GebeyaLink design system — tokens, primitives and reference compositions.',
};

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-[80rem] flex-col gap-12 px-6 py-12 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-line-strong pb-8">
        <p className="font-mono text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
          GebeyaLink · F0 foundation
        </p>
        <h1 className="font-display text-5xl font-bold">Design system</h1>
        <p className="max-w-[52ch] text-ink-soft">
          Locked direction: <strong className="font-semibold">Terra Market</strong> —
          modern, approachable B2B agricultural commerce. Tokens, primitives and
          five reference compositions live here. Reference sections render fixture
          data, not live records; role screens are built on these same tokens in
          F1 onward.
        </p>
      </header>

      <SystemSection
        index="00"
        title="Specimen"
        intent="Type scale, palette, radii, status marks and primitives at a glance."
      >
        <Specimen />
      </SystemSection>

      <SystemSection
        index="01"
        title="Marketplace"
        intent="Buyer discovery — hero, search, filters and listing cards."
        reference
      >
        <MarketplaceScreen />
      </SystemSection>

      <SystemSection
        index="02"
        title="Listing detail"
        intent="A single listing with grading, quantity and availability meter."
        reference
      >
        <ListingScreen />
      </SystemSection>

      <SystemSection
        index="03"
        title="Order journey"
        intent="Order progress as a timeline of steps — not a status table."
        reference
      >
        <JourneyScreen />
      </SystemSection>

      <SystemSection
        index="04"
        title="Inventory operations"
        intent="Cooperative stock — dense table, lifecycle status, quantity language."
        reference
      >
        <InventoryScreen />
      </SystemSection>

      <SystemSection
        index="05"
        title="Collection agent"
        intent="Field pick-up flow — touch-first, quantity and handoff."
        reference
      >
        <AgentScreen />
      </SystemSection>
    </main>
  );
}
