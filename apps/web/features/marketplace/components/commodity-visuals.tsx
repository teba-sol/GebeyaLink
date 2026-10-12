import Image from 'next/image';

import { commodityImagePath } from '../lib/commodity-images';

/**
 * Commodity photo with a named forest-panel fallback. Photos are optional
 * assets under public/commodities/<productId>.{jpg,png,webp} — resolved at
 * request time so missing files never produce a broken <img> and new assets
 * are picked up with no code change.
 */

export function CommodityPhoto({
  productId,
  name,
  sizes,
  className = '',
  priority = false,
}: {
  productId: string;
  name: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const src = commodityImagePath(productId);
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`.trim()}
      />
    );
  }
  return <CommodityPanel name={name} />;
}

export function CommodityPanel({ name, hero = false }: { name: string; hero?: boolean }) {
  return (
    <div
      className="commodity-panel"
      data-initial={name.charAt(0).toUpperCase()}
    >
      <span
        className={`commodity-panel__label ${hero ? 'text-3xl font-bold' : ''}`}
      >
        {name}
      </span>
    </div>
  );
}