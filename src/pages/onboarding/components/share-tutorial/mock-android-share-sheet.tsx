import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { PulseScale } from '@/src/shared/onboarding/pulse-scale';
import { ToryPawHint } from '@/src/shared/onboarding/tory-paw-hint';

const TORY_LOGO = require('@/assets/images/tory-logo.png');

/** iOS sheet과 동일 API */
export type MockAndroidShareSheetRef = {
  open: () => void;
  close: () => void;
}

type MockAndroidShareSheetProps = {
  isInteractive: boolean;
  onCheftoryPress: () => void;
  onWrongTap: () => void;
}

/**
 * Android 시스템 공유 시트 mock.
 *
 * iOS와 다른 점:
 *   - sender info row 없음
 *   - 사람 row 없음
 *   - **action list 없음** — 앱 격자만
 *   - 단일 path: 쉐프토리 앱만 활성 타깃 (sequential discovery 불필요)
 */
export const MockAndroidShareSheet = forwardRef<MockAndroidShareSheetRef, MockAndroidShareSheetProps>(
  function MockAndroidShareSheet({ isInteractive, onCheftoryPress, onWrongTap }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const [highlightActive, setHighlightActive] = useState(false);
    const cheftoryRef = useRef<View>(null);
    const [pawTarget, setPawTarget] = useState<{ x: number; y: number } | null>(null);
    const [pawActive, setPawActive] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    const snapPoints = useMemo(() => ['65%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior="none"
        />
      ),
      [],
    );

    const handleSheetChange = useCallback((index: number) => {
      if (index === 0) {
        setHighlightActive(true);
        setTimeout(() => {
          cheftoryRef.current?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
            setPawTarget({ x: pageX, y: pageY });
            setPawActive(true);
          });
        }, 200);
      } else if (index === -1) {
        setHighlightActive(false);
        setPawActive(false);
      }
    }, []);

    const handleCheftory = useCallback(() => {
      if (!isInteractive) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onCheftoryPress();
    }, [isInteractive, onCheftoryPress]);

    const handleWrongPress = useCallback(() => {
      if (!isInteractive) return;
      onWrongTap();
    }, [isInteractive, onWrongTap]);

    // 8개 앱 (4x2 grid) — 마지막이 쉐프토리
    const apps = [
      { name: 'Gmail', color: '#EA4335' },
      { name: 'Messages', color: '#22C55E' },
      { name: 'WhatsApp', color: '#25D366' },
      { name: 'Drive', color: '#1FB95B' },
      { name: 'KakaoTalk', color: '#FFE812' },
      { name: 'Slack', color: '#4A154B' },
      { name: 'Telegram', color: '#0088CC' },
    ];

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          enableHandlePanningGesture={false}
          enableContentPanningGesture={false}
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          handleIndicatorStyle={{ backgroundColor: 'rgba(0,0,0,0.2)', width: 36 }}
          onChange={handleSheetChange}
        >
          <BottomSheetView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
            {/* 제목 */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', paddingVertical: 8 }}>
              공유 대상
            </Text>

            {/* 앱 격자 — 4 cols × 2 rows */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingTop: 8,
              }}
            >
              {apps.map((app) => (
                <Pressable
                  key={app.name}
                  onPress={handleWrongPress}
                  style={{ width: '25%', alignItems: 'center', gap: 6, paddingVertical: 12 }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: app.color,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: '#000', textAlign: 'center' }} numberOfLines={1}>
                    {app.name}
                  </Text>
                </Pressable>
              ))}

              {/* 쉐프토리 — 활성 타깃 */}
              <View ref={cheftoryRef} collapsable={false} style={{ width: '25%' }}>
                <PulseScale active={isInteractive && highlightActive}>
                  <Pressable
                    onPress={handleCheftory}
                    style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isInteractive ? 2 : 1,
                        borderColor: isInteractive ? '#FF7300' : '#E5E5E5',
                      }}
                    >
                      <Image source={TORY_LOGO} style={{ width: 38, height: 38 }} contentFit="contain" />
                    </View>
                    <Text style={{ fontSize: 11, color: '#000', fontWeight: isInteractive ? '700' : '400' }}>
                      쉐프토리
                    </Text>
                  </Pressable>
                </PulseScale>
              </View>
            </View>
          </BottomSheetView>
        </BottomSheet>

        {pawTarget && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }} pointerEvents="none">
            <ToryPawHint
              targetX={pawTarget.x}
              targetY={pawTarget.y}
              active={pawActive}
              onComplete={() => setPawActive(false)}
              offsetX={20}
              offsetY={-32}
            />
          </View>
        )}
      </>
    );
  },
);
