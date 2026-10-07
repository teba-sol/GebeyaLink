import { db } from '../db';

/** Normalize a name into a kebab-case slug. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return slug || 'cooperative';
}

/** Derive an available slug from a base (checks the table, appends a suffix). */
export async function uniqueSlug(base: string): Promise<string> {
  const candidate = slugify(base);
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const slug = attempt === 2 ? candidate : `${candidate}-${attempt}`;
    const existing = await db.query.cooperatives.findFirst({
      where: (table, { eq }) => eq(table.slug, slug),
      columns: { id: true },
    });
    if (!existing) return slug;
  }
  return `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
}
