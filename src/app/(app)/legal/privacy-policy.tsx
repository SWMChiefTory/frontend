import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrivacyTermsAndConditionsPage from '@/src/pages/privacy-terms-and-condition/PrivacyTermsAndCondition';
import { colors, typography } from '@/src/shared/design/tokens';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          paddingTop: insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          height: insets.top + 48,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: '#fff',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: typography.heading.fontFamily,
            fontSize: 16,
            fontWeight: '700',
            color: colors.text.primary,
            marginRight: 40,
          }}
        >
          개인정보 처리방침
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <PrivacyTermsAndConditionsPage />
      </View>
    </View>
  );
}
