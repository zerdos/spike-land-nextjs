/**
 * Admin API Service
 * Handles all admin-related API calls for the mobile app
 */

import { apiClient, ApiResponse } from "../api-client";

// ============================================================================
// Types
// ============================================================================

// Dashboard Types
export interface DashboardStats {
  totalUsers: number;
  adminCount: number;
  totalEnhancements: number;
  jobStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    active: number;
  };
  totalTokensPurchased: number;
  totalTokensSpent: number;
  activeVouchers: number;
  timestamp: string;
}

// User Types
export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: UserRole;
  tokenBalance: number;
  imageCount: number;
  createdAt: string;
}

export interface AdminUserDetails extends AdminUser {
  authProviders: string[];
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    createdAt: string;
  }>;
}

export interface UsersListResponse {
  users: AdminUser[];
}

export interface UserDetailsResponse {
  user: AdminUserDetails;
}

// Job Types
export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type JobSource = "enhancement" | "mcp";

export interface UnifiedJob {
  id: string;
  source: JobSource;
  status: JobStatus;
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K";
  tokensCost: number;
  prompt: string | null;
  inputUrl: string | null;
  outputUrl: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
  outputSizeBytes: number | null;
  errorMessage: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  createdAt: string;
  updatedAt: string;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  // Enhancement-specific fields
  imageId?: string;
  imageName?: string;
  retryCount?: number;
  maxRetries?: number;
  geminiModel?: string | null;
  geminiTemp?: number | null;
  workflowRunId?: string | null;
  // MCP-specific fields
  mcpJobType?: "GENERATE" | "MODIFY";
  apiKeyId?: string | null;
  apiKeyName?: string | null;
  inputR2Key?: string | null;
  outputR2Key?: string | null;
}

export interface JobsListResponse {
  jobs: UnifiedJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
  typeCounts: {
    all: number;
    enhancement: number;
    mcp: number;
  };
}

export interface JobRerunResponse {
  success: boolean;
  newJobId: string;
  source: JobSource;
  tokensCost?: number;
}

// Voucher Types
export type VoucherStatus = "ACTIVE" | "USED" | "EXPIRED" | "DISABLED";
export type VoucherType = "FIXED" | "PERCENTAGE";

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  status: VoucherStatus;
  createdAt: string;
  redemptions: number;
}

export interface VouchersListResponse {
  vouchers: Voucher[];
}

export interface CreateVoucherRequest {
  code: string;
  type: VoucherType;
  value: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface CreateVoucherResponse {
  voucher: Voucher;
}

// Analytics Types
export interface TokenAnalytics {
  tokensByType: Array<{
    type: string;
    total: number;
  }>;
  dailyTokens: Array<{
    date: string;
    purchased: number;
    spent: number;
  }>;
  revenue: {
    total: number;
  };
  circulation: {
    total: number;
    average: number;
  };
  regenerationCount: number;
  packageSales: Array<{
    name: string;
    tokens: number;
    sales: number;
  }>;
}

export interface UserAnalytics {
  totalUsers: number;
  newUsersLast30Days: number;
  activeUsersLast30Days: number;
  dailySignups: Array<{
    date: string;
    count: number;
  }>;
  usersByAuthProvider: Array<{
    provider: string;
    count: number;
  }>;
}

// ============================================================================
// Dashboard API
// ============================================================================

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<
  ApiResponse<DashboardStats>
> {
  return apiClient.get<DashboardStats>("/api/admin/dashboard");
}

// ============================================================================
// Users API
// ============================================================================

/**
 * Get list of users with optional search
 */
export async function getUsers(
  search?: string,
): Promise<ApiResponse<UsersListResponse>> {
  const url = search
    ? `/api/admin/users?search=${encodeURIComponent(search)}`
    : "/api/admin/users";
  return apiClient.get<UsersListResponse>(url);
}

/**
 * Get user details by ID
 */
export async function getUser(
  userId: string,
): Promise<ApiResponse<UserDetailsResponse>> {
  return apiClient.get<UserDetailsResponse>(
    `/api/admin/users?userId=${userId}`,
  );
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<ApiResponse<{ success: boolean; role: UserRole; }>> {
  return apiClient.patch<{ success: boolean; role: UserRole; }>(
    "/api/admin/users",
    {
      userId,
      action: "setRole",
      value: role,
    },
  );
}

/**
 * Adjust user token balance
 */
export async function adjustUserTokens(
  userId: string,
  amount: number,
): Promise<ApiResponse<{ success: boolean; newBalance: number; }>> {
  return apiClient.patch<{ success: boolean; newBalance: number; }>(
    "/api/admin/users",
    {
      userId,
      action: "adjustTokens",
      value: amount.toString(),
    },
  );
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<
  ApiResponse<{
    success: boolean;
    deletedData: {
      albums: number;
      images: number;
      enhancementJobs: number;
      tokenBalance: number;
    };
  }>
> {
  return apiClient.delete(`/api/admin/users?userId=${userId}`);
}

/**
 * Get user enhancement history
 */
export async function getUserEnhancements(
  userId: string,
  page = 1,
  limit = 20,
): Promise<
  ApiResponse<{
    enhancements: Array<{
      id: string;
      status: JobStatus;
      tier: string;
      createdAt: string;
      completedAt: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }>
> {
  return apiClient.get(
    `/api/admin/users/${userId}/enhancements?page=${page}&limit=${limit}`,
  );
}

// ============================================================================
// Jobs API
// ============================================================================

export interface JobsQueryParams {
  status?: JobStatus | null;
  type?: JobSource | "all";
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Get list of jobs with filtering
 */
export async function getJobs(
  params: JobsQueryParams = {},
): Promise<ApiResponse<JobsListResponse>> {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set("status", params.status);
  if (params.type) searchParams.set("type", params.type);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/admin/jobs?${queryString}`
    : "/api/admin/jobs";

  return apiClient.get<JobsListResponse>(url);
}

/**
 * Rerun a failed job
 */
export async function retryJob(
  jobId: string,
): Promise<ApiResponse<JobRerunResponse>> {
  return apiClient.post<JobRerunResponse>(`/api/admin/jobs/${jobId}/rerun`);
}

/**
 * Get job details
 */
export async function getJobDetails(
  jobId: string,
): Promise<ApiResponse<{ job: UnifiedJob; }>> {
  return apiClient.get<{ job: UnifiedJob; }>(`/api/admin/jobs/${jobId}`);
}

// ============================================================================
// Vouchers API
// ============================================================================

/**
 * Get all vouchers
 */
export async function getVouchers(): Promise<
  ApiResponse<VouchersListResponse>
> {
  return apiClient.get<VouchersListResponse>("/api/admin/vouchers");
}

/**
 * Create a new voucher
 */
export async function createVoucher(
  data: CreateVoucherRequest,
): Promise<ApiResponse<CreateVoucherResponse>> {
  return apiClient.post<CreateVoucherResponse>("/api/admin/vouchers", data);
}

/**
 * Update voucher status
 */
export async function updateVoucherStatus(
  id: string,
  status: VoucherStatus,
): Promise<ApiResponse<{ voucher: { id: string; status: VoucherStatus; }; }>> {
  return apiClient.patch("/api/admin/vouchers", { id, status });
}

/**
 * Delete a voucher
 */
export async function deleteVoucher(
  id: string,
): Promise<ApiResponse<{ success: boolean; }>> {
  return apiClient.delete(`/api/admin/vouchers?id=${id}`);
}

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Get token analytics
 */
export async function getTokenAnalytics(): Promise<
  ApiResponse<TokenAnalytics>
> {
  return apiClient.get<TokenAnalytics>("/api/admin/analytics/tokens");
}

/**
 * Get user analytics
 */
export async function getUserAnalytics(): Promise<ApiResponse<UserAnalytics>> {
  return apiClient.get<UserAnalytics>("/api/admin/analytics/users");
}
