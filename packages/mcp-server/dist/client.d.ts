/**
 * Spike Land API Client
 *
 * HTTP client for communicating with the Spike Land MCP API
 */
interface GenerateRequest {
    prompt: string;
    tier?: "TIER_1K" | "TIER_2K" | "TIER_4K";
    negativePrompt?: string;
    aspectRatio?: string;
}
interface ModifyRequest {
    prompt: string;
    image: string;
    mimeType: string;
    tier?: "TIER_1K" | "TIER_2K" | "TIER_4K";
}
interface JobResponse {
    success: boolean;
    jobId?: string;
    tokensCost?: number;
    error?: string;
}
interface Job {
    id: string;
    type: "GENERATE" | "MODIFY";
    tier: string;
    tokensCost: number;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
    prompt: string;
    inputImageUrl?: string | null;
    outputImageUrl?: string | null;
    outputWidth?: number | null;
    outputHeight?: number | null;
    errorMessage?: string | null;
    createdAt: string;
    processingStartedAt?: string | null;
    processingCompletedAt?: string | null;
}
interface JobStatus {
    job: Job;
}
interface BalanceResponse {
    balance: number;
    lastRegeneration: string;
}
export declare class SpikeLandClient {
    private baseUrl;
    private apiKey;
    constructor(apiKey: string, baseUrl?: string);
    private request;
    /**
     * Generate a new image from a text prompt
     */
    generateImage(params: GenerateRequest): Promise<JobResponse>;
    /**
     * Modify an existing image with a text prompt
     */
    modifyImage(params: ModifyRequest): Promise<JobResponse>;
    /**
     * Get the status of a job
     */
    getJobStatus(jobId: string): Promise<JobStatus>;
    /**
     * Get the current token balance
     */
    getBalance(): Promise<BalanceResponse>;
    /**
     * Poll for job completion
     */
    waitForJob(jobId: string, options?: {
        maxAttempts?: number;
        intervalMs?: number;
        onProgress?: (status: JobStatus) => void;
    }): Promise<JobStatus>;
}
export {};
//# sourceMappingURL=client.d.ts.map