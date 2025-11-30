import { useState, useEffect, useCallback } from 'react'
import { JobStatus } from '@prisma/client'

export interface JobData {
  id: string
  status: JobStatus
  tier: string
  tokensCost: number
  enhancedUrl?: string | null
  enhancedWidth?: number | null
  enhancedHeight?: number | null
  errorMessage?: string | null
  createdAt: Date
  processingStartedAt?: Date | null
  processingCompletedAt?: Date | null
  image: {
    id: string
    name: string
    originalUrl: string
    originalWidth: number
    originalHeight: number
  }
}

export interface UseJobPollingResult {
  job: JobData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobPolling(
  jobId: string | null,
  interval = 2000
): UseJobPollingResult {
  const [job, setJob] = useState<JobData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs/${jobId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch job: ${response.statusText}`)
      }

      const data = await response.json()
      setJob(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job')
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) return

    fetchJob()

    const intervalId = setInterval(() => {
      if (job?.status === JobStatus.COMPLETED || job?.status === JobStatus.FAILED) {
        clearInterval(intervalId)
        return
      }
      fetchJob()
    }, interval)

    return () => clearInterval(intervalId)
  }, [jobId, interval, fetchJob, job?.status])

  return {
    job,
    isLoading,
    error,
    refetch: fetchJob,
  }
}
