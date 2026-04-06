import { ScrollView, View, Alert, Modal, Text, Pressable } from 'react-native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { HomeHeader } from '@/src/pages/home/components/home-header';
import { FeatureCards } from '@/src/pages/home/components/feature-cards';
import { ThemeCardsSection, RecipeListSection } from '@/src/pages/home/components/recipe-section';
import { colors, spacing, radius } from '@/src/shared/design/tokens';
import {
  MOCK_THEME_CARDS,
  MOCK_HOT_RECIPES,
  MOCK_RECENT_RECIPES,
} from '@/src/shared/data/mock';

export function HomeScreen() {
  const [lockedModal, setLockedModal] = useState<string | null>(null);

  const handleBerryPress = useCallback(() => {
    Alert.alert('베리', '베리 잔액: 32');
  }, []);

  const handleSearchPress = useCallback(() => {
    Alert.alert('검색', '검색 화면(웹뷰)으로 이동');
  }, []);

  const handleSettingsPress = useCallback(() => {
    Alert.alert('설정', '설정 화면(웹뷰)으로 이동');
  }, []);

  const handleCreatePress = useCallback(() => {
    Alert.alert('레시피 생성', '레시피 생성 바텀시트');
  }, []);

  const handleLockedPress = useCallback((feature: string) => {
    setLockedModal(feature);
  }, []);

  const handleThemePress = useCallback((card: any) => {
    Alert.alert(card.title, '테마 레시피 페이지(웹뷰)로 이동');
  }, []);

  const handleRecipePress = useCallback((recipe: any) => {
    Alert.alert(recipe.title, 'Recipe Detail(네이티브)로 이동');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 고정 헤더 영역 (베리+검색+기능카드) */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingBottom: spacing.lg,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
          zIndex: 1,
        }}
      >
        <HomeHeader
          onBerryPress={handleBerryPress}
          onSearchPress={handleSearchPress}
          onSettingsPress={handleSettingsPress}
        />
        <FeatureCards
          onCreatePress={handleCreatePress}
          onLockedPress={handleLockedPress}
        />
      </View>

      {/* 스크롤 콘텐츠 영역 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.xxl, gap: spacing.xxl }}
      >
          <ThemeCardsSection
            cards={MOCK_THEME_CARDS}
            onPress={handleThemePress}
          />

          <RecipeListSection
            title="지금 핫한 레시피"
            icon="🔥"
            recipes={MOCK_HOT_RECIPES}
            onPress={handleRecipePress}
          />

          <RecipeListSection
            title="최근 시청 레시피"
            recipes={MOCK_RECENT_RECIPES}
            onPress={handleRecipePress}
          />
      </ScrollView>

      {/* 잠금 기능 모달 */}
      <Modal visible={!!lockedModal} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setLockedModal(null)}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.xl,
              padding: spacing.xxl,
              width: 280,
              alignItems: 'center',
              gap: spacing.lg,
              borderCurve: 'continuous',
            }}
          >
            <Ionicons name="lock-closed" size={40} color={colors.text.disabled} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
              준비 중이에요
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, textAlign: 'center' }}>
              {lockedModal} 기능이{'\n'}곧 출시될 예정이에요!
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>
              이 기능이 필요하신가요?
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable
                onPress={() => {
                  Alert.alert('감사합니다!', '추천이 반영되었습니다.');
                  setLockedModal(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                  👍 필요해
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLockedModal(null)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>
                  👎 괜찮아
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
