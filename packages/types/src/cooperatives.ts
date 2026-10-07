/** Cooperative (organization) technical types — C1. */

export type CooperativeStatus = 'active' | 'inactive';

export type CooperativeDto = {
  id: string;
  name: string;
  slug: string;
  status: CooperativeStatus;
  phone: string | null;
  email: string | null;
  region: string | null;
  zone: string | null;
  district: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CooperativeListQuery = {
  page: number;
  limit: number;
};

export type PaginatedCooperatives = {
  items: CooperativeDto[];
  page: number;
  limit: number;
  total: number;
};
