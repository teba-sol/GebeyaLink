/** Fixtures for the design-system reference compositions — realistic B2B agri data. */

export type ListingFixture = {
  id: string;
  product: string;
  grade: 'A' | 'B' | 'C';
  origin: string;
  cooperative: string;
  availableKg: number;
  totalKg: number;
  pricePerQt: number;
};

export const LISTINGS: ListingFixture[] = [
  {
    id: 'LST-4192',
    product: 'White Teff',
    grade: 'A',
    origin: "Ada'a woreda, Oromia",
    cooperative: 'Besheno Farmers Co-op',
    availableKg: 84_000,
    totalKg: 100_000,
    pricePerQt: 12_400,
  },
  {
    id: 'LST-4187',
    product: 'Bread Wheat',
    grade: 'B',
    origin: 'Bale woreda, Oromia',
    cooperative: 'Robe Grain Union',
    availableKg: 156_000,
    totalKg: 210_000,
    pricePerQt: 7_850,
  },
  {
    id: 'LST-4173',
    product: 'Maize',
    grade: 'A',
    origin: 'Bako woreda, West Shewa',
    cooperative: 'Bako Agro Co-op',
    availableKg: 210_000,
    totalKg: 240_000,
    pricePerQt: 6_200,
  },
  {
    id: 'LST-4168',
    product: 'Yirgacheffe Coffee',
    grade: 'A',
    origin: 'Gedeo zone, SNNPR',
    cooperative: 'Konga Washing Station',
    availableKg: 22_500,
    totalKg: 30_000,
    pricePerQt: 41_000,
  },
  {
    id: 'LST-4155',
    product: 'Sesame',
    grade: 'A',
    origin: 'Metema woreda, Amhara',
    cooperative: 'Metema Oilseed Co-op',
    availableKg: 64_000,
    totalKg: 96_000,
    pricePerQt: 18_900,
  },
  {
    id: 'LST-4149',
    product: 'Barley',
    grade: 'B',
    origin: 'Arsi woreda, Oromia',
    cooperative: 'Kofele Highland Co-op',
    availableKg: 96_000,
    totalKg: 120_000,
    pricePerQt: 5_700,
  },
  {
    id: 'LST-4131',
    product: 'Red Lentils',
    grade: 'A',
    origin: 'Borena woreda, Oromia',
    cooperative: 'Yabello Pulse Union',
    availableKg: 48_000,
    totalKg: 60_000,
    pricePerQt: 15_300,
  },
  {
    id: 'LST-4126',
    product: 'Sorghum',
    grade: 'C',
    origin: 'Metahara woreda, East Shewa',
    cooperative: 'Metahara Cropping PLC',
    availableKg: 132_000,
    totalKg: 180_000,
    pricePerQt: 4_950,
  },
];

export type InventoryRowFixture = {
  lot: string;
  product: string;
  grade: 'A' | 'B' | 'C';
  origin: string;
  availableKg: number;
  reservedKg: number;
  committedKg: number;
  status: 'AVAILABLE' | 'RESERVED' | 'COMMITTED' | 'DISPATCHED' | 'SOLD';
};

export const INVENTORY_ROWS: InventoryRowFixture[] = [
  {
    lot: 'LOT-2419',
    product: 'White Teff',
    grade: 'A',
    origin: "Ada'a",
    availableKg: 84_000,
    reservedKg: 8_000,
    committedKg: 6_000,
    status: 'AVAILABLE',
  },
  {
    lot: 'LOT-2418',
    product: 'White Teff',
    grade: 'B',
    origin: "Ada'a",
    availableKg: 21_000,
    reservedKg: 21_000,
    committedKg: 0,
    status: 'RESERVED',
  },
  {
    lot: 'LOT-2411',
    product: 'Bread Wheat',
    grade: 'B',
    origin: 'Bale',
    availableKg: 42_000,
    reservedKg: 0,
    committedKg: 168_000,
    status: 'COMMITTED',
  },
  {
    lot: 'LOT-2406',
    product: 'Maize',
    grade: 'A',
    origin: 'Bako',
    availableKg: 12_000,
    reservedKg: 0,
    committedKg: 0,
    status: 'DISPATCHED',
  },
  {
    lot: 'LOT-2399',
    product: 'Sesame',
    grade: 'A',
    origin: 'Metema',
    availableKg: 0,
    reservedKg: 0,
    committedKg: 0,
    status: 'SOLD',
  },
  {
    lot: 'LOT-2394',
    product: 'Barley',
    grade: 'B',
    origin: 'Arsi',
    availableKg: 96_000,
    reservedKg: 12_000,
    committedKg: 0,
    status: 'AVAILABLE',
  },
];

export const ORDER_FIXTURE = {
  id: 'GL-2481',
  product: 'White Teff · Grade A',
  cooperative: 'Besheno Farmers Co-op',
  buyer: 'Addis Grain Importers PLC',
  quantityKg: 5_000,
  pricePerQt: 12_400,
  placedAt: '08 Oct 2026 · 09:14',
  paymentRef: 'CP-884231',
  countdown: {
    label: 'Cooperative response window',
    remaining: '04:12:33',
    urgency: 'soon' as const,
  },
};

export const MIN_ORDER_KG = 1_000;
