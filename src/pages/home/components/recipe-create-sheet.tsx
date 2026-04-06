import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, Linking } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { client } from '@/src/modules/shared/api/client';
import { MOCK_BERRY_BALANCE } from '@/src/shared/data/mock';

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
  open: () => void;
  close: () => void;
}

export const RecipeCreateSheet = forwardRef<RecipeCreateSheetRef>((_props, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.expand(),
    close: () => {
      sheetRef.current?.close();
      setUrl('');
      setError(null);
    },
  }));

  const videoId = extractVideoId(url);
  const isValid = !!videoId;

  const handleSubmit = useCallback(async () => {
    if (!videoId) return;

    setLoading(true);
    setError(null);

    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const res = await client.post('/recipes', { video_url: videoUrl });
      const recipeId = res.data?.recipe_id ?? res.data?.recipeId;

      setLoading(false);
      sheetRef.current?.close();
      setUrl('');
      Alert.alert('레시피 생성 완료!', `레시피가 생성되었어요. 잠시 후 확인할 수 있습니다.`);
    } catch (err: any) {
      setLoading(false);
      const msg = err?.response?.data?.message ?? err?.message ?? '레시피 생성에 실패했어요';
      setError(msg);
    }
  }, [videoId]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['55%']}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{ borderRadius: radius.xl }}
    >
      <BottomSheetView style={{ padding: spacing.xl, gap: spacing.lg, flex: 1 }}>
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
            레시피 생성
          </Text>
          <Pressable onPress={() => sheetRef.current?.close()}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </Pressable>
        </View>

        {/* URL 입력 */}
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={url}
            onChangeText={(text) => { setUrl(text); setError(null); }}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: 15,
              color: colors.text.primary,
              borderWidth: 1,
              borderColor: error ? colors.semantic.error : (isValid ? colors.primary : colors.border),
              borderRadius: radius.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              backgroundColor: colors.background,
            }}
          />
          {error && (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.semantic.error }}>
              {error}
            </Text>
          )}
          {url.length > 0 && !isValid && !error && (
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.disabled }}>
              유효한 YouTube URL을 입력해주세요
            </Text>
          )}
        </View>

        {/* YouTube 검색 링크 */}
        <Pressable
          onPress={() => Linking.openURL('https://www.youtube.com')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
            URL을 모르시나요?
          </Text>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: '#FF0000', fontWeight: '600' }}>
            YouTube에서 검색
          </Text>
        </Pressable>

        {/* 베리 비용 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.secondary }}>
            등록 시 1 베리가 소모됩니다
          </Text>
          <Image source={BERRY_ICON} style={{ width: 16, height: 16 }} contentFit="contain" />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.primary, fontWeight: '600' }}>
            {MOCK_BERRY_BALANCE}
          </Text>
        </View>

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
            marginTop: 'auto',
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
