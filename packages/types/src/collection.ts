/** C3 domain technical types. */

import type { DeliveryQualityGrade, DeliveryStatus, InventoryStatus } from './deliveries';

export type ProductDto = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionCenterDto = {
  id: string;
  cooperativeId: string;
  name: string;
  location: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionCenterListQuery = {
  cooperativeId: string | null;
  page: number;
  limit: number;
};

export type PaginatedCollectionCenters = {
  items: CollectionCenterDto[];
  page: number;
  limit: number;
  total: number;
};

export type DeliveryDto = {
  id: string;
  cooperativeId: string;
  collectionCenterId: string;
  farmerId: string;
  productId: string;
  recordedById: string | null;
  claimedQuantity: number;
  measuredQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  qualityGrade: DeliveryQualityGrade;
  status: DeliveryStatus;
  deliveryDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryListQuery = {
  cooperativeId: string | null;
  farmerId: string | null;
  productId: string | null;
  status: DeliveryStatus | null;
  page: number;
  limit: number;
};

export type PaginatedDeliveries = {
  items: DeliveryDto[];
  page: number;
  limit: number;
  total: number;
};

export type InventoryLotDto = {
  id: string;
  cooperativeId: string;
  collectionCenterId: string;
  productId: string;
  qualityGrade: DeliveryQualityGrade;
  totalQuantity: number;
  availableQuantity: number;
  status: InventoryStatus;
  createdAt: string;
};

export type InventoryLotDetailDto = InventoryLotDto & {
  sources: { deliveryId: string; acceptedQuantity: number }[];
};

export type InventoryListQuery = {
  cooperativeId: string | null;
  page: number;
  limit: number;
};

export type PaginatedInventoryLots = {
  items: InventoryLotDto[];
  page: number;
  limit: number;
  total: number;
};