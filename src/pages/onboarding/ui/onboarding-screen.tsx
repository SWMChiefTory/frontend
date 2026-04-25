import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useMarketStore } from '@/src/shared/store/marketStore';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useRecommendRecipes, RecommendType } from '@/src/entities/recipe';
import { completeTutorial } from '@/src/entities/user';
import { trackNative } from '@/src/shared/analytics';
import { AmplitudeEvent } from '@/src/shared/analytics/amplitudeEvents';
import { router } from 'expo-router';
import { ShareTutorial } from '@/src/pages/onboarding/components/share-tutorial/share-tutorial';

const BG = '#FFF7ED';

const TORY_COOKING = require('@/assets/images/tory-veggie.png');

type OnboardingScreenProps = {
  onComplete: () => void;
}

type Phase = 'share' | 'completion';

/**
 * 첫 온보딩.
 *
 * 두 단계만 거침:
 *   1) ShareTutorial — 인터랙티브 공유 플로우 학습 (4 phase)
 *   2) CompletionStep — 토리 환영 + 인기 레시피 카드
 *
 * 이전엔 step1(공유 슬라이드)/step2(쿠킹 모드 슬라이드)/step3(완료) 구조였으나,
 * just-in-time contextual onboarding 전략으로 전환:
 *   - 공유만 첫 진입에 가르침 (활성화 critical path)
 *   - 쿠킹 모드, 레시피 detail 등은 해당 페이지 첫 진입 시 별도로 가르침
 */
export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [phase, setPhase] = useState<Phase>('share');
  const [startedAt] = useState(() => Date.now());

  // 온보딩 시작 트래킹
  useEffect(() => {
    trackNative(AmplitudeEvent.ONBOARDING_START);
  }, []);

  const handleSkip = useCallback(() => {
    trackNative(AmplitudeEvent.ONBOARDING_SKIP, {
      phase,
      duration_ms: Date.now() - startedAt,
    });
    onComplete();
  }, [onComplete, phase, startedAt]);

  if (phase === 'share') {
    return (
      <ShareTutorial
        onComplete={() => setPhase('completion')}
        onSkip={handleSkip}
      />
    );
  }

  return <CompletionStep onComplete={onComplete} startedAt={startedAt} />;
}

// ─── 완료 화면 ───
function CompletionStep({
  onComplete,
  startedAt,
}: {
  onComplete: () => void;
  startedAt: number;
}) {
  const insets = useSafeAreaInsets();
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  const { entities: popularEntities } = useRecommendRecipes(RecommendType.POPULAR);
  const recipes = popularEntities.slice(0, 3);

  const finish = useCallback(
    async (exit_type: 'start_cooking' | 'recipe_detail') => {
      let isFirstComplete = false;
      try {
        isFirstComplete = await completeTutorial();
      } catch (err) {
        console.warn('[Onboarding] tutorial complete failed:', err);
      }
      trackNative(AmplitudeEvent.ONBOARDING_COMPLETE, {
        exit_type,
        duration_ms: Date.now() - startedAt,
        is_first_complete: isFirstComplete,
      });
      onComplete();
    },
    [onComplete, startedAt],
  );

  const handleStartCooking = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    finish('start_cooking');
  }, [finish]);

  const handleRecipePress = useCallback(
    async (recipeId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await finish('recipe_detail');
      setTimeout(() => router.push(`/recipe/${recipeId}`), 100);
    },
    [finish],
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xxxl,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 토리 캐릭터 — 떠다니는 애니메이션 */}
        <FloatingTory />

        {/* 제목 */}
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 26,
            fontWeight: '700',
            color: colors.text.primary,
            textAlign: 'center',
          }}
        >
          {t.completionTitle}
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 14,
            color: colors.text.secondary,
            textAlign: 'center',
            marginTop: -spacing.sm,
          }}
        >
          {t.completionSubtitle}
        </Text>

        {/* 메인 CTA */}
        <Pressable
          onPress={handleStartCooking}
          style={{
            width: '100%',
            maxWidth: 320,
            paddingVertical: spacing.lg,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            alignItems: 'center',
            marginTop: spacing.md,
          }}
        >
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 17,
              fontWeight: '700',
              color: colors.text.inverse,
            }}
          >
            {t.startCooking}
          </Text>
        </Pressable>

        {/* 디바이더 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            width: '100%',
            marginTop: spacing.md,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.disabled }}>
            {t.orBrowsePopular}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* 인기 레시피 그리드 */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%', justifyContent: 'space-between' }}>
          {(recipes.length > 0
            ? recipes
            : [{ recipeId: 'sk1' }, { recipeId: 'sk2' }, { recipeId: 'sk3' }]
          ).map((r: any, i) => (
            <Pressable
              key={r.recipeId ?? i}
              onPress={() => r.videoThumbnailUrl && handleRecipePress(r.recipeId)}
              style={{ flex: 1, gap: spacing.xs }}
            >
              <View
                style={{
                  aspectRatio: 16 / 10,
                  borderRadius: radius.sm,
                  backgroundColor: colors.surface,
                  overflow: 'hidden',
                }}
              >
                {r.videoThumbnailUrl ? (
                  <Image source={{ uri: r.videoThumbnailUrl }} style={{ flex: 1 }} contentFit="cover" />
                ) : null}
              </View>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 11,
                  fontWeight: '600',
                  color: colors.text.primary,
                }}
                numberOfLines={2}
              >
                {r.recipeTitle ?? ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FloatingTory() {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) });

    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image source={TORY_COOKING} style={{ width: 240, height: 240 }} contentFit="contain" />
    </Animated.View>
  );
}

const TEXTS = {
  KOREA: {
    completionTitle: '준비 완료!',
    completionSubtitle: '이제 토리와 함께 요리를 시작해볼까요?',
    startCooking: '쉐프토리 시작하기',
    orBrowsePopular: '또는 인기 레시피 둘러보기',
  },
  GLOBAL: {
    completionTitle: 'You\'re all set!',
    completionSubtitle: 'Ready to start cooking with Tory?',
    startCooking: 'Start Cheftory',
    orBrowsePopular: 'Or browse popular recipes',
  },
} as const;
