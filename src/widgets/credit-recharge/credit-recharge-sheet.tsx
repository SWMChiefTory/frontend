import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useBalance, useRechargeBalance, LimitExceededError, CREDIT_PER_SHARE } from '@/src/entities/balance';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { track, RechargeEvents } from '@/src/shared/analytics';

type Step = 'clipboard' | 'kakao' | 'success';

const SHARE_URL = 'https://www.cheftories.com';
const SHARE_TEXT = `🍳 셰프토리에서 레시피 공유하고 맛있는 요리를 만들어보세요!\n\n나만의 레시피를 정리하고, 친구들과 공유하며 요리 실력을 UP!\n\n지금 바로 시작해보세요 👇\n${SHARE_URL}`;

const TORY_LOGO = require('@/assets/images/tory-logo.png');
const BERRY_ICON = require('@/assets/images/berry-icon.png');

export interface CreditRechargeSheetRef {
  open: () => void;
  close: () => void;
}

export const CreditRechargeSheet = forwardRef<CreditRechargeSheetRef>(function CreditRechargeSheet(_, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<Step>('clipboard');
  const [rechargeAmount, setRechargeAmount] = useState<number | null>(null);
  const { data: balance } = useBalance();

  useImperativeHandle(ref, () => ({
    open: () => {
      setStep('clipboard');
      setRechargeAmount(null);
      sheetRef.current?.present();
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      detached
      bottomInset={60}
      style={{ marginHorizontal: 16 }}
      enablePanDownToClose
      stackBehavior="push"
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
      backgroundStyle={{ backgroundColor: colors.background, borderRadius: radius.xl }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={{ padding: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg }}>
        {/* 헤더 */}
        <View>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 20,
              fontWeight: '700',
              color: colors.text.primary,
            }}
          >
            크레딧 충전하기
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              color: colors.text.secondary,
              marginTop: 4,
            }}
          >
            친구에게 쉐프토리를 공유하고 크레딧을 받아보세요
          </Text>
        </View>

        {/* 진행 인디케이터 */}
        <StepProgress current={step} />

        {/* Step 컨텐츠 */}
        <View>
          {step === 'clipboard' && <ClipboardStep onNext={() => setStep('kakao')} />}
          {step === 'kakao' && (
            <KakaoStep
              onBack={() => setStep('clipboard')}
              onSuccess={(amount) => {
                setRechargeAmount(amount);
                setStep('success');
              }}
            />
          )}
          {step === 'success' && (
            <SuccessStep
              amount={rechargeAmount}
              currentBalance={balance?.balance ?? 0}
              onClose={() => sheetRef.current?.dismiss()}
            />
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

// ─── Step Progress ───────────────────────────────────────────────
function StepProgress({ current }: { current: Step }) {
  const steps: Step[] = ['clipboard', 'kakao', 'success'];
  const labels: Record<Step, string> = {
    clipboard: '링크 복사',
    kakao: '공유하기',
    success: '완료',
  };
  const currentIdx = steps.indexOf(current);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {steps.map((s, i) => {
        const isActive = i <= currentIdx;
        return (
          <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isActive ? colors.primary : colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: isActive ? colors.text.inverse : colors.text.disabled,
                }}
              >
                {i + 1}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 11,
                color: isActive ? colors.text.primary : colors.text.disabled,
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {labels[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Step 1: Clipboard ───────────────────────────────────────────
function ClipboardStep({ onNext }: { onNext: () => void }) {
  const [copying, setCopying] = useState(false);

  const handleCopy = useCallback(async () => {
    if (copying) return;
    setCopying(true);
    try {
      await Clipboard.setStringAsync(SHARE_TEXT);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        onNext();
        setCopying(false);
      }, 400);
    } catch {
      Alert.alert('복사 실패', '다시 시도해주세요');
      setCopying(false);
    }
  }, [copying, onNext]);

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md }}>
      <Image source={TORY_LOGO} style={{ width: 72, height: 72 }} contentFit="contain" />
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 17,
            fontWeight: '700',
            color: colors.text.primary,
          }}
        >
          친구 초대하고 크레딧 받기
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 13,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          친구에게 쉐프토리를 공유하고{'\n'}크레딧을 받아보세요!
        </Text>
      </View>

      <View
        style={{
          width: '100%',
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          gap: spacing.md,
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 13,
            color: colors.text.secondary,
          }}
          numberOfLines={1}
        >
          {SHARE_URL}
        </Text>
        <Pressable
          onPress={handleCopy}
          disabled={copying}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: colors.primary,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            opacity: copying ? 0.6 : 1,
          }}
        >
          <Ionicons name="copy-outline" size={16} color="#fff" />
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 14,
              fontWeight: '700',
              color: colors.text.inverse,
            }}
          >
            {copying ? '복사 중...' : '복사하기'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Step 2: Kakao ───────────────────────────────────────────────
function KakaoStep({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (amount: number) => void;
}) {
  const { mutate: recharge, isPending } = useRechargeBalance({
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      openKakao();
      onSuccess(data.amount);
    },
    onError: (err) => {
      if (err instanceof LimitExceededError) {
        openKakao();
        onSuccess(0);
      } else {
        Alert.alert('충전 실패', err.message);
      }
    },
  });

  const openKakao = useCallback(async () => {
    const url = Platform.select({
      ios: 'kakaotalk://',
      android: 'kakaotalk://launch',
    }) as string;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // 실패해도 무시 — 이미 충전은 완료됨
    }
  }, []);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    track(RechargeEvents.KAKAO_CLICK);
    recharge();
  }, [recharge]);

  return (
    <View>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Ionicons name="chevron-back" size={16} color={colors.text.secondary} />
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 13,
            color: colors.text.secondary,
          }}
        >
          뒤로
        </Text>
      </Pressable>

      <View style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#FEF3C7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={36} color="#FBBF24" />
        </View>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 17,
              fontWeight: '700',
              color: colors.text.primary,
            }}
          >
            카카오톡으로 공유하기
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 13,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            복사된 링크를 카카오톡으로{'\n'}친구에게 공유해주세요
          </Text>
        </View>

        <Pressable
          onPress={handleShare}
          disabled={isPending}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            backgroundColor: '#FEE500',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            width: '100%',
          }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="rgba(0,0,0,0.85)" />
          ) : (
            <Ionicons name="chatbubble" size={16} color="rgba(0,0,0,0.85)" />
          )}
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 14,
              fontWeight: '700',
              color: 'rgba(0,0,0,0.85)',
            }}
          >
            {isPending ? '공유 중...' : '카카오톡으로 공유하기'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Step 3: Success ─────────────────────────────────────────────
function SuccessStep({
  amount,
  currentBalance,
  onClose,
}: {
  amount: number | null;
  currentBalance: number;
  onClose: () => void;
}) {
  const isLoading = amount === null;
  const isLimitExceeded = amount === 0;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : isLimitExceeded ? (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="information-circle-outline" size={40} color={colors.text.disabled} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Image source={BERRY_ICON} style={{ width: 36, height: 36 }} contentFit="contain" />
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 28,
                fontWeight: '700',
                color: colors.semantic.error,
              }}
            >
              +{amount ?? CREDIT_PER_SHARE}
            </Text>
          </View>
        )}

        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 17,
              fontWeight: '700',
              color: colors.text.primary,
            }}
          >
            {isLoading ? '공유 처리 중...' : isLimitExceeded ? '공유해주셔서 감사해요!' : '공유가 완료되었어요!'}
          </Text>
          {isLimitExceeded ? (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
                오늘의 충전 횟수를 모두 사용했어요
              </Text>
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
                내일 다시 충전할 수 있어요!
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
              {isLoading ? '카카오톡 공유 완료 시 자동 충전됩니다' : '친구에게 공유해주셔서 감사해요'}
            </Text>
          )}
        </View>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 12,
            color: colors.text.disabled,
          }}
        >
          현재 베리: <Text style={{ fontWeight: '700', color: colors.text.primary }}>{currentBalance}</Text>
        </Text>
      </View>

      {!isLoading && (
        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 15,
              fontWeight: '700',
              color: colors.text.inverse,
            }}
          >
            확인
          </Text>
        </Pressable>
      )}
    </View>
  );
}
