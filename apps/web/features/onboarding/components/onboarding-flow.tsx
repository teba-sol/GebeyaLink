'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import type { RegisterOrganizationInput } from '@gebeyalink/validation';

import { Button, Card } from '@/features/ui';
import { ApiError, api } from '@/lib/api/client';

/**
 * Organization onboarding (docs/prd.md §49 Onboarding; docs/user-flows.md §3).
 * A signed-in user with no role chooses their organization type and submits
 * one registration; it waits in the admin verification queue.
 */

type OrgType = 'cooperative' | 'buyer' | 'transporter';

type FieldDef = {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

const CHOICES: { type: OrgType; title: string; note: string }[] = [
  {
    type: 'cooperative',
    title: 'Cooperative',
    note: 'Aggregate farmer supply, manage inventory and sell to buyers.',
  },
  {
    type: 'buyer',
    title: 'Buyer',
    note: 'Verified commercial organization that buys marketplace supply.',
  },
  {
    type: 'transporter',
    title: 'Transporter',
    note: 'Provide transport for shipments between cooperative and buyer.',
  },
];

const FIELDS: Record<OrgType, FieldDef[]> = {
  cooperative: [
    { name: 'name', label: 'Cooperative name', placeholder: 'e.g. Lume Adama Farmers Cooperative', required: true },
    { name: 'phone', label: 'Phone', placeholder: '+251 … (optional)', type: 'tel' },
    { name: 'email', label: 'Email', placeholder: 'coop@example.et (optional)', type: 'email' },
    { name: 'region', label: 'Region', placeholder: 'Oromia' },
    { name: 'zone', label: 'Zone', placeholder: 'Arsi' },
    { name: 'district', label: 'District', placeholder: 'Dodota' },
    { name: 'address', label: 'Address', placeholder: 'Street / area detail (optional)' },
  ],
  buyer: [
    { name: 'organizationName', label: 'Organization name', placeholder: 'e.g. Addis Agro Processing PLC', required: true },
    { name: 'businessType', label: 'Business type', placeholder: 'Processor / Wholesaler / Trader' },
    { name: 'category', label: 'Buyer category', placeholder: 'Institutional, Export, …' },
    { name: 'contactPerson', label: 'Contact person', placeholder: 'Full name' },
    { name: 'phone', label: 'Phone', placeholder: '+251 … (optional)', type: 'tel' },
    { name: 'email', label: 'Email', placeholder: 'buyer@example.et (optional)', type: 'email' },
    { name: 'region', label: 'Region', placeholder: 'Addis Ababa' },
    { name: 'zone', label: 'Zone', placeholder: '' },
    { name: 'district', label: 'District', placeholder: '' },
    { name: 'address', label: 'Address', placeholder: 'Street / area detail (optional)' },
  ],
  transporter: [
    { name: 'companyName', label: 'Company name', placeholder: 'e.g. Nile Freight', required: true },
    { name: 'contactName', label: 'Contact name', placeholder: 'Full name' },
    { name: 'phone', label: 'Phone', placeholder: '+251 … (optional)', type: 'tel' },
    { name: 'email', label: 'Email', placeholder: 'logistics@example.et (optional)', type: 'email' },
    { name: 'region', label: 'Region', placeholder: 'Oromia' },
    { name: 'vehicleType', label: 'Vehicle type', placeholder: 'Isuzu FSR / Truck' },
    { name: 'vehiclePlate', label: 'Vehicle plate', placeholder: 'AA-3-12345' },
    { name: 'capacity', label: 'Capacity', placeholder: 'e.g. 5000 kg' },
    { name: 'driverName', label: 'Driver name', placeholder: 'Full name' },
  ],
};

export function OnboardingFlow() {
  const [type, setType] = useState<OrgType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function choose(next: OrgType) {
    setType(next);
    setValues({});
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!type) return;
    const payload: Record<string, unknown> = { type };
    for (const field of FIELDS[type]) {
      const value = (values[field.name] ?? '').trim();
      if (!value) {
        if (field.required) {
          setError(`${field.label} is required.`);
          return;
        }
        continue;
      }
      payload[field.name] = value;
    }

    startTransition(async () => {
      try {
        await api.registerOrganization(payload as unknown as RegisterOrganizationInput);
        setDone(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That could not be completed.');
      }
    });
  }

  if (done) {
    return (
      <Card className="flex flex-col gap-3">
        <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
          Registration submitted
        </p>
        <h2 className="font-display text-2xl font-semibold">Awaiting verification</h2>
        <p className="max-w-[52ch] text-sm text-ink-soft">
          A GebeyaLink administrator reviews your organization before it can
          trade. You will be able to operate as soon as it is approved.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/"
            className="rounded-btn border border-accent bg-accent px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </Card>
    );
  }

  if (!type) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          Choose the organization you are registering. You can register one
          organization per account.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {CHOICES.map((choice) => (
            <button
              key={choice.type}
              type="button"
              onClick={() => choose(choice.type)}
              className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5 text-left shadow-card transition hover:border-accent hover:bg-accent-soft"
            >
              <span className="font-display text-lg font-semibold">{choice.title}</span>
              <span className="text-sm text-ink-soft">{choice.note}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const fields = FIELDS[type];
  const choice = CHOICES.find((c) => c.type === type);

  return (
    <form onSubmit={submit} aria-label={`Register ${type}`} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
              {choice?.title} registration
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Provide your organization details for verification.
            </p>
          </div>
          <Button variant="ghost" type="button" onClick={() => setType(null)}>
            Change type
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5 text-sm font-medium">
              {field.label}
              {field.required ? <span className="text-danger"> *</span> : null}
              <input
                className="ds-search"
                type={field.type ?? 'text'}
                value={values[field.name] ?? ''}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
                placeholder={field.placeholder}
                required={field.required}
                minLength={field.required ? 2 : undefined}
              />
            </label>
          ))}
        </div>
      </Card>

      {error ? (
        <p
          className="rounded-btn border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit registration'}
        </Button>
      </div>
    </form>
  );
}
