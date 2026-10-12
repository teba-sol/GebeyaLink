/**
 * Shared Zod validation schemas.
 *
 * Note: server-side validation at the API boundary is authoritative
 * (docs/tech-stack.md §11). These schemas are the single definition
 * used by both sides.
 */

export { productIdSchema, uuidSchema } from './common';
export {
  cooperativeSlugSchema,
  cooperativeStatusSchema,
  createCooperativeSchema,
  listCooperativesQuerySchema,
  updateCooperativeSchema,
} from './cooperatives';
export type {
  CreateCooperativeInput,
  ListCooperativesQuery,
  UpdateCooperativeInput,
} from './cooperatives';
export {
  createFarmerSchema,
  farmerIdSchema,
  listFarmersQuerySchema,
  updateFarmerSchema,
} from './farmers';
export type {
  CreateFarmerInput,
  ListFarmersQuery,
  UpdateFarmerInput,
} from './farmers';
export {
  createCollectionCenterSchema,
  listCollectionCentersQuerySchema,
  updateCollectionCenterSchema,
} from './collection-centers';
export type {
  CreateCollectionCenterInput,
  ListCollectionCentersQuery,
  UpdateCollectionCenterInput,
} from './collection-centers';
export {
  createDeliverySchema,
  deliveryQualityGradeSchema,
  deliveryStatusSchema,
  listDeliveriesQuerySchema,
} from './deliveries';
export type {
  CreateDeliveryInput,
  ListDeliveriesQuery,
} from './deliveries';
export { listInventoryQuerySchema } from './inventory';
export type { ListInventoryQuery } from './inventory';
export {
  createListingSchema,
  listMarketplaceQuerySchema,
  listOrdersQuerySchema,
  placeOrderSchema,
  priceSchema,
  rejectOrderSchema,
  updateListingSchema,
} from './marketplace';
export type {
  CreateListingInput,
  ListMarketplaceQuery,
  ListOrdersQuery,
  PlaceOrderInput,
  RejectOrderInput,
  UpdateListingInput,
} from './marketplace';
export { failPaymentSchema, submitPaymentSchema } from './payments';
export type { FailPaymentInput, SubmitPaymentInput } from './payments';
export {
  assignTransporterSchema,
  cancelShipmentSchema,
  confirmDeliverySchema,
  confirmPickupSchema,
  createShipmentSchema,
  deliverShipmentSchema,
} from './shipments';
export type {
  AssignTransporterInput,
  CancelShipmentInput,
  ConfirmDeliveryInput,
  ConfirmPickupInput,
  CreateShipmentInput,
  DeliverShipmentInput,
} from './shipments';
export {
  createProductSchema,
  productSlugSchema,
  updateProductSchema,
} from './products';
export type { CreateProductInput, UpdateProductInput } from './products';
export {
  addMembershipSchema,
  listUsersQuerySchema,
  updateMembershipSchema,
  updateUserRoleSchema,
} from './users';
export type {
  AddMembershipInput,
  ListUsersQuery,
  UpdateMembershipInput,
  UpdateUserRoleInput,
} from './users';
export {
  registerBuyerSchema,
  registerCooperativeSchema,
  registerOrganizationSchema,
  registerTransporterSchema,
} from './registrations';
export type {
  RegisterBuyerInput,
  RegisterCooperativeInput,
  RegisterOrganizationInput,
  RegisterTransporterInput,
} from './registrations';
export {
  listVerificationsQuerySchema,
  verificationActionSchema,
  verificationOrgTypeSchema,
  verificationStatusSchema,
} from './verifications';
export type { ListVerificationsQuery, VerificationActionInput } from './verifications';