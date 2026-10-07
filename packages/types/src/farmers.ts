/** Farmer (business record) technical types — C2. */

export type FarmerDto = {
  id: string;
  cooperativeId: string;
  name: string;
  phone: string | null;
  location: string | null;
  active: boolean;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type FarmerListQuery = {
  cooperativeId: string | null;
  search: string | null;
  page: number;
  limit: number;
};

export type PaginatedFarmers = {
  items: FarmerDto[];
  page: number;
  limit: number;
  total: number;
};
