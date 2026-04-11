import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Linking } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useReportRecipe, type RecipeReportReason } from '@/src/entities/recipe-report';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { track, ReportEvents, ContactEvents } from '@/src/shared/analytics';
import { useMarketStore } from '@/src/shared/store/marketStore';

const KAKAO_OPEN_CHAT_URL = 'https://open.kakao.com/o/sXzywB7h';

const REASONS_KO: { id: RecipeReportReason; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'INAPPROPRIATE_CONTENT', label: '부적절한 콘텐츠', icon: 'warning-outline', color: '#EF4444' },
  { id: 'MISINFORMATION', label: '잘못된 정보', icon: 'information-circle-outline', color: '#3B82F6' },
  { id: 'LOW_QUALITY', label: '낮은 품질', icon: 'remove-circle-outline', color: '#F59E0B' },
  { id: 'OTHER', label: '기타', icon: 'chatbubble-outline', color: '#6B7280' },
];

const REASONS_EN: { id: RecipeReportReason; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content', icon: 'warning-outline', color: '#EF4444' },
  { id: 'MISINFORMATION', label: 'Misinformation', icon: 'information-circle-outline', color: '#3B82F6' },
  { id: 'LOW_QUALITY', label: 'Low quality', icon: 'remove-circle-outline', color: '#F59E0B' },
  { id: 'OTHER', label: 'Other', icon: 'chatbubble-outline', color: '#6B7280' },
];

export type RecipeReportSheetRef = {
  open: (recipeId: string) => void;
  close: () => void;
}

export const RecipeReportSheet = forwardRef<RecipeReportSheetRef>(function RecipeReportSheet(_, ref) {
  const menuRef = useRef<BottomSheetModal>(null);
  const reportRef = useRef<BottomSheetModal>(null);
  const [recipeId, setRecipeId] = useState<string>('');
  const [step, setStep] = useState<'select' | 'detail'>('select');
  const [selectedReason, setSelectedReason] = useState<RecipeReportReason | null>(null);
  const [description, setDescription] = useState('');
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  const REASONS = market === 'GLOBAL' ? REASONS_EN : REASONS_KO;

  const { mutate: report, isPending } = useReportRecipe();

  useImperativeHandle(ref, () => ({
    open: (id) => {
      setRecipeId(id);
      menuRef.current?.present();
    },
    close: () => {
      menuRef.current?.dismiss();
      reportRef.current?.dismiss();
    },
  }));

  const handleReportPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    menuRef.current?.dismiss();
    setStep('select');
    setSelectedReason(null);
    setDescription('');
    track(ReportEvents.OPEN, { recipe_id: recipeId });
    setTimeout(() => reportRef.current?.present(), 300);
  }, [recipeId]);

  const handleContactPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    menuRef.current?.dismiss();
    track(ContactEvents.KAKAO_CLICK, { source: 'recipe_report_menu' });
    try {
      await Linking.openURL(KAKAO_OPEN_CHAT_URL);
    } catch {
      Alert.alert(t.errorTitle, t.kakaoError);
    }
  }, []);

  const handleSelectReason = useCallback((reason: RecipeReportReason) => {
    Haptics.selectionAsync();
    setSelectedReason(reason);
    setStep('detail');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!recipeId || !selectedReason) return;
    report(
      { recipeId, body: { reason: selectedReason, description: description.trim() || null } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          track(ReportEvents.SUBMIT, {
            recipe_id: recipeId,
            reason: selectedReason,
            description: description.trim() || undefined,
          });
          Alert.alert(t.reportSuccess, t.reportSuccessMessage);
          reportRef.current?.dismiss();
        },
        onError: (error: any) => {
          const errorCode = error?.response?.data?.errorCode;
          if (errorCode === 'REPORT_001') {
            Alert.alert(t.alreadyReported, t.alreadyReportedMessage);
          } else {
            Alert.alert(t.errorTitle, t.reportError);
          }
        },
      },
    );
  }, [recipeId, selectedReason, description, report]);

  return (
    <>
      {/* 메뉴 시트 */}
      <BottomSheetModal
        ref={menuRef}
        enableDynamicSizing
        detached
        bottomInset={60}
        style={{ marginHorizontal: 16 }}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
        )}
        backgroundStyle={{ backgroundColor: colors.background, borderRadius: radius.xl }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={{ padding: spacing.md, paddingBottom: spacing.lg }}>
          <Pressable
            onPress={handleReportPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surface : 'transparent',
            })}
          >
            <Ionicons name="flag-outline" size={20} color={colors.text.secondary} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
              {t.report}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleContactPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surface : 'transparent',
            })}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={colors.text.secondary} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, fontWeight: '500', color: colors.text.primary }}>
              {t.contact}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* 신고 시트 */}
      <BottomSheetModal
        ref={reportRef}
        enableDynamicSizing
        detached
        bottomInset={60}
        style={{ marginHorizontal: 16 }}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
        )}
        backgroundStyle={{ backgroundColor: colors.background, borderRadius: radius.xl }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={{ padding: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg }}>
          {/* 헤더 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {step === 'detail' ? (
              <Pressable onPress={() => setStep('select')} hitSlop={8}>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.primary,
                  }}
                >
                  {t.back}
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 40 }} />
            )}
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 17,
                fontWeight: '700',
                color: colors.text.primary,
              }}
            >
              {t.reportTitle}
            </Text>
            <Pressable onPress={() => reportRef.current?.dismiss()} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {step === 'select' ? (
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 13,
                  color: colors.text.secondary,
                  marginBottom: spacing.xs,
                }}
              >
                {t.selectReason}
              </Text>
              {REASONS.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => handleSelectReason(r.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    borderCurve: 'continuous',
                    backgroundColor: colors.background,
                  }}
                >
                  <Ionicons name={r.icon} size={20} color={r.color} />
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: 15,
                      fontWeight: '500',
                      color: colors.text.primary,
                    }}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {/* 선택된 사유 표시 */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.primaryLight,
                  borderRadius: radius.md,
                  borderCurve: 'continuous',
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.primary,
                  }}
                >
                  {REASONS.find((r) => r.id === selectedReason)?.label}
                </Text>
              </View>

              <BottomSheetTextInput
                value={description}
                onChangeText={(t) => setDescription(t.slice(0, 500))}
                placeholder={t.detailPlaceholder}
                placeholderTextColor={colors.text.disabled}
                multiline
                style={{
                  minHeight: 100,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  fontFamily: typography.body.fontFamily,
                  fontSize: 14,
                  color: colors.text.primary,
                  textAlignVertical: 'top',
                }}
              />
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 11,
                  color: colors.text.disabled,
                  textAlign: 'right',
                  marginTop: -spacing.xs,
                }}
              >
                {description.length} / 500
              </Text>

              <Pressable
                onPress={handleSubmit}
                disabled={isPending}
                style={{
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  borderCurve: 'continuous',
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  opacity: isPending ? 0.6 : 1,
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
                  {isPending ? t.submitting : t.submitButton}
                </Text>
              </Pressable>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
});

const TEXTS = {
  KOREA: {
    report: '신고하기',
    contact: '문의하기',
    back: '뒤로',
    reportTitle: '레시피 신고',
    selectReason: '신고 사유를 선택해주세요',
    detailPlaceholder: '자세한 내용을 알려주세요 (선택)',
    submitting: '제출 중...',
    submitButton: '신고 제출',
    errorTitle: '오류',
    kakaoError: '카카오톡 열기에 실패했어요',
    reportSuccess: '신고 완료',
    reportSuccessMessage: '신고가 접수되었어요. 검토 후 조치하겠습니다.',
    alreadyReported: '이미 신고한 레시피',
    alreadyReportedMessage: '이 레시피는 이미 신고하신 상태예요',
    reportError: '신고 처리에 실패했어요',
  },
  GLOBAL: {
    report: 'Report',
    contact: 'Contact us',
    back: 'Back',
    reportTitle: 'Report Recipe',
    selectReason: 'Select a reason for reporting',
    detailPlaceholder: 'Tell us more (optional)',
    submitting: 'Submitting...',
    submitButton: 'Submit report',
    errorTitle: 'Error',
    kakaoError: 'Failed to open KakaoTalk',
    reportSuccess: 'Report submitted',
    reportSuccessMessage: 'Your report has been received. We\'ll review and take action.',
    alreadyReported: 'Already reported',
    alreadyReportedMessage: 'You\'ve already reported this recipe',
    reportError: 'Failed to submit report',
  },
} as const;
