import type { PlatformRole } from '@gebeyalink/types';

/**
 * Landing page copy + structure (docs/frontend-design-direction.md). Kept as
 * data so sections stay presentational and the page reads as one composition.
 */

export const HERO_TRUST: string[] = [
  'Verified cooperatives',
  'Graded & weighed stock',
  'Transparent pricing',
  'Farm gate to delivery',
];

export const STATS: { value: string; label: string }[] = [
  { value: 'One', label: 'account across every role' },
  { value: 'Graded', label: 'inventory by lot and quality' },
  { value: 'Tracked', label: 'every order to delivery' },
  { value: 'Direct', label: 'cooperative-to-buyer payment' },
];

export type RoleExperience = {
  id: PlatformRole | 'field_agent';
  eyebrow: string;
  title: string;
  copy: string;
  points: string[];
};

export const ROLE_EXPERIENCES: RoleExperience[] = [
  {
    id: 'buyer',
    eyebrow: 'For buyers',
    title: 'Source directly from cooperatives',
    copy: 'Browse verified lots by commodity, grade, origin and price — then reserve, order and follow delivery.',
    points: [
      'Graded, weighed inventory',
      'Transparent pricing & availability',
      'Order journey from payment to delivery',
    ],
  },
  {
    id: 'cooperative_staff',
    eyebrow: 'For cooperatives',
    title: 'Sell stock and run operations',
    copy: 'List inventory, receive and accept orders, manage payments, and dispatch shipments from one workspace.',
    points: [
      'Publish lots with availability',
      'Accept orders and confirm payment',
      'Arrange transport and dispatch',
    ],
  },
  {
    id: 'field_agent',
    eyebrow: 'For field agents',
    title: 'Record intake at the collection point',
    copy: 'Capture farmer deliveries with weight and quality, and keep cooperative inventory accurate in real time.',
    points: [
      'Farmer deliveries and intake',
      'Weighed quantity and grade',
      'Inventory updates on the spot',
    ],
  },
  {
    id: 'transporter',
    eyebrow: 'For transporters',
    title: 'Carry goods and prove delivery',
    copy: 'Pick up assigned shipments, record conditions in transit, and confirm delivery at the destination.',
    points: [
      'Runsheet of active shipments',
      'Pickup and delivery confirmation',
      'Full journey history',
    ],
  },
];

export type JourneyStep = { title: string; text: string };

export const JOURNEY: JourneyStep[] = [
  {
    title: 'Discover',
    text: 'Buyers explore verified inventory by commodity, grade, origin and price.',
  },
  {
    title: 'Reserve',
    text: 'An order reserves available stock while the cooperative reviews it.',
  },
  {
    title: 'Accept',
    text: 'The cooperative accepts the order and confirms what is being sold.',
  },
  {
    title: 'Pay',
    text: 'The buyer pays the cooperative directly to confirm the trade.',
  },
  {
    title: 'Transport',
    text: 'Shipment is arranged, picked up and tracked through to the destination.',
  },
  {
    title: 'Deliver',
    text: 'Delivery is confirmed and the order closes on a complete journey.',
  },
];

export type Commodity = { id: string; name: string; note: string };

export const COMMODITIES: Commodity[] = [
  { id: 'coffee', name: 'Coffee', note: 'Washed & natural, by origin' },
  { id: 'sesame', name: 'Sesame', note: 'Humera & Wollega grades' },
  { id: 'maize', name: 'Maize', note: 'Bulk grain, graded' },
  { id: 'wheat', name: 'Wheat', note: 'Domestic milling grades' },
  { id: 'sorghum', name: 'Sorghum', note: 'Feed & food lots' },
  { id: 'teff', name: 'Teff', note: 'White, mixed & red' },
];

export const WHY: { title: string; text: string }[] = [
  {
    title: 'Verified supply',
    text: 'Only verified cooperatives list stock, so buyers source with confidence.',
  },
  {
    title: 'Transparent availability',
    text: 'Every lot shows real quantity, grade and status — no guessing what is in stock.',
  },
  {
    title: 'One continuous journey',
    text: 'Orders, payments and shipments stay connected from farm gate to final delivery.',
  },
];
