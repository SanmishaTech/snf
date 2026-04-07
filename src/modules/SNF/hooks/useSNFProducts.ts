import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchProductPage } from "../services/api";

interface UseSNFProductsParams {
  depotId: number | null;
  categoryId?: number;
  tags?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Shared hook for fetching paginated products with server-side filtering.
 * Leverages TanStack Query for caching, deduplication, and automatic resets.
 */
export function useSNFProducts({ 
  depotId, 
  categoryId, 
  tags, 
  search, 
  limit,
  enabled = true 
}: UseSNFProductsParams) {
  return useInfiniteQuery({
    queryKey: ['snf-products', depotId, categoryId, tags, search, limit],
    queryFn: ({ pageParam }) => fetchProductPage({
      depotId: depotId || 1,
      page: pageParam as number,
      categoryId,
      tags,
      search,
      limit
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: enabled && !!depotId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000, // Keep in memory for 15 minutes
  });
}
