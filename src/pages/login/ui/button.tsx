import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image, ImageSource } from "expo-image";
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from "@/src/shared/utils/responsiveUI";
import { COLORS } from "@/src/shared/constants/colors";
import { SHADOW } from "@/src/shared/constants/shadow";
import { useLogin, OauthProvider } from "@/src/entities/user";
import { trackNative } from "@/src/shared/analytics";
import { AmplitudeEvent } from "@/src/shared/analytics/amplitudeEvents";
import { setAmplitudeUserId } from "@/src/shared/analytics/amplitude";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AxiosError } from "axios";
import { create } from "zustand";
import {
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import TermsAndConditionsModalContent from "@/src/pages/login/ui/TermsAndConditionsModalContent";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Market } from "@/src/shared/types/market";
import { getErrorMessage } from "@/src/locales/errors";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_WEB_ID,
  scopes: ["profile", "email"],
  offlineAccess: false,
  forceCodeForRefreshToken: false,
  iosClientId: process.env.EXPO_PUBLIC_IOS_ID,
});

/**
 * 로그인 버튼 텍스트 관리
 * Market별 버튼 텍스트를 한 곳에서 관리
 */
const BUTTON_TEXT = {
  KOREA: {
    google: "Google로 시작하기",
    apple: "Apple로 시작하기",
  },
  GLOBAL: {
    google: "Start with Google",
    apple: "Start with Apple",
  },
} as const;

export function GoogleLoginButton({ market }: { market: Market }) {
  const { handleSignInGoogle } = useLoginWithGoogle(market);
  const description = BUTTON_TEXT[market].google;

  return (
    <>
      <LoginButtonTemplate
        logoPath={require("@/assets/images/googleLogo.png")}
        logoSize={{ width: 22, height: 24 }}
        description={description}
        handleSignIn={handleSignInGoogle}
      />
    </>
  );
}

export function AppleLoginButton({ market }: { market: Market }) {
  const { handleSignInApple } = useLoginWithApple(market);
  const description = BUTTON_TEXT[market].apple;

  return (
    <>
      <LoginButtonTemplate
        logoPath={require("@/assets/images/appleLogo.png")}
        logoSize={{ width: responsiveWidth(20), height: responsiveHeight(24) }}
        description={description}
        handleSignIn={handleSignInApple}
      />
    </>
  );
}

function useLoginWithGoogle(market: Market) {
  const { mutate: login, error } = useLogin({
    onSuccess: (data, variables) => {
      setAmplitudeUserId(data.user_info.provider_sub);
      trackNative(AmplitudeEvent.LOGIN_SUCCESS, {
        provider: variables.provider.toLowerCase(),
      });
    },
  });
  const { openModal } = useSignupModalStore();
  const [idToken, setIdToken] = useState<string | null>(null);
  async function handleSignInGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === "success") {
        const { idToken } = response.data;
        if (!idToken) {
          console.error("로그인 에러: idToken이 없습니다");
          Alert.alert(
            getErrorMessage(market, "error"),
            getErrorMessage(market, "loginFailed"),
          );
          return;
        }
        setIdToken(idToken);
        login({ id_token: idToken, provider: OauthProvider.GOOGLE });
      } else {
        Alert.alert(getErrorMessage(market, "googleError"), response.type);
      }
    } catch (err) {
      console.error("서버에 문제가 있습니다." + err);
      Alert.alert(getErrorMessage(market, "serverError") + err);
    }
  }

  useEffect(() => {
    if (isNotUserError(error) && idToken) {
      setTimeout(() => {
        openModal({ idToken: idToken, provider: OauthProvider.GOOGLE });
      }, 500);
    }
  }, [error, idToken]);

  return { handleSignInGoogle };
}

type SignupModalStore = {
  idToken: string | null;
  provider: OauthProvider | null;
  isOpen: boolean;
  openModal: ({
    idToken,
    provider,
  }: {
    idToken: string;
    provider: OauthProvider;
  }) => void;
  closeModal: () => void;
};

export const useSignupModalStore = create<SignupModalStore>((set) => ({
  idToken: null,
  provider: null,
  isOpen: false,
  openModal: ({
    idToken,
    provider,
  }: {
    idToken: string;
    provider: OauthProvider;
  }) => {
    set({ idToken: idToken, provider: provider });
    set({ isOpen: true });
  },
  closeModal: () => {
    set({ idToken: null, provider: null });
    set({ isOpen: false });
  },
}));

function isNotUserError(error: any) {
  if (
    error instanceof AxiosError &&
    error.response?.data?.errorCode === "USER_001"
  ) {
    return true;
  }
  return false;
}

function useLoginWithApple(market: Market) {
  const { mutate: login, error } = useLogin({
    onSuccess: (data, variables) => {
      setAmplitudeUserId(data.user_info.provider_sub);
      trackNative(AmplitudeEvent.LOGIN_SUCCESS, {
        provider: variables.provider.toLowerCase(),
      });
    },
  });
  const { openModal } = useSignupModalStore();
  const [idToken, setIdToken] = useState<string | null>(null);

  async function handleSignInApple() {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      Alert.alert(
        getErrorMessage(market, "error"),
        getErrorMessage(market, "appleUnavailable"),
      );
      return;
    }

    const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      // nonce/state 필요하면 여기서 넣고 서버에서 검증
    });

    if (!appleAuthRequestResponse.identityToken) {
      Alert.alert(
        getErrorMessage(market, "error"),
        getErrorMessage(market, "appleLoginFailed"),
      );
      return;
    }

    const credentialState = await AppleAuthentication.getCredentialStateAsync(
      appleAuthRequestResponse.user,
    );
    // use credentialState response to ensure the user is authenticated
    if (
      credentialState ===
        AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED ||
      credentialState ===
        AppleAuthentication.AppleAuthenticationCredentialState.TRANSFERRED
    ) {
      login({
        id_token: appleAuthRequestResponse.identityToken,
        provider: OauthProvider.APPLE,
      });
      setIdToken(appleAuthRequestResponse.identityToken);
      return;
    }
    Alert.alert(
      getErrorMessage(market, "error"),
      getErrorMessage(market, "appleLoginFailed"),
    );
  }

  useEffect(() => {
    if (isNotUserError(error) && idToken) {
      openModal({
        idToken: idToken,
        provider: OauthProvider.APPLE,
      });
    }
  }, [error, idToken]);

  return { handleSignInApple };
}

function LoginButtonTemplate({
  description,
  logoPath,
  logoSize,
  handleSignIn,
}: {
  description: string;
  logoPath: ImageSource;
  logoSize: { width: number; height: number };
  handleSignIn: () => Promise<void>;
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={handleSignIn}>
      <View style={styles.buttonContent}>
        <View style={styles.iconContainer}>
          <Image
            source={logoPath}
            style={{
              height: logoSize.height,
              aspectRatio: 1,
              resizeMode: "contain",
            }}
          />
        </View>
        <Text style={styles.buttonText}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: responsiveWidth(250),
    height: responsiveHeight(50),
    backgroundColor: COLORS.background.white,
    borderRadius: responsiveWidth(8),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: "center",
  },
  buttonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(16),
  },
  iconContainer: {
    marginRight: responsiveWidth(16),
  },
  buttonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: "700",
    color: '#111111',
    fontFamily: "NotoSerifKR_400Regular",
  },
});

export function TermsAndConditionsModal() {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { idToken, provider, closeModal } = useSignupModalStore();

  useEffect(() => {
    if (idToken && provider) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [idToken, provider]);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      pressBehavior="close"
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      onPress={() => {
        closeModal();
      }}
    />
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      // snapPoints={["70%"]}
      enableHandlePanningGesture={false}
      enableContentPanningGesture={false}
      enableDynamicSizing={true}
      animateOnMount={false}
    >
      <TermsAndConditionsModalContent />
    </BottomSheetModal>
  );
}
