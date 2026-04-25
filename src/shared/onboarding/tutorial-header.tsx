import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/src/shared/design/tokens';

type TutorialHeaderProps = {
  /** 0-based 현재 phase 인덱스 */
  currentIndex: number;
  /** 전체 phase 수 */
  total: number;
  onSkip: () => void;
  /** 헤더 위에 표시할 라벨 (e.g. "튜토리얼 1/4") */
  label?: string;
}

/**
 * 모든 contextual onboarding이 공통으로 쓰는 상단 헤더.
 * 진행 dots(완료된 단계 + 현재 단계 강조) + "건너뛰기" 버튼.
 * 항상 absolute top, zIndex 최상단.
 */
export function TutorialHeader({ currentIndex, total, onSkip, label }: TutorialHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        zIndex: 10000,
      }}
      pointerEvents="box-none"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {/* 진행 dots */}
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= currentIndex ? colors.primary : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </View>

        {/* 건너뛰기 */}
        <Pressable onPress={onSkip} hitSlop={12}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            건너뛰기
          </Text>
        </Pressable>
      </View>

      {label ? (
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
