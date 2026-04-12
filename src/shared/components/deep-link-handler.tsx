import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useDeepLinkStore, type DeepLinkIntent } from '@/src/shared/store/deep-link-store';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';

/**
 * 전역 딥링크 확인 모달 (cooking/detail).
 * _layout.tsx에 배치하여 어떤 화면에서든 동작.
 * share 타입은 무시 — index.tsx의 ShareDeepLinkHandler가 처리.
 */
export function DeepLinkHandler() {
  const pending = useDeepLinkStore((s) => s.pending);
  const consume = useDeepLinkStore((s) => s.consume);
  const pathname = usePathname();
  const sheetRef = useRef<BottomSheet>(null);
  const pendingRef = useRef<DeepLinkIntent | null>(null);

  useEffect(() => {
    if (!pending || pending.type === 'share') return;

    console.log('[DeepLink] pathname:', pathname, 'pending:', pending.type, (pending as any).recipeId);

    // 중복 체크: 이미 같은 화면에 있으면 무시
    if (isDuplicate(pending, pathname)) {
      console.log('[DeepLink] duplicate, ignoring');
      consume();
      return;
    }

    // cooking/detail → 확인 모달 표시
    pendingRef.current = pending;
    const timer = setTimeout(() => {
      sheetRef.current?.expand();
    }, 800);
    return () => clearTimeout(timer);
  }, [pending, pathname, consume]);

  const handleConfirm = useCallback(() => {
    const intent = pendingRef.current;
    if (!intent || intent.type === 'share') return;

    sheetRef.current?.close();
    consume();

    setTimeout(() => {
      if (intent.type === 'cooking') {
        router.push(`/native-step/${intent.recipeId}`);
      } else {
        router.push(`/recipe/${intent.recipeId}`);
      }
    }, 200);
  }, [consume]);

  const handleCancel = useCallback(() => {
    sheetRef.current?.close();
    consume();
    pendingRef.current = null;
  }, [consume]);

  const intent = pendingRef.current ?? pending;
  if (!intent || intent.type === 'share') return null;

  const config = INTENT_CONFIG[intent.type];

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      onChange={(index) => {
        if (index === -1) {
          pendingRef.current = null;
        }
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} onPress={handleCancel} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{ borderRadius: radius.xl }}
    >
      <BottomSheetView style={{ padding: spacing.xl, gap: spacing.lg, alignItems: 'center' }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={config.icon as any} size={28} color={colors.primary} />
        </View>

        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: typography.heading.fontFamily,
              fontSize: 18,
              fontWeight: '700',
              color: colors.text.primary,
              textAlign: 'center',
            }}
          >
            {config.title}
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 14,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            {config.description}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%' }}>
          <Pressable
            onPress={handleCancel}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 15,
                fontWeight: '600',
                color: colors.text.secondary,
              }}
            >
              취소
            </Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              alignItems: 'center',
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: 15,
                fontWeight: '600',
                color: '#fff',
              }}
            >
              이동하기
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

/**
 * share 딥링크 처리 (index.tsx에서 사용).
 * RecipeCreateSheet를 열기.
 */
export function ShareDeepLinkHandler({ createSheetRef }: {
  createSheetRef: React.RefObject<{ open: (url?: string) => void } | null>;
}) {
  const pending = useDeepLinkStore((s) => s.pending);
  const consume = useDeepLinkStore((s) => s.consume);

  useEffect(() => {
    if (!pending || pending.type !== 'share') return;

    const timer = setTimeout(() => {
      createSheetRef?.current?.open(pending.videoUrl);
      consume();
    }, 800);
    return () => clearTimeout(timer);
  }, [pending, consume, createSheetRef]);

  return null;
}

function isDuplicate(intent: DeepLinkIntent, pathname: string): boolean {
  if (intent.type === 'cooking') {
    return pathname === `/native-step/${intent.recipeId}`;
  }
  if (intent.type === 'detail') {
    return pathname === `/recipe/${intent.recipeId}`;
  }
  return false;
}

const INTENT_CONFIG = {
  cooking: {
    icon: 'mic',
    title: '요리 모드로 이동할까요?',
    description: '타이머에 해당하는 레시피의 요리 모드로 이동합니다.',
  },
  detail: {
    icon: 'document-text',
    title: '레시피로 이동할까요?',
    description: '레시피 상세 화면으로 이동합니다.',
  },
} as const;
