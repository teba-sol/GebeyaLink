import type {
  AiRecommendationResult,
  AiSourcingResult,
  BuyerDto,
  CollectionCenterDto,
  CooperativeDto,
  DeliveryDto,
  FarmerDto,
  MarketplaceListingDto,
  OrderDto,
  PaymentDto,
  ProductDto,
  ShipmentDto,
  TransporterDto,
  VerificationOrgType,
  VerificationStatus,
} from '@gebeyalink/types';
import type {
  AssignTransporterInput,
  CancelShipmentInput,
  ConfirmDeliveryInput,
  ConfirmPickupInput,
  CreateCollectionCenterInput,
  CreateCooperativeInput,
  CreateDeliveryInput,
  CreateFarmerInput,
  CreateListingInput,
  CreateProductInput,
  CreateShipmentInput,
  DeliverShipmentInput,
  FailPaymentInput,
  PlaceOrderInput,
  RegisterOrganizationInput,
  RejectOrderInput,
  SubmitPaymentInput,
  SourcingRecommendationInput,
  UpdateCooperativeInput,
  UpdateCollectionCenterInput,
  UpdateFarmerInput,
  UpdateListingInput,
  UpdateProductInput,
  VerificationActionInput,
} from '@gebeyalink/validation';
import type { AdminMembership, AdminUser } from '@/features/admin/types';

/**
 * Typed client for the existing /api/v1 mutation routes
 * (docs/frontend-architecture.md §4 Data access). Reads travel through
 * server queries — this module only performs state changes, then the
 * caller refetches via `router.refresh()` / `revalidatePath`. Responses
 * are the existing `{ data }` / `{ error: { code, message } }` envelopes.
 */

type ApiErrorEnvelope = { error: { code: string; message: string } };

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await res.json().catch(() => null)) as
    | { data: T }
    | ApiErrorEnvelope
    | null;
  if (!body || 'error' in body) {
    const error = body && 'error' in body ? body.error : null;
    throw new ApiError(
      error?.code ?? 'request_failed',
      error?.message ?? 'The request could not be completed.',
    );
  }
  return body.data;
}

export const api = {
  placeOrder(input: PlaceOrderInput): Promise<OrderDto> {
    return request<OrderDto>('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  cancelOrder(orderId: string): Promise<OrderDto> {
    return request<OrderDto>(`/api/v1/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
  submitPayment(orderId: string, input: SubmitPaymentInput): Promise<PaymentDto> {
    return request<PaymentDto>(`/api/v1/orders/${orderId}/payments`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  acceptOrder(orderId: string): Promise<OrderDto> {
    return request<OrderDto>(`/api/v1/orders/${orderId}/accept`, {
      method: 'POST',
    });
  },
  rejectOrder(orderId: string, input: RejectOrderInput): Promise<OrderDto> {
    return request<OrderDto>(`/api/v1/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  confirmPayment(paymentId: string): Promise<PaymentDto> {
    return request<PaymentDto>(`/api/v1/payments/${paymentId}/confirm`, {
      method: 'POST',
    });
  },
  failPayment(paymentId: string, input: FailPaymentInput): Promise<PaymentDto> {
    return request<PaymentDto>(`/api/v1/payments/${paymentId}/fail`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  parseAiSourcing(query: string): Promise<AiSourcingResult> {
    return request<AiSourcingResult>('/api/v1/marketplace/ai-search/parse', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
  recommendSuppliers(input: SourcingRecommendationInput): Promise<AiRecommendationResult> {
    return request<AiRecommendationResult>('/api/v1/marketplace/ai-search/recommendations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  createListing(input: CreateListingInput): Promise<MarketplaceListingDto> {
    return request<MarketplaceListingDto>('/api/v1/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateListing(listingId: string, patch: UpdateListingInput): Promise<MarketplaceListingDto> {
    return request<MarketplaceListingDto>(`/api/v1/marketplace/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  createFarmer(input: CreateFarmerInput): Promise<FarmerDto> {
    return request<FarmerDto>('/api/v1/farmers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  createDelivery(input: CreateDeliveryInput): Promise<DeliveryDto> {
    return request<DeliveryDto>('/api/v1/deliveries', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateCooperative(cooperativeId: string, patch: UpdateCooperativeInput): Promise<CooperativeDto> {
    return request<CooperativeDto>(`/api/v1/cooperatives/${cooperativeId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  createCooperative(input: CreateCooperativeInput): Promise<CooperativeDto> {
    return request<CooperativeDto>('/api/v1/cooperatives', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  createCollectionCenter(input: CreateCollectionCenterInput): Promise<CollectionCenterDto> {
    return request<CollectionCenterDto>('/api/v1/collection-centers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateCollectionCenter(
    centerId: string,
    patch: UpdateCollectionCenterInput,
  ): Promise<CollectionCenterDto> {
    return request<CollectionCenterDto>(`/api/v1/collection-centers/${centerId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  updateFarmer(farmerId: string, patch: UpdateFarmerInput): Promise<FarmerDto> {
    return request<FarmerDto>(`/api/v1/farmers/${farmerId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  createProduct(input: CreateProductInput): Promise<ProductDto> {
    return request<ProductDto>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateProduct(productId: string, patch: UpdateProductInput): Promise<ProductDto> {
    return request<ProductDto>(`/api/v1/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  updateUserRole(userId: string, role: AdminUser['role']): Promise<AdminUser> {
    return request<AdminUser>(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  addUserMembership(
    userId: string,
    input: { cooperativeId: string; active?: boolean },
  ): Promise<AdminMembership> {
    return request<AdminMembership>(`/api/v1/users/${userId}/memberships`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateUserMembership(
    userId: string,
    membershipId: string,
    patch: { active: boolean },
  ): Promise<AdminMembership> {
    return request<AdminMembership>(`/api/v1/users/${userId}/memberships/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  removeUserMembership(userId: string, membershipId: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/v1/users/${userId}/memberships/${membershipId}`, {
      method: 'DELETE',
    });
  },
  createShipment(orderId: string, input: CreateShipmentInput): Promise<ShipmentDto> {
    return request<ShipmentDto>(`/api/v1/orders/${orderId}/shipment`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  assignTransporter(shipmentId: string, input: AssignTransporterInput): Promise<ShipmentDto> {
    return request<ShipmentDto>(`/api/v1/shipments/${shipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  confirmPickup(shipmentId: string, input: ConfirmPickupInput = {}): Promise<ShipmentDto> {
    return request<ShipmentDto>(`/api/v1/shipments/${shipmentId}/pickup`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  deliverShipment(shipmentId: string, input: DeliverShipmentInput): Promise<ShipmentDto> {
    return request<ShipmentDto>(`/api/v1/shipments/${shipmentId}/deliver`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  confirmDelivery(shipmentId: string, input: ConfirmDeliveryInput = {}): Promise<ShipmentDto> {
    return request<ShipmentDto>(`/api/v1/shipments/${shipmentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  cancelShipment(shipmentId: string, input: CancelShipmentInput): Promise<ShipmentDto> {
    return request<ShipmentDto>(`/api/v1/shipments/${shipmentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  registerOrganization(
    input: RegisterOrganizationInput,
  ): Promise<CooperativeDto | BuyerDto | TransporterDto> {
    return request<CooperativeDto | BuyerDto | TransporterDto>('/api/v1/registrations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateVerification(
    type: VerificationOrgType,
    id: string,
    input: VerificationActionInput,
  ): Promise<{ id: string; type: VerificationOrgType; status: VerificationStatus }> {
    return request<{ id: string; type: VerificationOrgType; status: VerificationStatus }>(
      `/api/v1/verifications/${type}/${id}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  },
};