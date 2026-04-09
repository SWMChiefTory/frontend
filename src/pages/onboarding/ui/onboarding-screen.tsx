import { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useRecommendRecipes, RecommendType } from '@/src/entities/recipe';
import { completeTutorial } from '@/src/entities/user';
import { trackNative } from '@/src/shared/analytics';
import { AmplitudeEvent } from '@/src/shared/analytics/amplitudeEvents';
import { router } from 'expo-router';

const BG = '#FFF7ED';

const TORY_COOKING = require('@/assets/images/tory-veggie.png');
const APP_SHARE_1 = require('@/assets/images/onboarding/app-share_1.png');
const APP_SHARE_2 = require('@/assets/images/onboarding/app-share_2.png');
const APP_SHARE_3 = require('@/assets/images/onboarding/app-share_3.png');
const APP_HOME = require('@/assets/images/onboarding/app-home.png');
const APP_DETAIL_2_1 = require('@/assets/images/onboarding/app-detail-2_1.png');
const APP_DETAIL_2_2 = require('@/assets/images/onboarding/app-detail-2_2.png');
const APP_COOKING = require('@/assets/images/onboarding/app-cooking_home.png');

type OnboardingScreenProps = {
  onComplete: () => void;
}

// ─── Step 1: 레시피 등록 플로우 ───
const STEP1_STATES = [
  { id: 'youtube', image: APP_SHARE_1, title: '유튜브에서 레시피 영상을 찾아요', subtitle: '평소 보던 요리 영상 그대로 OK!' },
  { id: 'share_sheet', image: APP_SHARE_2, title: '공유 버튼을 눌러 쉐프토리로 보내요', subtitle: '공유 시트에서 쉐프토리를 선택' },
  { id: 'create_confirm', image: APP_SHARE_3, title: '레시피 생성 확인', subtitle: '버튼 한 번이면 자동으로 정리돼요' },
  { id: 'home_saved', image: APP_HOME, title: '내 레시피에 저장 완료!', subtitle: '언제든 꺼내 볼 수 있어요' },
] as const;

// ─── Step 2: 쿠킹 모드 학습 ───
const STEP2_STATES = [
  { id: 'overview', image: APP_DETAIL_2_2, title: '레시피 한눈에 보기', subtitle: '재료, 단계, 시간을 정리해서 보여줘요' },
  { id: 'detail', image: APP_DETAIL_2_1, title: '단계별로 자세히', subtitle: '각 단계의 설명과 영상 구간을 확인하세요' },
  { id: 'cooking', image: APP_COOKING, title: '음성으로 핸즈프리 요리', subtitle: '"다음", "이전"만 말하면 단계가 넘어가요' },
] as const;

type Phase = 'step1' | 'step2' | 'step3';

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('step1');
  const [step1Index, setStep1Index] = useState(0);
  const [step2Index, setStep2Index] = useState(0);
  const [startedAt] = useState(() => Date.now());

  // 온보딩 시작 트래킹
  useEffect(() => {
    trackNative(AmplitudeEvent.ONBOARDING_START);
  }, []);

  const getGlobalStep = useCallback((): number => {
    if (phase === 'step1') return step1Index + 1;
    if (phase === 'step2') return STEP1_STATES.length + step2Index + 1;
    return STEP1_STATES.length + STEP2_STATES.length + 1;
  }, [phase, step1Index, step2Index]);

  const haptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ─── 진행 ───
  const handleNext = useCallback(() => {
    haptic();
    if (phase === 'step1') {
      if (step1Index < STEP1_STATES.length - 1) setStep1Index(step1Index + 1);
      else { setPhase('step2'); setStep2Index(0); }
    } else if (phase === 'step2') {
      if (step2Index < STEP2_STATES.length - 1) setStep2Index(step2Index + 1);
      else setPhase('step3');
    }
  }, [phase, step1Index, step2Index, haptic]);

  const handlePrev = useCallback(() => {
    haptic();
    if (phase === 'step1') {
      if (step1Index > 0) setStep1Index(step1Index - 1);
    } else if (phase === 'step2') {
      if (step2Index > 0) setStep2Index(step2Index - 1);
      else { setPhase('step1'); setStep1Index(STEP1_STATES.length - 1); }
    } else if (phase === 'step3') {
      setPhase('step2');
      setStep2Index(STEP2_STATES.length - 1);
    }
  }, [phase, step1Index, step2Index, haptic]);

  const handleSkip = useCallback(() => {
    trackNative(AmplitudeEvent.ONBOARDING_SKIP, {
      global_step: getGlobalStep(),
      duration_ms: Date.now() - startedAt,
    });
    onComplete();
  }, [onComplete, getGlobalStep, startedAt]);

  // ─── 진행 인디케이터 ───
  const totalDots = STEP1_STATES.length + STEP2_STATES.length + 1;
  const currentDot = useMemo(() => {
    if (phase === 'step1') return step1Index;
    if (phase === 'step2') return STEP1_STATES.length + step2Index;
    return totalDots - 1;
  }, [phase, step1Index, step2Index, totalDots]);

  if (phase === 'step3') {
    return (
      <CompletionStep
        onComplete={onComplete}
        insets={insets}
        onPrev={handlePrev}
        startedAt={startedAt}
      />
    );
  }

  const current = phase === 'step1' ? STEP1_STATES[step1Index] : STEP2_STATES[step2Index];
  const sectionLabel = phase === 'step1' ? 'STEP 1 · 레시피 등록' : 'STEP 2 · 쿠킹 모드';

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      {/* 헤더: 인디케이터 + 건너뛰기 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
          {Array.from({ length: totalDots }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: i <= currentDot ? colors.primary : 'rgba(196,99,43,0.2)',
              }}
            />
          ))}
        </View>
        <Pressable onPress={handleSkip} hitSlop={8} style={{ marginLeft: spacing.md }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              fontWeight: '600',
              color: colors.text.disabled,
            }}
          >
            건너뛰기
          </Text>
        </Pressable>
      </View>

      {/* 본문 */}
      <Pressable
        onPress={handleNext}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md }}
      >
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 11,
            fontWeight: '700',
            color: colors.primary,
            letterSpacing: 0.5,
          }}
        >
          {sectionLabel}
        </Text>
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 22,
            fontWeight: '700',
            color: colors.text.primary,
            textAlign: 'center',
          }}
        >
          {current.title}
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 14,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          {current.subtitle}
        </Text>

        <Image
          source={current.image}
          style={{ flex: 1, width: width * 0.7, marginTop: spacing.lg, marginBottom: spacing.xxxl }}
          contentFit="contain"
        />
      </Pressable>

      {/* 하단 네비게이션 */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        <Pressable
          onPress={handlePrev}
          disabled={phase === 'step1' && step1Index === 0}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.lg,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: colors.surface,
            opacity: phase === 'step1' && step1Index === 0 ? 0.4 : 1,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
        </Pressable>
        <Pressable
          onPress={handleNext}
          style={{
            flex: 1,
            paddingVertical: spacing.lg,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 16,
              fontWeight: '700',
              color: colors.text.inverse,
            }}
          >
            다음
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Step 3: 완료 화면 ───
function CompletionStep({
  onComplete,
  insets,
  onPrev,
  startedAt,
}: {
  onComplete: () => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onPrev: () => void;
  startedAt: number;
}) {
  const { data: popular } = useRecommendRecipes(RecommendType.POPULAR);
  const recipes = popular?.data?.slice(0, 3) ?? [];

  const finish = useCallback(
    async (exit_type: 'start_cooking' | 'recipe_detail' | 'explore') => {
      let isFirstComplete = false;
      try {
        isFirstComplete = await completeTutorial();
      } catch (err) {
        console.warn('[Onboarding] tutorial complete failed:', err);
      }
      trackNative(AmplitudeEvent.ONBOARDING_COMPLETE, {
        global_step: 8,
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
      {/* 헤더: 뒤로 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable onPress={onPrev} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
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
          준비 완료!
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
          이제 토리와 함께 요리를 시작해볼까요?
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
            쉐프토리 시작하기
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
            또는 인기 레시피 둘러보기
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
    // 등장 애니메이션
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) });

    // 떠다니는 + 살짝 흔들리는 애니메이션
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

