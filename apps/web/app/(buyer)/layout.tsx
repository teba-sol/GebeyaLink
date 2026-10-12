import { requirePageRole } from '@/lib/session';
import { BuyerHeader } from './buyer-header';

export default async function BuyerLayout({
  children,
}: LayoutProps<'/'>) {
  const session = await requirePageRole('buyer');

  return (
    <div className="flex min-h-dvh flex-col bg-[#FBF7EE]">
      <BuyerHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-[var(--container-page)] flex-1 px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}