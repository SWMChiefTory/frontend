import { View, Text, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '@/src/modules/shared/api/client';
import { removeAuthToken } from '@/src/modules/shared/storage/SecureStorage';
import { useUserStore } from '@/src/modules/user/business/store/userStore';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import { MOCK_BERRY_BALANCE } from '@/src/shared/data/mock';
import Constants from 'expo-constants';

const BERRY_ICON = require('@/assets/images/berry-icon.png');
const TORY_LOGO = require('@/assets/images/tory-logo.png');
const KAKAO_CHAT_URL = 'https://open.kakao.com/o/sXzywB7h';

function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await client.get('/users/me');
      const d = res.data;
      return {
        nickname: d.nickname ?? d.nick_name ?? '',
        tag: d.tag ?? '',
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const res = await client.get('/users/me/balance');
      return res.data?.balance ?? res.data?.berry_balance ?? 0;
    },
    staleTime: 2 * 60 * 1000,
  });
}

function SettingsItem({ icon, label, onPress, color, destructive }: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
      }}
    >
      <Ionicons name={icon as any} size={20} color={destructive ? colors.semantic.error : (color ?? colors.text.secondary)} />
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: 16,
          color: destructive ? colors.semantic.error : colors.text.primary,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl }} />;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontFamily: typography.body.fontFamily,
        fontSize: 13,
        fontWeight: '600',
        color: colors.text.disabled,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.sm,
      }}
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { removeUser } = useUserStore();
  const { data: profile } = useUserProfile();
  const { data: balance } = useBalance();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await removeAuthToken();
          removeUser();
          queryClient.clear();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 모든 레시피와 데이터가 삭제됩니다.\n정말 탈퇴하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete('/users/me');
              await removeAuthToken();
              removeUser();
              queryClient.clear();
              router.replace('/');
            } catch {
              Alert.alert('오류', '탈퇴 처리에 실패했어요');
            }
          },
        },
      ],
    );
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem('onboarding_completed');
    router.replace('/onboarding');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, height: 48 }}>
          <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 18, fontWeight: '700', color: colors.text.primary, flex: 1, textAlign: 'center' }}>
            설정
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* 프로필 */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
          <Image source={TORY_LOGO} style={{ width: 72, height: 72 }} contentFit="contain" />
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
              {profile?.nickname || '로딩 중...'}
            </Text>
            {profile?.tag ? (
              <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.secondary }}>
                #{profile.tag}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 베리 잔액 */}
        <View style={{ marginHorizontal: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Image source={BERRY_ICON} style={{ width: 24, height: 24 }} contentFit="contain" />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
              {balance ?? MOCK_BERRY_BALANCE}개
            </Text>
          </View>
          <Pressable
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radius.full,
            }}
          >
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, fontWeight: '600', color: '#fff' }}>
              충전
            </Text>
          </Pressable>
        </View>

        <SectionHeader title="약관" />
        <SettingsItem icon="document-text-outline" label="개인정보 처리방침" onPress={() => Alert.alert('개인정보 처리방침')} />
        <Divider />
        <SettingsItem icon="document-outline" label="서비스 이용약관" onPress={() => Alert.alert('서비스 이용약관')} />

        <SectionHeader title="앱 정보" />
        <SettingsItem icon="refresh-outline" label="온보딩 다시 보기" onPress={handleResetOnboarding} />
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xl }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary, flex: 1, marginLeft: spacing.md }}>
            버전 정보
          </Text>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.secondary }}>
            v{appVersion}
          </Text>
        </View>

        <SectionHeader title="기타" />
        <SettingsItem icon="chatbubble-ellipses-outline" label="문의하기" onPress={() => Linking.openURL(KAKAO_CHAT_URL)} />
        <Divider />
        <SettingsItem icon="log-out-outline" label="로그아웃" onPress={handleLogout} />
        <Divider />
        <SettingsItem icon="person-remove-outline" label="회원 탈퇴" onPress={handleDeleteAccount} destructive />
      </ScrollView>
    </View>
  );
}
