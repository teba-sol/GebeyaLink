import { CreateCooperativeForm } from '@/features/admin/components/create-cooperative-form';
import { Eyebrow } from '@/features/ui';
import { requirePageRole } from '@/lib/session';

export default async function AdminCreateCooperativePage() {
  await requirePageRole('admin');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Platform · cooperatives</Eyebrow>
        <h1 className="font-display text-4xl font-semibold">New cooperative</h1>
        <p className="text-sm text-ink-soft">
          Registering gives the cooperative a ledger entry; staff and collection
          centers are added after activation.
        </p>
      </div>

      <div className="max-w-3xl">
        <CreateCooperativeForm />
      </div>
    </div>
  );
}