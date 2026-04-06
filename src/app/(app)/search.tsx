import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import {
  fetchAutocomplete,
  fetchSearchHistories,
  deleteSearchHistory,
  deleteAllSearchHistories,
  searchRecipes,
} from '@/src/entities/recipe/api/search-api';
import { fetchRecommendRecipes, RecommendType } from '@/src/entities/recipe/api/recommend-api';

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const debouncedInput = useDebounce(input, 300);

  const { data: autocomplete } = useQuery({
    queryKey: ['autocomplete', debouncedInput],
    queryFn: () => fetchAutocomplete(debouncedInput),
    enabled: debouncedInput.trim().length > 0 && !submittedQuery,
    staleTime: 30_000,
  });

  const { data: histories } = useQuery({
    queryKey: ['searchHistories'],
    queryFn: fetchSearchHistories,
    staleTime: 5 * 60_000,
  });

  const { data: trendingData } = useQuery({
    queryKey: ['trendingForSearch'],
    queryFn: () => fetchRecommendRecipes(RecommendType.TRENDING),
    staleTime: 5 * 60_000,
  });

  const popularKeywords = [
    '제육볶음', '파스타', '김치찌개', '계란덮밥',
    '알리오 올리오', '볶음밥', '떡볶이', '미역국',
  ];

  const { data: results, isLoading: searchLoading } = useQuery({
    queryKey: ['searchRecipes', submittedQuery],
    queryFn: () => searchRecipes(submittedQuery),
    enabled: submittedQuery.trim().length > 0,
  });

  const handleSubmit = useCallback((query: string) => {
    if (!query.trim()) return;
    setInput(query);
    setSubmittedQuery(query);
    queryClient.invalidateQueries({ queryKey: ['searchHistories'] });
  }, [queryClient]);

  const handleClear = useCallback(() => {
    setInput('');
    setSubmittedQuery('');
  }, []);

  const handleDeleteHistory = useCallback(async (text: string) => {
    await deleteSearchHistory(text);
    queryClient.invalidateQueries({ queryKey: ['searchHistories'] });
  }, [queryClient]);

  const handleDeleteAllHistory = useCallback(async () => {
    await deleteAllSearchHistories();
    queryClient.invalidateQueries({ queryKey: ['searchHistories'] });
  }, [queryClient]);

  const showAutocomplete = input.trim().length > 0 && !submittedQuery && autocomplete && autocomplete.length > 0;
  const showResults = submittedQuery.trim().length > 0;
  const showDefault = !showAutocomplete && !showResults;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 — 검색바 */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, height: 52 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.background,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              height: 40,
            }}
          >
            <Ionicons name="search-outline" size={18} color={colors.text.disabled} />
            <TextInput
              value={input}
              onChangeText={(t) => { setInput(t); setSubmittedQuery(''); }}
              placeholder="레시피를 검색하세요"
              placeholderTextColor={colors.text.disabled}
              returnKeyType="search"
              onSubmitEditing={() => handleSubmit(input)}
              autoFocus
              style={{
                flex: 1,
                fontFamily: typography.body.fontFamily,
                fontSize: 15,
                color: colors.text.primary,
                marginLeft: spacing.sm,
                paddingVertical: 0,
              }}
            />
            {input.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.text.disabled} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* 자동완성 드롭다운 */}
      {showAutocomplete && (
        <View style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {autocomplete.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => handleSubmit(item.text)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}
            >
              <Ionicons name="search-outline" size={16} color={colors.text.disabled} />
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, color: colors.text.primary }}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 기본 화면 — 최근 검색 */}
      {showDefault && (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.xl }}>
          {histories && histories.length > 0 && (
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl }}>
                <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                  최근 검색어
                </Text>
                <Pressable onPress={handleDeleteAllHistory}>
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.disabled }}>
                    전체 삭제
                  </Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
                {histories.map((h, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleSubmit(h.text)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: colors.surface,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.full,
                    }}
                  >
                    <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.primary }} numberOfLines={1}>
                      {h.text.length > 10 ? h.text.slice(0, 10) + '...' : h.text}
                    </Text>
                    <Pressable onPress={() => handleDeleteHistory(h.text)} hitSlop={4}>
                      <Ionicons name="close" size={14} color={colors.text.disabled} />
                    </Pressable>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 인기 검색어 */}
          <View style={{ gap: spacing.md, paddingTop: spacing.xl }}>
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: colors.text.primary, paddingHorizontal: spacing.xl }}>
              인기 검색어
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xl }}>
              {popularKeywords.map((kw, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleSubmit(kw)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    backgroundColor: colors.surface,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.full,
                  }}
                >
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, fontWeight: '700', color: colors.primary }}>
                    {i + 1}
                  </Text>
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.text.primary }}>
                    {kw}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 트렌딩 레시피 */}
          {trendingData && trendingData.data.length > 0 && (
            <View style={{ gap: spacing.md, paddingTop: spacing.xl }}>
              <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: colors.text.primary, paddingHorizontal: spacing.xl }}>
                지금 뜨는 레시피
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
                {trendingData.data.slice(0, 8).map((r) => (
                  <Pressable
                    key={r.recipeId}
                    onPress={() => router.push(`/recipe/${r.recipeId}`)}
                    style={{ width: 140, gap: spacing.sm }}
                  >
                    <Image
                      source={{ uri: r.videoThumbnailUrl }}
                      style={{ width: 140, height: 90, borderRadius: radius.md, backgroundColor: colors.surface }}
                      contentFit="cover"
                    />
                    <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, fontWeight: '500', color: colors.text.primary }} numberOfLines={2}>
                      {r.recipeTitle}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}

      {/* 검색 결과 */}
      {showResults && (
        searchLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : results && results.data.length > 0 ? (
          <FlatList
            data={results.data}
            keyExtractor={(item) => item.recipeId}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/recipe/${item.recipeId}`)}
                style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm }}
              >
                <Image
                  source={{ uri: item.videoThumbnailUrl }}
                  style={{ width: 100, height: 70, borderRadius: radius.md, backgroundColor: colors.surface }}
                  contentFit="cover"
                />
                <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xs }}>
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, fontWeight: '600', color: colors.text.primary }} numberOfLines={2}>
                    {item.recipeTitle}
                  </Text>
                  <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.text.secondary }}>
                    {item.channelTitle} {item.cookingTime ? `· ${item.cookingTime}분` : ''}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md }}>
            <Ionicons name="search-outline" size={40} color={colors.text.disabled} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 15, color: colors.text.disabled }}>
              검색 결과가 없어요
            </Text>
          </View>
        )
      )}
    </View>
  );
}
