import { Skeleton as MotiSkeleton } from 'moti/skeleton';

type SkeletonProps = {
  width: number | string;
  height: number;
  borderRadius?: number;
}

const SKELETON_COLORS = ['#E8E8E8', '#F5F5F5', '#E8E8E8'] as const;

export function Skeleton({ width, height, borderRadius = 8 }: SkeletonProps) {
  return (
    <MotiSkeleton
      colorMode="light"
      colors={SKELETON_COLORS as unknown as string[]}
      width={width as number}
      height={height}
      radius={borderRadius}
      show
    />
  );
}
