import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMarketStore } from '@/src/shared/store/marketStore';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
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

type Phase = 'welcome' | 'share' | 'completion';

/**
 * 첫 온보딩 — 3-phase 흐름.
 *
 * 1) Welcome — 토리 인사 + 가치 제안 + "시작하기" CTA (context 설정)
 * 2) ShareTutorial — 4-phase 인터랙티브 공유 튜토리얼
 * 3) Completion — 완료 환영 + 인기 레시피 카드
 *
 * 쿠킹 모드/디테일 페이지 등 나머지 학습은 해당 페이지 첫 진입 시
 * contextual onboarding으로 분리 (just-in-time 전략).
 */
export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [startedAt] = useState(() => Date.now());

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

  if (phase === 'welcome') {
    return (
      <WelcomeStep
        onStart={() => setPhase('share')}
        onSkip={handleSkip}
      />
    );
  }

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

// ─── Welcome 화면 ───
function WelcomeStep({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStart();
  }, [onStart]);

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      {/* 우상단 "다음에" — 헤더와 동일 스타일이지만 cream bg에 맞게 dark variant */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }}
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
            backgroundColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              fontWeight: '700',
              color: '#606060',
            }}
          >
            {t.skip}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#606060" />
        </Pressable>
      </View>

      {/* 메인 콘텐츠 */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          gap: spacing.xl,
        }}
      >
        <StaticTory />

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 26,
              fontWeight: '700',
              color: colors.text.primary,
              textAlign: 'center',
              lineHeight: 34,
            }}
          >
            {t.welcomeTitle}
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 14,
              color: colors.text.secondary,
              textAlign: 'center',
              lineHeight: 20,
              marginTop: spacing.xs,
            }}
          >
            {t.welcomeSubtitle}
          </Text>
        </View>
      </View>

      {/* 하단 CTA */}
      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.lg }}>
        <Pressable
          onPress={handleStart}
          style={{
            paddingVertical: spacing.lg,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            alignItems: 'center',
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
            {t.welcomeStart}
          </Text>
        </Pressable>
      </View>
    </View>
  );
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
        {/* 토리 (정적, 한 번만 entrance scale) */}
        <StaticTory />

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

/**
 * 정적 토리 캐릭터 — 한 번만 entrance scale (0.6 → 1.0).
 * 떠다니거나 회전하는 perpetual 애니메이션 없음 (피로감 ↓, 차분함).
 */
function StaticTory() {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image source={TORY_COOKING} style={{ width: 240, height: 240 }} contentFit="contain" />
    </Animated.View>
  );
}

const TEXTS = {
  KOREA: {
    skip: '건너뛰기',
    welcomeTitle: '안녕하세요!\n쉐프토리에 오신 걸 환영해요',
    welcomeSubtitle: '유튜브에서 본 레시피를\n쉐프토리로 가져오는 법을 알려드릴게요',
    welcomeStart: '시작하기',
    completionTitle: '준비 완료!',
    completionSubtitle: '이제 토리와 함께 요리를 시작해볼까요?',
    startCooking: '쉐프토리 시작하기',
    orBrowsePopular: '또는 인기 레시피 둘러보기',
  },
  GLOBAL: {
    skip: 'Skip',
    welcomeTitle: 'Hello!\nWelcome to ChefTory',
    welcomeSubtitle: 'Let me show you how to bring\nYouTube recipes into ChefTory',
    welcomeStart: 'Get Started',
    completionTitle: 'You\'re all set!',
    completionSubtitle: 'Ready to start cooking with Tory?',
    startCooking: 'Start Cheftory',
    orBrowsePopular: 'Or browse popular recipes',
  },
} as const;
