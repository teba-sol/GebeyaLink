import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

const COMMODITIES_DIR = path.join(process.cwd(), 'public', 'commodities');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

function resolveAsset(file: string): string | null {
  for (const ext of IMAGE_EXTS) {
    const full = path.join(COMMODITIES_DIR, `${file}${ext}`);
    if (fs.existsSync(full)) return `/commodities/${file}${ext}`;
  }
  return null;
}

/** Optional per-product photo under public/commodities/<productId>. */
export function commodityImagePath(productId: string): string | null {
  if (!/^[a-z0-9-]+$/.test(productId)) return null;
  return resolveAsset(productId);
}

/** Hero product photo — public/HeroProduct.* root asset (user-supplied). */
export function heroImagePath(): string | null {
  for (const ext of IMAGE_EXTS) {
    const full = path.join(process.cwd(), 'public', `rrr${ext}`);
    if (fs.existsSync(full)) return `/rrr${ext}`;
  }
  return resolveAsset('hero-coffee');
}