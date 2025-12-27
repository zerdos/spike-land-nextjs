/**
 * Services barrel export
 */

// Core API client
export { apiClient } from "./api-client";
export type { ApiResponse, RequestOptions } from "./api-client";

// Authentication
export { authService } from "./auth";
export type { AuthProvider, AuthResult, SessionInfo } from "./auth";

// API Services
export * from "./api/admin";
export * from "./api/images";
export * from "./api/jobs";
export * from "./api/merch";
export * from "./api/tokens";
