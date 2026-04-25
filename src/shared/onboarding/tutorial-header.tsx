import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@/src/shared/design/tokens';

type TutorialHeaderProps = {
  onSkip: () => void;
}

/**
 * 튜토리얼 상단 헤더 — "다음에" 버튼.
 *
 * 진행 단계는 각 TargetCaption의 우상단 1/N 배지로 옮겨짐.
 * 이 헤더는 native step screen의 "다음" 버튼과 동일한 스타일 (translucent pill)로
 * 통일감 + 검은 status bar 배경 위에 명확히 보임.
 *
 * 항상 absolute top, zIndex 최상단.
 */
export function TutorialHeader({ onSkip }: TutorialHeaderProps) {
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
        flexDirection: 'row',
        justifyContent: 'flex-end',
        zIndex: 10000,
      }}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onSkip}
        hitSlop={8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 13,
            fontWeight: '700',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          다음에
        </Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.9)" />
      </Pressable>
    </View>
  );
}
