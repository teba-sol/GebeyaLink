import type { PlatformRole } from '@gebeyalink/types';

export type AdminMembership = {
  id: string;
  cooperativeId: string;
  cooperativeName: string | null;
  active: boolean;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: PlatformRole | null;
  createdAt: string;
  memberships: AdminMembership[];
};

export type PaginatedUsers = {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
};

export type CooperativeOption = { id: string; name: string };