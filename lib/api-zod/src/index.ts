export * from "./generated/api";
export type * from "./generated/types";

// The names below are generated into both ./generated/api (as a zod schema
// value) and ./generated/types (as a plain interface) for the same OpenAPI
// schema, so the two wildcard re-exports above are ambiguous for them.
// Explicit re-exports resolve the ambiguity.
//
// Most of these are only ever used as types (route handlers validate with a
// differently-named schema, or don't validate this body yet), so they
// resolve in favor of the type. The ones below that route handlers actually
// call `.safeParse()` on resolve in favor of the value instead.
export type {
  AdminLoginBody,
  CloseSupportTicketBody,
  CloseSupportTicketResponse,
  ConfirmDeliveryResponse,
  CreateSessionSlotBody,
  CreateSupportTicketBody,
  DeleteAccountBody,
  DeleteAccountResponse,
  DeleteSessionSlotResponse,
  LoginBody,
  RegisterBody,
  ResolveDisputeBody,
  ResolveDisputeResponse,
  RespondToReviewBody,
  SubscribeVendorBody,
  SubscribeVendorResponse,
  UpdateSessionSlotBody,
} from "./generated/types";

export {
  AddToCartBody,
  CreateCourseBody,
  CreateLessonBody,
  CreateProductBody,
  CreateVendorBody,
  UpdateCourseBody,
  UpdateProductBody,
} from "./generated/api";
