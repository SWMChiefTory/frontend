import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { PulseScale } from '@/src/shared/onboarding/pulse-scale';
import { ToryPawHint } from '@/src/shared/onboarding/tory-paw-hint';

const TORY_LOGO = require('@/assets/images/tory-logo.png');

export type MockIOSShareSheetRef = {
  open: () => void;
  close: () => void;
}

type MockIOSShareSheetProps = {
  isInteractive: boolean;
  /** 쉐프토리 앱 아이콘 탭 */
  onCheftoryPress: () => void;
  /** action list "Import recipe" 탭 */
  onActionPress: () => void;
  onWrongTap: () => void;
}

const SECONDARY_REVEAL_DELAY = 5000; // 5초 후 자동으로 secondary path 노출
const SCROLL_REVEAL_THRESHOLD = 80;  // 이만큼 스크롤하면 즉시 노출

/**
 * iOS 시스템 공유 시트 mock.
 *
 * Sequential Discovery 패턴:
 *   - 처음엔 쉐프토리 앱 아이콘만 highlight (primary path)
 *   - 5초 경과 OR 사용자가 80px 이상 스크롤 → action list "Import recipe"도 highlight (secondary path)
 *   - 두 path 모두 활성 — 어느 쪽 탭하든 다음 phase로
 *
 * BottomSheetScrollView로 스크롤 + onScroll로 사용자 행동 감지.
 */
export const MockIOSShareSheet = forwardRef<MockIOSShareSheetRef, MockIOSShareSheetProps>(
  function MockIOSShareSheet({ isInteractive, onCheftoryPress, onActionPress, onWrongTap }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const [highlightActive, setHighlightActive] = useState(false);
    const [secondaryActive, setSecondaryActive] = useState(false);

    // primary (쉐프토리 앱 아이콘) paw
    const cheftoryRef = useRef<View>(null);
    const [cheftoryPaw, setCheftoryPaw] = useState<{ x: number; y: number } | null>(null);
    const [cheftoryPawActive, setCheftoryPawActive] = useState(false);

    // secondary (Import recipe action) paw
    const actionRef = useRef<View>(null);
    const [actionPaw, setActionPaw] = useState<{ x: number; y: number } | null>(null);
    const [actionPawActive, setActionPawActive] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    const snapPoints = useMemo(() => ['85%'], []);

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
            setCheftoryPaw({ x: pageX, y: pageY });
            setCheftoryPawActive(true);
          });
        }, 200);
      } else if (index === -1) {
        setHighlightActive(false);
        setSecondaryActive(false);
        setCheftoryPawActive(false);
        setActionPawActive(false);
      }
    }, []);

    // 5초 후 secondary 자동 노출
    useEffect(() => {
      if (!isInteractive || !highlightActive) return;
      const t = setTimeout(() => {
        setSecondaryActive(true);
      }, SECONDARY_REVEAL_DELAY);
      return () => clearTimeout(t);
    }, [isInteractive, highlightActive]);

    // secondary 활성화되면 action 위치 measure + paw
    useEffect(() => {
      if (!secondaryActive) {
        setActionPawActive(false);
        return;
      }
      setTimeout(() => {
        actionRef.current?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
          setActionPaw({ x: pageX, y: pageY });
          setActionPawActive(true);
        });
      }, 200);
    }, [secondaryActive]);

    // 스크롤 감지 → secondary 즉시 노출
    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y > SCROLL_REVEAL_THRESHOLD && !secondaryActive) {
        setSecondaryActive(true);
      }
    }, [secondaryActive]);

    const handleCheftory = useCallback(() => {
      if (!isInteractive) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onCheftoryPress();
    }, [isInteractive, onCheftoryPress]);

    const handleAction = useCallback(() => {
      if (!isInteractive) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onActionPress();
    }, [isInteractive, onActionPress]);

    const handleWrongPress = useCallback(() => {
      if (!isInteractive) return;
      onWrongTap();
    }, [isInteractive, onWrongTap]);

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
          <BottomSheetScrollView
            onScroll={handleScroll}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* sender info row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 14,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: '#888',
                }}
              />
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

            {/* 구분선 */}
            <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.2)', marginHorizontal: 16 }} />

            {/* 사람 row (장식) */}
            <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}>
              {[
                { name: 'MacBook Pro', color: '#E5E5E5' },
                { name: '카멜', color: '#D4A574' },
                { name: '커피챗', color: '#A8B5D9' },
                { name: '황교준', color: '#A8B5D9' },
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
                    }}
                  />
                  <Text style={{ fontSize: 10, color: '#000', textAlign: 'center' }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 0.5, backgroundColor: 'rgba(60,60,67,0.2)', marginHorizontal: 16 }} />

            {/* 앱 아이콘 row — 쉐프토리는 활성 타깃 */}
            <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingVertical: 16 }}>
              {/* AirDrop */}
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

              {/* 메시지 */}
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

              {/* Mail */}
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

              {/* 쉐프토리 — 타깃 */}
              <View ref={cheftoryRef} collapsable={false}>
                <PulseScale active={isInteractive && highlightActive}>
                  <Pressable onPress={handleCheftory} style={{ alignItems: 'center', gap: 4, width: 56 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        backgroundColor: '#fff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isInteractive ? 2 : 0,
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

            {/* action list */}
            <View
              style={{
                marginTop: 8,
                marginHorizontal: 16,
                backgroundColor: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <Pressable onPress={handleWrongPress} style={actionRowStyle}>
                <Text style={actionTextStyle}>Chrome에서 열기</Text>
                <Ionicons name="logo-chrome" size={20} color="#666" />
              </Pressable>
              <View style={dividerStyle} />

              {/* Import recipe — secondary 타깃 */}
              <View ref={actionRef} collapsable={false}>
                <PulseScale active={secondaryActive} maxScale={1.03}>
                  <Pressable onPress={handleAction} style={[actionRowStyle, { backgroundColor: secondaryActive ? '#FFF7ED' : '#fff' }]}>
                    <Text
                      style={[
                        actionTextStyle,
                        secondaryActive && { color: '#FF7300', fontWeight: '700' },
                      ]}
                    >
                      Import recipe
                    </Text>
                    <Image source={TORY_LOGO} style={{ width: 22, height: 22 }} contentFit="contain" />
                  </Pressable>
                </PulseScale>
              </View>

              <View style={dividerStyle} />
              <Pressable onPress={handleWrongPress} style={actionRowStyle}>
                <Text style={actionTextStyle}>CookGo로 레시피 가져오기</Text>
                <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: '#000' }} />
              </Pressable>
              <View style={dividerStyle} />
              <Pressable onPress={handleWrongPress} style={actionRowStyle}>
                <Text style={actionTextStyle}>읽기 목록에 추가</Text>
                <Ionicons name="glasses-outline" size={20} color="#666" />
              </Pressable>
            </View>
          </BottomSheetScrollView>
        </BottomSheet>

        {/* 발자국들 (각각 다른 위치) */}
        {cheftoryPaw && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }} pointerEvents="none">
            <ToryPawHint
              targetX={cheftoryPaw.x}
              targetY={cheftoryPaw.y}
              active={cheftoryPawActive}
              onComplete={() => setCheftoryPawActive(false)}
              offsetX={20}
              offsetY={-32}
            />
          </View>
        )}
        {actionPaw && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }} pointerEvents="none">
            <ToryPawHint
              targetX={actionPaw.x}
              targetY={actionPaw.y}
              active={actionPawActive}
              onComplete={() => setActionPawActive(false)}
              offsetX={-30}
              offsetY={-30}
            />
          </View>
        )}
      </>
    );
  },
);

const actionRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingHorizontal: 16,
  paddingVertical: 14,
};

const actionTextStyle = {
  fontSize: 15,
  color: '#000',
};

const dividerStyle = {
  height: 0.5,
  backgroundColor: 'rgba(60,60,67,0.15)',
  marginLeft: 16,
};
