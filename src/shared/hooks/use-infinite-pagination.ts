import { useInfiniteQuery } from '@tanstack/react-query';

type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
};

type UseInfinitePaginationOptions<T> = {
  queryKey: readonly unknown[];
  queryFn: (params: { pageParam: string | null }) => Promise<CursorPage<T>>;
  staleTime?: number;
  enabled?: boolean;
};

/**
 * Cursor 기반 무한 스크롤 공유 훅.
 * 웹뷰 v2의 useCursorPaginationQuery와 동일 패턴.
 *
 * 반환:
 * - entities: 평탄화된 전체 아이템 배열
 * - fetchNextPage: 다음 페이지 로드 (중복 요청 방지 포함)
 * - hasNextPage / isFetchingNextPage / isLoading / error
 */
export function useInfinitePagination<T>({
  queryKey,
  queryFn,
  staleTime = 2 * 60 * 1000,
  enabled = true,
}: UseInfinitePaginationOptions<T>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: null as string | null,
    enabled,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    select: (d) => ({
      entities: d.pages.flatMap((page) => page.data),
    }),
    staleTime,
  });

  const handleFetchNextPage = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return {
    entities: data?.entities ?? [],
    fetchNextPage: handleFetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  };
}
