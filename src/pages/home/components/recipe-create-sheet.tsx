import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Linking, Keyboard, ScrollView, Platform } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { client } from '@/src/shared/api/client';
import { useBalance } from '@/src/entities/balance';
import { useCategories, useCreateRecipe } from '@/src/entities/recipe';
import { useRecipeCreateStore } from '@/src/pages/home/model/recipe-create-store';
import * as Haptics from 'expo-haptics';
import { track, RecipeCreateEvents } from '@/src/shared/analytics';

const BERRY_ICON = require('@/assets/images/berry-icon.png');

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
  /youtu\.be\/([a-zA-Z0-9_-]+)/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
  /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
];

function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export interface RecipeCreateSheetRef {
  open: (initialUrl?: string) => void;
  close: () => void;
}

export const RecipeCreateSheet = forwardRef<RecipeCreateSheetRef>((_props, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const entryPointRef = useRef<'home' | 'external_share' | 'deep_link'>('home');
  const { data: categories } = useCategories();
  const { data: balance } = useBalance();
  const addCreating = useRecipeCreateStore((s) => s.addCreating);
  const { mutateAsync: createRecipeAsync } = useCreateRecipe();

  useImperativeHandle(ref, () => ({
    open: (initialUrl?: string) => {
      if (initialUrl) setUrl(initialUrl);
      const entryPoint: 'home' | 'external_share' = initialUrl ? 'external_share' : 'home';
      entryPointRef.current = entryPoint;
      sheetRef.current?.expand();
      track(RecipeCreateEvents.START_URL, {
        entry_point: entryPoint,
        has_prefilled_url: !!initialUrl,
        is_from_share: !!initialUrl,
      });
    },
    close: () => {
      sheetRef.current?.close();
      setUrl('');
      setError(null);
      setSelectedCategoryId(null);
    },
  }));

  const videoId = extractVideoId(url);
  const isValid = !!videoId;

  const handleSubmit = useCallback(async () => {
    if (!videoId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    track(RecipeCreateEvents.SUBMIT_URL, {
      entry_point: entryPointRef.current,
      has_target_category: !!selectedCategoryId,
      target_category_id: selectedCategoryId ?? undefined,
      video_url: videoUrl,
      video_id: videoId,
    });

    try {
      const recipeId = await createRecipeAsync(videoUrl);
      track(RecipeCreateEvents.SUCCESS_URL, {
        entry_point: entryPointRef.current,
        recipe_id: String(recipeId ?? ''),
        has_target_category: !!selectedCategoryId,
        video_url: videoUrl,
        video_id: videoId,
      });

      // 카테고리 선택했으면 등록
      if (selectedCategoryId && recipeId) {
        try {
          await client.put(`/recipes/${recipeId}/categories`, { category_id: selectedCategoryId });
        } catch {}
      }

      // 생성 중 목록에 추가 → 홈에서 progress 표시
      addCreating(recipeId, videoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setLoading(false);
      sheetRef.current?.close();
      setUrl('');
      setSelectedCategoryId(null);
    } catch (err: any) {
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.response?.data?.message ?? err?.message ?? '레시피 생성에 실패했어요';
      const errorType = err?.response?.data?.errorCode ?? err?.name ?? 'unknown_error';
      track(RecipeCreateEvents.FAIL_URL, {
        entry_point: entryPointRef.current,
        error_type: String(errorType),
        error_message: msg,
        video_url: videoUrl,
        video_id: videoId,
      });
      setError(msg);
    }
  }, [videoId, selectedCategoryId, createRecipeAsync, addCreating]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={(index) => {
        if (index === -1) {
          Keyboard.dismiss();
          // 닫힐 때 입력 상태 초기화 (제스처/백드롭/명시적 close 모두 포함)
          setUrl('');
          setError(null);
          setSelectedCategoryId(null);
        }
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{ borderRadius: radius.xl }}
    >
      <BottomSheetView style={{ padding: spacing.xl, gap: spacing.md }}>
        {/* 제목 */}
        <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
          레시피 등록하기
        </Text>

        {/* 베리 비용 */}
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
            등록 시 1 베리가 소모됩니다
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Image source={BERRY_ICON} style={{ width: 16, height: 16 }} contentFit="contain" />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.primary, fontWeight: '600' }}>
              보유 {balance?.balance ?? 0}개
            </Text>
          </View>
        </View>

        {/* URL 입력 + YouTube 칩 */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <BottomSheetTextInput
                value={url}
                onChangeText={(text) => { setUrl(text); setError(null); }}
                placeholder="YouTube URL 붙여넣기"
                placeholderTextColor={colors.text.disabled}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: 14,
                  color: colors.text.primary,
                  borderWidth: 1,
                  borderColor: error ? colors.semantic.error : (isValid ? colors.primary : colors.border),
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  backgroundColor: colors.background,
                }}
              />
            </View>
            <Pressable
              onPress={async () => {
                const youtubeAppUrl = Platform.select({
                  ios: 'youtube://',
                  android: 'vnd.youtube://',
                }) as string;
                try {
                  const canOpen = await Linking.canOpenURL(youtubeAppUrl);
                  if (canOpen) {
                    await Linking.openURL(youtubeAppUrl);
                  } else {
                    await Linking.openURL('https://www.youtube.com');
                  }
                } catch {
                  await Linking.openURL('https://www.youtube.com');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#FF0000',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
              }}
            >
              <Ionicons name="logo-youtube" size={14} color="#fff" />
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, fontWeight: '600', color: '#fff' }}>
                검색
              </Text>
            </Pressable>
          </View>
          {error && (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.semantic.error }}>
              {error}
            </Text>
          )}
        </View>

        {/* 카테고리 선택 */}
        {categories && categories.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
              카테고리 (선택)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.categoryId;
                return (
                  <Pressable
                    key={cat.categoryId}
                    onPress={() => setSelectedCategoryId(isSelected ? null : cat.categoryId)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: radius.full,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: isSelected ? '#fff' : colors.text.primary }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 생성 버튼 */}
        <Pressable
          onPress={handleSubmit}
          disabled={!isValid || loading}
          style={{
            backgroundColor: isValid && !loading ? colors.primary : colors.border,
            borderRadius: radius.lg,
            paddingVertical: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: spacing.sm,
            borderCurve: 'continuous',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: '#fff' }}>
              생성하기
            </Text>
          )}
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
});
