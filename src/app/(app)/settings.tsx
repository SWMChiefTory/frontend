import { View, Text, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '@/src/shared/api/client';
import { setLanguagePreference } from '@/src/shared/storage/languagePreference';
import { useLogout } from '@/src/entities/user';
import { useBalance } from '@/src/entities/balance';
import { trackNative } from '@/src/shared/analytics';
import { AmplitudeEvent } from '@/src/shared/analytics/amplitudeEvents';
import { resetAmplitudeUser } from '@/src/shared/analytics/amplitude';
import { CreditRechargeSheet, type CreditRechargeSheetRef } from '@/src/widgets/credit-recharge/credit-recharge-sheet';
import { colors, spacing, radius, typography } from '@/src/shared/design/tokens';
import Constants from 'expo-constants';
import { useMarketStore } from '@/src/shared/store/marketStore';

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
  const market = useMarketStore(s => s.market);
  const t = TEXTS[market ?? 'KOREA'];
  const { mutate: logout } = useLogout({
    onSettled: () => {
      trackNative(AmplitudeEvent.LOGOUT);
      resetAmplitudeUser();
    },
  });
  const rechargeSheetRef = useRef<CreditRechargeSheetRef>(null);
  const { data: profile } = useUserProfile();
  const { data: balance } = useBalance();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleLogout = () => {
    Alert.alert(t.logoutTitle, t.logoutMessage, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logoutAction,
        style: 'destructive',
        onPress: () => {
          logout(undefined, {
            onSettled: () => queryClient.clear(),
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    router.push('/withdrawal');
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
            {t.screenTitle}
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
              {profile?.nickname || t.loading}
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
              {t.berryCount(balance?.balance ?? 0)}
            </Text>
          </View>
          <Pressable
            onPress={() => rechargeSheetRef.current?.open()}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radius.full,
            }}
          >
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 13, fontWeight: '600', color: '#fff' }}>
              {t.recharge}
            </Text>
          </Pressable>
        </View>

        <SectionHeader title={t.sectionLegal} />
        <SettingsItem icon="document-text-outline" label={t.privacyPolicy} onPress={() => router.push('/legal/privacy-policy')} />
        <Divider />
        <SettingsItem icon="document-outline" label={t.termsOfService} onPress={() => router.push('/legal/terms-of-service')} />

        <SectionHeader title={t.sectionApp} />
        <Pressable
          onPress={() => {
            Alert.alert(
              t.languageTitle,
              t.languageMessage,
              [
                {
                  text: '한국어',
                  onPress: async () => {
                    await setLanguagePreference('KOREA');
                    useMarketStore.getState().setMarket('KOREA', '');
                  },
                },
                {
                  text: 'English',
                  onPress: async () => {
                    await setLanguagePreference('GLOBAL');
                    useMarketStore.getState().setMarket('GLOBAL', '');
                  },
                },
                { text: t.cancel, style: 'cancel' },
              ],
            );
          }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xl }}
        >
          <Ionicons name="language-outline" size={20} color={colors.text.secondary} />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary, flex: 1, marginLeft: spacing.md }}>
            {t.language}
          </Text>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.secondary }}>
            {market === 'GLOBAL' ? 'English' : '한국어'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} style={{ marginLeft: spacing.xs }} />
        </Pressable>
        <Divider />
        <SettingsItem icon="refresh-outline" label={t.replayOnboarding} onPress={handleResetOnboarding} />
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xl }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.text.primary, flex: 1, marginLeft: spacing.md }}>
            {t.versionInfo}
          </Text>
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.text.secondary }}>
            v{appVersion}
          </Text>
        </View>

        <SectionHeader title={t.sectionOther} />
        <SettingsItem icon="chatbubble-ellipses-outline" label={t.contact} onPress={() => Linking.openURL(KAKAO_CHAT_URL)} />
        <Divider />
        <SettingsItem icon="log-out-outline" label={t.logout} onPress={handleLogout} />
        <Divider />
        <SettingsItem icon="person-remove-outline" label={t.deleteAccount} onPress={handleDeleteAccount} destructive />
      </ScrollView>

      <CreditRechargeSheet ref={rechargeSheetRef} />
    </View>
  );
}

const TEXTS = {
  KOREA: {
    screenTitle: '설정',
    loading: '로딩 중...',
    recharge: '충전',
    berryCount: (n: number) => `${n}개`,
    sectionLegal: '약관',
    privacyPolicy: '개인정보 처리방침',
    termsOfService: '서비스 이용약관',
    sectionApp: '앱 정보',
    language: '언어 설정',
    languageTitle: '언어 선택',
    languageMessage: '앱에서 사용할 언어를 선택하세요',
    replayOnboarding: '온보딩 다시 보기',
    versionInfo: '버전 정보',
    sectionOther: '기타',
    contact: '문의하기',
    logout: '로그아웃',
    deleteAccount: '회원 탈퇴',
    logoutTitle: '로그아웃',
    logoutMessage: '정말 로그아웃 하시겠어요?',
    cancel: '취소',
    logoutAction: '로그아웃',
  },
  GLOBAL: {
    screenTitle: 'Settings',
    loading: 'Loading...',
    recharge: 'Recharge',
    berryCount: (n: number) => `${n}`,
    sectionLegal: 'Legal',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    sectionApp: 'App Info',
    language: 'Language',
    languageTitle: 'Select Language',
    languageMessage: 'Choose your preferred language',
    replayOnboarding: 'Replay onboarding',
    versionInfo: 'App version',
    sectionOther: 'Other',
    contact: 'Contact us',
    logout: 'Log out',
    deleteAccount: 'Delete account',
    logoutTitle: 'Log out',
    logoutMessage: 'Are you sure you want to log out?',
    cancel: 'Cancel',
    logoutAction: 'Log out',
  },
} as const;
