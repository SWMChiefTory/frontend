import { BottomSheetView } from "@gorhom/bottom-sheet";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSignupModalStore } from "@/src/pages/login/ui/button";
import { useSignup } from "@/src/entities/user";
import { trackNative } from "@/src/shared/analytics";
import { AmplitudeEvent } from "@/src/shared/analytics/amplitudeEvents";
import { setAmplitudeUserId } from "@/src/shared/analytics/amplitude";
import useRandomName from "@/src/pages/login/model/useRandomName";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarketStore } from "@/src/shared/store/marketStore";
import { colors, spacing, radius, typography } from "@/src/shared/design/tokens";

export type AgreeValue = {
  isServiceAgree: boolean;
  isPrivacyAgree: boolean;
  isMarketingAgree: boolean;
}

const localColor = {
  text: {
    black: "#3B3B3B",
    gray: "#ADADAD",
    white: "#E6E6E6",
  },
};

const TERMS_TEXT = {
  KOREA: {
    allAgree: "전체 동의하기",
    serviceAgree: "[필수] 서비스 이용약관 동의",
    privacyAgree: "[필수] 개인정보 처리방침 동의",
    marketingAgree: "[선택] 마케팅 수신 동의",
    signup: "회원가입",
  },
  GLOBAL: {
    allAgree: "Agree to all",
    serviceAgree: "[Required] Terms of Service",
    privacyAgree: "[Required] Privacy Policy",
    marketingAgree: "[Optional] Marketing consent",
    signup: "Sign Up",
  },
} as const;

export default function TermsAndConditionsModalContent() {
  const { idToken, provider, closeModal } = useSignupModalStore();
  const { mutate: signup } = useSignup({
    onSuccess: (data, variables) => {
      setAmplitudeUserId(data.user_info.provider_sub);
      trackNative(AmplitudeEvent.SIGNUP_SUCCESS, {
        provider: variables.provider.toLowerCase(),
      });
    },
  });
  const { market, cachedMarket } = useMarketStore();
  const currentMarket = market ?? cachedMarket ?? "KOREA";
  const { nickname } = useRandomName(currentMarket === "GLOBAL" ? "en" : "ko");
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const text = TERMS_TEXT[currentMarket];
  const [agreeValue, setAgreeValue] = useState<AgreeValue>({
    isServiceAgree: false,
    isPrivacyAgree: false,
    isMarketingAgree: false,
  });

  const isServiceAgree = agreeValue.isServiceAgree;
  const isPrivacyAgree = agreeValue.isPrivacyAgree;
  const isMarketingAgree = agreeValue.isMarketingAgree;

  const handleSignupPress = () => {
    if (
      !idToken ||
      !provider ||
      !nickname ||
      !isPrivacyAgree ||
      !isServiceAgree
    ) {
      return;
    }
    // 버튼 누르자마자 모달 내리기 (onSuccess에서 처리 완료될 때까지 기다리지 않음)
    closeModal();
    signup({
      id_token: idToken,
      provider: provider,
      nickname: nickname,
      gender: null,
      date_of_birth: null,
      is_marketing_agreed: isMarketingAgree,
      is_privacy_agreed: isPrivacyAgree,
      is_terms_of_use_agreed: isServiceAgree,
    });
  };

  const allChecked = isServiceAgree && isPrivacyAgree && isMarketingAgree;
  const canSignup = isServiceAgree && isPrivacyAgree;

  return (
    <BottomSheetView
      style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.xl) }}
    >
      {/* 전체 동의 */}
      <TouchableOpacity
        onPress={() => setAgreeValue({ isServiceAgree: true, isPrivacyAgree: true, isMarketingAgree: true })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          backgroundColor: allChecked ? colors.primaryLight : colors.surface,
          borderRadius: radius.md,
          borderCurve: 'continuous',
        }}
      >
        <Ionicons name={allChecked ? 'checkbox' : 'square-outline'} size={22} color={allChecked ? colors.primary : colors.text.disabled} />
        <Text style={{ fontFamily: typography.heading.fontFamily, fontSize: 16, fontWeight: '700', color: allChecked ? colors.primary : colors.text.secondary }}>
          {text.allAgree}
        </Text>
      </TouchableOpacity>

      <View style={{ gap: spacing.xs, marginTop: spacing.lg }}>
        {/* 서비스 이용약관 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => setAgreeValue({ ...agreeValue, isServiceAgree: !isServiceAgree })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, paddingVertical: spacing.md }}
          >
            <Ionicons name={isServiceAgree ? 'checkbox' : 'square-outline'} size={20} color={isServiceAgree ? colors.primary : colors.text.disabled} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: isServiceAgree ? colors.text.primary : colors.text.secondary }}>
              {text.serviceAgree}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { closeModal(); router.push({ pathname: '/agreement/ServiceTermsAndConditions' }); }}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text.disabled} />
          </TouchableOpacity>
        </View>

        {/* 개인정보 처리방침 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => setAgreeValue({ ...agreeValue, isPrivacyAgree: !isPrivacyAgree })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, paddingVertical: spacing.md }}
          >
            <Ionicons name={isPrivacyAgree ? 'checkbox' : 'square-outline'} size={20} color={isPrivacyAgree ? colors.primary : colors.text.disabled} />
            <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: isPrivacyAgree ? colors.text.primary : colors.text.secondary }}>
              {text.privacyAgree}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { closeModal(); router.push({ pathname: '/agreement/PrivacyTermsAndConditions' }); }}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text.disabled} />
          </TouchableOpacity>
        </View>

        {/* 마케팅 수신 동의 */}
        <TouchableOpacity
          onPress={() => setAgreeValue({ ...agreeValue, isMarketingAgree: !isMarketingAgree })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}
        >
          <Ionicons name={isMarketingAgree ? 'checkbox' : 'square-outline'} size={20} color={isMarketingAgree ? colors.primary : colors.text.disabled} />
          <Text style={{ fontFamily: typography.body.fontFamily, fontSize: 14, color: isMarketingAgree ? colors.text.primary : colors.text.secondary }}>
            {text.marketingAgree}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 회원가입 버튼 */}
      <TouchableOpacity
        disabled={!canSignup}
        onPress={handleSignupPress}
        style={{
          marginTop: spacing.xl,
          paddingVertical: spacing.lg,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: canSignup ? colors.primary : colors.border,
          alignItems: 'center',
        }}
      >
        <Text style={{
          fontFamily: typography.heading.fontFamily,
          fontSize: 16,
          fontWeight: '700',
          color: canSignup ? '#fff' : colors.text.disabled,
        }}>
          {text.signup}
        </Text>
      </TouchableOpacity>
    </BottomSheetView>
  );
}
