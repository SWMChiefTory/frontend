import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { useEffect } from 'react';
import { useUserStore, useDeleteAccount } from '@/src/entities/user';
import { track, AccountEvents } from '@/src/shared/analytics';
import { useMarketStore } from '@/src/shared/store/marketStore';

const REASONS_KO: { id: string; label: string; key: string }[] = [
  { id: '1', label: '앱 사용법이 복잡해서', key: 'complex_to_use' },
  { id: '2', label: '필요한 기능이 부족해서', key: 'lack_features' },
  { id: '3', label: '다른 서비스를 이용하기 위해서', key: 'use_other_service' },
  { id: '4', label: '요리를 하지 않게 되어서', key: 'no_more_cooking' },
  { id: '5', label: '시간이 없어서 사용하지 않아서', key: 'no_time' },
  { id: '6', label: '다른 요리 앱을 사용하게 되어서', key: 'use_other_app' },
  { id: '7', label: '기타', key: 'other' },
];

const REASONS_EN: { id: string; label: string; key: string }[] = [
  { id: '1', label: 'The app is too complicated to use', key: 'complex_to_use' },
  { id: '2', label: 'Missing features I need', key: 'lack_features' },
  { id: '3', label: 'Switching to another service', key: 'use_other_service' },
  { id: '4', label: 'I no longer cook', key: 'no_more_cooking' },
  { id: '5', label: 'Not enough time to use it', key: 'no_time' },
  { id: '6', label: 'Using a different cooking app', key: 'use_other_app' },
  { id: '7', label: 'Other', key: 'other' },
];

export default function WithdrawalScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useUserStore((s) => s.user);
  const { mutate: deleteAccount, isPending } = useDeleteAccount();
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  const REASONS = market === 'GLOBAL' ? REASONS_EN : REASONS_KO;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [editingReason, setEditingReason] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    track(AccountEvents.WITHDRAWAL_START);
  }, []);

  const toggleReason = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setFeedbacks((f) => {
          const copy = { ...f };
          delete copy[id];
          return copy;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const saveFeedback = useCallback((id: string, text: string) => {
    setFeedbacks((f) => ({ ...f, [id]: text }));
  }, []);

  const canSubmit = selected.size > 0 && !isPending;

  const handleSubmit = useCallback(() => {
    Alert.alert(
      t.confirmTitle,
      t.confirmMessage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deleteAction,
          style: 'destructive',
          onPress: () => {
            const reasonKeys = REASONS.filter((r) => selected.has(r.id)).map((r) => r.key);
            const feedbackCount = Object.values(feedbacks).filter((f) => f.trim().length > 0).length;
            track(AccountEvents.DELETE, {
              reasons: reasonKeys,
              feedback_count: feedbackCount,
            });
            deleteAccount(undefined, {
              onSuccess: () => queryClient.clear(),
              onError: () => Alert.alert(t.errorTitle, t.errorMessage),
            });
          },
        },
      ],
    );
  }, [deleteAccount, queryClient, selected, feedbacks, t, REASONS]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t.screenTitle,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            color: colors.text.primary,
            fontFamily: typography.heading.fontFamily,
            fontSize: 17,
            fontWeight: '700',
          },
        }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 제목 */}
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 24,
            fontWeight: '700',
            color: colors.text.primary,
            lineHeight: 32,
          }}
        >
          {user?.nickname ?? '쉐프'}님,
        </Text>
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 24,
            fontWeight: '700',
            color: colors.text.primary,
            lineHeight: 32,
          }}
        >
          {t.pageSubtitle}
        </Text>

        <View style={{ height: spacing.xl }} />

        {/* 안내 박스 */}
        <View
          style={{
            backgroundColor: colors.primaryLight,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 14,
                fontWeight: '700',
                color: colors.text.primary,
              }}
            >
              {t.infoBoxTitle}
            </Text>
          </View>
          {t.infoItems.map((item, idx) => (
            <Text
              key={idx}
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 13,
                color: colors.text.secondary,
                paddingLeft: spacing.lg,
              }}
            >
              · {item}
            </Text>
          ))}
        </View>

        <View style={{ height: spacing.xxxl }} />

        {/* 사유 섹션 */}
        <Text
          style={{
            fontFamily: typography.heading.fontFamily,
            fontSize: 20,
            fontWeight: '700',
            color: colors.text.primary,
          }}
        >
          {t.reasonSectionTitle}
        </Text>
        <View style={{ height: spacing.xs }} />
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: 14,
            color: colors.text.secondary,
          }}
        >
          {t.reasonSectionSubtitle}
        </Text>

        <View style={{ height: spacing.lg }} />

        {/* 사유 리스트 */}
        <View style={{ gap: spacing.sm }}>
          {REASONS.map((reason) => (
            <ReasonItem
              key={reason.id}
              reason={reason}
              checked={selected.has(reason.id)}
              feedback={feedbacks[reason.id]}
              onToggle={() => toggleReason(reason.id)}
              onWritePress={() => setEditingReason({ id: reason.id, label: reason.label })}
            />
          ))}
        </View>

        <View style={{ height: spacing.xxxl }} />

        {/* 탈퇴 버튼 */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            paddingVertical: spacing.lg,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            alignItems: 'center',
            backgroundColor: canSubmit ? colors.semantic.error : colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 16,
              fontWeight: '700',
              color: canSubmit ? colors.text.inverse : colors.text.disabled,
            }}
          >
            {isPending ? t.processing : t.submitButton}
          </Text>
        </Pressable>
      </ScrollView>

      {editingReason && (
        <FeedbackModal
          reason={editingReason}
          initialText={feedbacks[editingReason.id] ?? ''}
          onSave={(text) => {
            saveFeedback(editingReason.id, text);
            setEditingReason(null);
          }}
          onClose={() => setEditingReason(null)}
        />
      )}
    </View>
  );
}

function ReasonItem({
  reason,
  checked,
  feedback,
  onToggle,
  onWritePress,
}: {
  reason: { id: string; label: string };
  checked: boolean;
  feedback?: string;
  onToggle: () => void;
  onWritePress: () => void;
}) {
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: checked ? colors.primary : colors.border,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: checked ? colors.primaryLight : colors.background,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={onToggle}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: checked ? colors.primary : colors.border,
              backgroundColor: checked ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 15,
              fontWeight: checked ? '600' : '400',
              color: checked ? colors.primary : colors.text.primary,
              flex: 1,
            }}
          >
            {reason.label}
          </Text>
        </Pressable>

        <Pressable
          onPress={onWritePress}
          disabled={!checked}
          hitSlop={8}
          style={{
            padding: 6,
            borderRadius: radius.full,
            backgroundColor: checked ? colors.background : 'transparent',
          }}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={checked ? colors.primary : colors.text.disabled}
          />
        </Pressable>
      </View>

      {checked && feedback ? (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.md,
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.sm,
              padding: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 11,
                color: colors.text.disabled,
                marginBottom: 2,
              }}
            >
              {t.writtenFeedback}
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 13,
                color: colors.text.primary,
              }}
              numberOfLines={2}
            >
              {feedback}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function FeedbackModal({
  reason,
  initialText,
  onSave,
  onClose,
}: {
  reason: { id: string; label: string };
  initialText: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const MAX = 500;
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {/* 헤더 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 16,
                color: colors.text.secondary,
              }}
            >
              {t.cancel}
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 17,
              fontWeight: '700',
              color: colors.text.primary,
            }}
          >
            {t.modalTitle}
          </Text>
          <Pressable onPress={() => onSave(text.trim())} hitSlop={8}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 16,
                fontWeight: '600',
                color: colors.primary,
              }}
            >
              {t.save}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          <View
            style={{
              backgroundColor: colors.primaryLight,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 12,
                color: colors.text.secondary,
                marginBottom: 2,
              }}
            >
              {t.selectedReason}
            </Text>
            <Text
              style={{
                fontFamily: typography.heading.fontFamily,
                fontSize: 15,
                fontWeight: '700',
                color: colors.primary,
              }}
            >
              {reason.label}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 14,
                fontWeight: '600',
                color: colors.text.primary,
                marginBottom: spacing.xs,
              }}
            >
              {t.feedbackLabel}
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 12,
                color: colors.text.disabled,
                marginBottom: spacing.sm,
              }}
            >
              {t.optional}
            </Text>
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.slice(0, MAX))}
              placeholder={t.feedbackPlaceholder}
              placeholderTextColor={colors.text.disabled}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 160,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontFamily: typography.body.fontFamily,
                fontSize: 14,
                color: colors.text.primary,
              }}
            />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 12,
                color: colors.text.disabled,
                textAlign: 'right',
                marginTop: spacing.xs,
              }}
            >
              {text.length} / {MAX}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: 6,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 13,
                fontWeight: '700',
                color: colors.text.primary,
              }}
            >
              {t.tipTitle}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
              · {t.tip1}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
              · {t.tip2}
            </Text>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
              · {t.tip3}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const TEXTS = {
  KOREA: {
    screenTitle: '회원 탈퇴',
    pageSubtitle: '정말 탈퇴하시나요?',
    infoBoxTitle: '회원탈퇴 시 다음 정보가 삭제되어요',
    infoItems: ['저장된 모든 레시피 및 즐겨찾기', '생성한 카테고리 및 요리 기록', '회원 개인 정보'],
    reasonSectionTitle: '떠나시는 이유를 알려주세요',
    reasonSectionSubtitle: '돌아오실 때 더 좋은 서비스를 제공할게요',
    processing: '처리 중...',
    submitButton: '탈퇴하기',
    confirmTitle: '정말 탈퇴하시겠어요?',
    confirmMessage: '탈퇴하면 모든 데이터가 영구 삭제됩니다.',
    cancel: '취소',
    deleteAction: '탈퇴',
    errorTitle: '오류',
    errorMessage: '탈퇴 처리에 실패했어요',
    writtenFeedback: '작성한 의견',
    modalTitle: '자세한 의견 작성',
    save: '저장',
    selectedReason: '선택한 이유',
    feedbackLabel: '자세한 의견을 들려주세요',
    optional: '선택사항입니다',
    feedbackPlaceholder: '더 나은 서비스를 위해 구체적인 의견을 남겨주세요...',
    tipTitle: '의견 작성 TIP',
    tip1: '구체적인 의견일수록 서비스 개선에 큰 도움이 됩니다',
    tip2: '불편했던 점이나 개선이 필요한 부분을 알려주세요',
    tip3: '작성하신 내용은 익명으로 처리됩니다',
  },
  GLOBAL: {
    screenTitle: 'Delete Account',
    pageSubtitle: 'Are you sure you want to leave?',
    infoBoxTitle: 'The following data will be permanently deleted',
    infoItems: ['All saved recipes and favorites', 'Created categories and cooking history', 'Personal account information'],
    reasonSectionTitle: 'Tell us why you\'re leaving',
    reasonSectionSubtitle: 'We\'ll make it better for when you come back',
    processing: 'Processing...',
    submitButton: 'Delete Account',
    confirmTitle: 'Delete your account?',
    confirmMessage: 'All your data will be permanently deleted.',
    cancel: 'Cancel',
    deleteAction: 'Delete',
    errorTitle: 'Error',
    errorMessage: 'Failed to delete account',
    writtenFeedback: 'Your feedback',
    modalTitle: 'Write detailed feedback',
    save: 'Save',
    selectedReason: 'Selected reason',
    feedbackLabel: 'Tell us more',
    optional: 'Optional',
    feedbackPlaceholder: 'Share specific feedback to help us improve...',
    tipTitle: 'Writing tips',
    tip1: 'The more specific, the more helpful it is for improving our service',
    tip2: 'Let us know what was frustrating or needs improvement',
    tip3: 'Your feedback will be kept anonymous',
  },
} as const;
