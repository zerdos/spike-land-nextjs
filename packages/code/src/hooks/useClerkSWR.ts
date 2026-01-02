import useSWR from "swr";

/**
 * @deprecated Clerk has been removed. Use regular fetch or useSWR directly.
 */
export const useClerkSWR = (url: string) => {
  const fetcher = async (...args: [RequestInfo]) => {
    return fetch(...args).then((res) => res.json());
  };

  return useSWR(url, fetcher);
};
