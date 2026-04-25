import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
import { TargetCaption } from '@/src/shared/onboarding/target-caption';

const TORY_LOGO = require('@/assets/images/tory-logo.png');

const INACTIVE_OPACITY = 0.4;

export type MockIOSShareSheetRef = {
  open: () => void;
  close: () => void;
}

type MockIOSShareSheetProps = {
  isInteractive: boolean;
  /** 쉐프토리 앱 아이콘 탭 — 유일한 path */
  onCheftoryPress: () => void;
  onWrongTap: () => void;
}

/**
 * iOS 시스템 공유 시트 mock — 단일 path (쉐프토리 앱 아이콘만).
 *
 * 변경 이력:
 *   - "Import recipe" 액션은 우리 앱 전용이 아니라 제거 (CookGo, 읽기 목록 추가도 같이 제거)
 *   - 액션 리스트 섹션 자체 제거 → 더 단순하고 쉐프토리에 집중
 *   - 사람 row의 가짜 contacts → 토리 가족(토리/토순/토똑이) 마스코트로 교체
 */
export const MockIOSShareSheet = forwardRef<MockIOSShareSheetRef, MockIOSShareSheetProps>(
  function MockIOSShareSheet({ isInteractive, onCheftoryPress, onWrongTap }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const [highlightActive, setHighlightActive] = useState(false);
    const cheftoryRef = useRef<View>(null);
    const [targetBounds, setTargetBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [pawActive, setPawActive] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    // 액션 리스트 제거로 시트 짧아짐 → 70%
    const snapPoints = useMemo(() => ['70%'], []);

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
          cheftoryRef.current?.measure?.((_x, _y, w, h, pageX, pageY) => {
            setTargetBounds({ x: pageX, y: pageY, width: w, height: h });
            setPawActive(true);
          });
        }, 50);
      } else if (index === -1) {
        setHighlightActive(false);
        setPawActive(false);
        setTargetBounds(null);
      }
    }, []);

    const handleCheftory = useCallback(() => {
      if (!isInteractive) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // 즉시 cleanup — 시트가 그대로 열려있어도 캡션/발자국은 사라져야 함
      setHighlightActive(false);
      setPawActive(false);
      setTargetBounds(null);
      onCheftoryPress();
    }, [isInteractive, onCheftoryPress]);

    const handleWrongPress = useCallback(() => {
      if (!isInteractive) return;
      onWrongTap();
    }, [isInteractive, onWrongTap]);

    useEffect(() => {
      if (!isInteractive) {
        setHighlightActive(false);
        setPawActive(false);
        setTargetBounds(null);
      }
    }, [isInteractive]);

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          enableHandlePanningGesture={false}
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: '#F2F2F7', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
          handleIndicatorStyle={{ backgroundColor: 'rgba(0,0,0,0.2)', width: 36 }}
          onChange={handleSheetChange}
        >
          <BottomSheetView style={{ flex: 1 }}>
            {/* sender info row (장식, 약화) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 14,
                opacity: isInteractive ? INACTIVE_OPACITY : 1,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#888' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#000' }}>진영 Jinyeong</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>youtube.com</Text>
              </View>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#E5E5E5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={18} color="#333" />
              </View>
            </View>

            <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.2)', marginHorizontal: 16 }} />

            {/* 사람 row — ChefTory 마스코트 가족(토리/토순/토똑이) (장식, 약화) */}
            <View
              style={{
                flexDirection: 'row',
                gap: 14,
                paddingHorizontal: 16,
                paddingVertical: 16,
                opacity: isInteractive ? INACTIVE_OPACITY : 1,
              }}
            >
              {[
                { name: 'MacBook Pro', color: '#E5E5E5', textColor: '#999' },
                { name: '토리', color: '#FF8C42', textColor: '#fff' },
                { name: '토순', color: '#F8A8B4', textColor: '#fff' },
                { name: '토똑이', color: '#D4A574', textColor: '#fff' },
              ].map((p) => (
                <Pressable
                  key={p.name}
                  onPress={handleWrongPress}
                  style={{ alignItems: 'center', gap: 4, width: 56 }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: p.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: p.textColor, fontSize: 18, fontWeight: '700' }}>
                      {p.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#000', textAlign: 'center' }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.2)', marginHorizontal: 16 }} />

            {/* 앱 아이콘 row — paddingVertical로 활성 타깃 펄스/glow 클리핑 방지 */}
            <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingVertical: 16, alignItems: 'flex-start', overflow: 'visible' }}>
              {/* 비활성 앱들 (그룹으로 약화) */}
              <View style={{ flexDirection: 'row', gap: 14, opacity: isInteractive ? INACTIVE_OPACITY : 1 }}>
                <Pressable onPress={handleWrongPress} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: '#3B82F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="radio-outline" size={26} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#000' }}>AirDrop</Text>
                </Pressable>

                <Pressable onPress={handleWrongPress} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: '#22C55E',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="chatbubble" size={26} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#000' }}>메시지</Text>
                </Pressable>

                <Pressable onPress={handleWrongPress} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: '#3B82F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="mail" size={26} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#000' }}>Mail</Text>
                </Pressable>
              </View>

              {/* 쉐프토리 — 활성 타깃 (full opacity + glow + 큰 펄스) */}
              <View ref={cheftoryRef} collapsable={false} style={{ overflow: 'visible' }}>
                <PulseScale active={isInteractive && highlightActive} withGlow>
                  <Pressable onPress={handleCheftory} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        backgroundColor: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isInteractive ? 2.5 : 0,
                        borderColor: '#FF7300',
                      }}
                    >
                      <Image source={TORY_LOGO} style={{ width: 36, height: 36 }} contentFit="contain" />
                    </View>
                    <Text style={{ fontSize: 10, color: '#000', fontWeight: isInteractive ? '700' : '400' }}>
                      쉐프토리
                    </Text>
                  </Pressable>
                </PulseScale>
              </View>
            </View>

          </BottomSheetView>
        </BottomSheet>

        {/* === Overlays — absolute, 다른 layout 영향 없음 === */}

        {/* 발자국 */}
        {targetBounds && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }} pointerEvents="none">
            <ToryPawHint
              targetX={targetBounds.x}
              targetY={targetBounds.y}
              active={pawActive}
              onComplete={() => setPawActive(false)}
              offsetX={20}
              offsetY={-32}
            />
          </View>
        )}

        {/* 캡션 — 쉐프토리 아이콘 바로 아래 */}
        {isInteractive && highlightActive && (
          <TargetCaption
            target={targetBounds}
            primary="쉐프토리를 눌러주세요"
            step={3}
            total={4}
          />
        )}
      </>
    );
  },
);
