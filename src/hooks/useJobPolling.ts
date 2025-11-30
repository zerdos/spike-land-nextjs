import { useEffect, useState } from 'react'
import type { JobStatus } from '@prisma/client'

interface Job {
  id: string
  status: JobStatus
  enhancedUrl: string | null
  enhancedWidth: number | null
  enhancedHeight: number | null
  errorMessage: string | null
}

interface UseJobPollingOptions {
  jobId: string | null
  onComplete?: (job: Job) => void
  onError?: (error: string) => void
  interval?: number
}

export function useJobPolling({
  jobId,
  onComplete,
  onError,
  interval = 2000,
}: UseJobPollingOptions) {
  const [job, setJob] = useState<Job | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    if (!jobId) return

    setIsPolling(true)
    let timeoutId: NodeJS.Timeout

    const pollJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch job status')
        }

        const data: Job = await response.json()
        setJob(data)

        if (data.status === 'COMPLETED') {
          setIsPolling(false)
          onComplete?.(data)
        } else if (data.status === 'FAILED') {
          setIsPolling(false)
          onError?.(data.errorMessage || 'Enhancement failed')
        } else {
          // Continue polling
          timeoutId = setTimeout(pollJob, interval)
        }
      } catch (error) {
        setIsPolling(false)
        onError?.(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    pollJob()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [jobId, interval, onComplete, onError])

  return {
    job,
    isPolling,
  }
}
