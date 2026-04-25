import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { PulseScale } from '@/src/shared/onboarding/pulse-scale';
import { ToryPawHint } from '@/src/shared/onboarding/tory-paw-hint';
import { TargetCaption } from '@/src/shared/onboarding/target-caption';

const INACTIVE_OPACITY = 0.4;

export type MockYouTubeShareSheetRef = {
  open: () => void;
  close: () => void;
}

type MockYouTubeShareSheetProps = {
  /** 현재 phase가 youtube_share인가? (이거여야 더보기 탭 가능) */
  isInteractive: boolean;
  onMorePress: () => void;
  onWrongTap: () => void;
  /** 시트가 닫히면서 다음 phase로 넘어가야 할 때 chain */
  onClosedAfterMore?: () => void;
}

/**
 * 유튜브 앱의 공유 시트 mock.
 *
 * gorhom BottomSheet 사용 — 주의사항:
 *   - enablePanDownToClose=false : 사용자가 드래그로 닫는 것 차단 (튜토리얼 보존)
 *   - enableHandlePanningGesture=false : 핸들 영역 제스처도 차단
 *   - backdrop pressBehavior='none' : 탭으로 닫는 것 차단
 *   - index={-1} 초기 → ref.expand()로 열림
 *   - snapPoints 정적 배열로 고정 (dynamic sizing flicker 회피)
 *   - onChange(0) callback에서 highlight 활성화 (시트 완전 expand 후)
 *   - onChange(-1) callback에서 onClosedAfterMore 호출 (sequential transition)
 */
export const MockYouTubeShareSheet = forwardRef<MockYouTubeShareSheetRef, MockYouTubeShareSheetProps>(
  function MockYouTubeShareSheet({ isInteractive, onMorePress, onWrongTap, onClosedAfterMore }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const [highlightActive, setHighlightActive] = useState(false);
    const [pawActive, setPawActive] = useState(false);
    const [targetBounds, setTargetBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const moreButtonRef = useRef<View>(null);
    const closingForMoreRef = useRef(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        sheetRef.current?.expand();
      },
      close: () => {
        sheetRef.current?.close();
      },
    }));

    const snapPoints = useMemo(() => ['60%'], []);

    // backdrop은 useMemo/useCallback으로 메모하여 재렌더 방지
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="none"
        />
      ),
      [],
    );

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index === 0) {
          // 시트 완전 expand → 빠르게 더보기 measure + paw 활성화
          setHighlightActive(true);
          setTimeout(() => {
            moreButtonRef.current?.measure?.((_x, _y, w, h, pageX, pageY) => {
              setTargetBounds({ x: pageX, y: pageY, width: w, height: h });
              setPawActive(true);
            });
          }, 50);
        } else if (index === -1) {
          setHighlightActive(false);
          setPawActive(false);
          setTargetBounds(null);
          // 더보기 탭으로 닫힌 거면 다음 phase로
          if (closingForMoreRef.current) {
            closingForMoreRef.current = false;
            onClosedAfterMore?.();
          }
        }
      },
      [onClosedAfterMore],
    );

    const handleMore = useCallback(() => {
      if (!isInteractive) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // 즉시 cleanup — 시트 close 애니 (~300ms) 동안 캡션/발자국 lingering 방지
      setHighlightActive(false);
      setPawActive(false);
      setTargetBounds(null);
      closingForMoreRef.current = true;
      onMorePress();
      sheetRef.current?.close();
    }, [isInteractive, onMorePress]);

    const handleWrongPress = useCallback(() => {
      if (!isInteractive) return;
      onWrongTap();
    }, [isInteractive, onWrongTap]);

    // isInteractive false로 바뀌면 모든 highlight 상태 즉시 정리
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
          enableContentPanningGesture={false}
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          handleIndicatorStyle={{ backgroundColor: 'rgba(0,0,0,0.2)', width: 36 }}
          onChange={handleSheetChange}
        >
          <BottomSheetView style={{ flex: 1, paddingHorizontal: 0 }}>
            {/* 헤더 */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 16,
                opacity: isInteractive ? INACTIVE_OPACITY : 1,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#000' }}>공유</Text>
              <Text style={{ fontSize: 13, color: '#666' }}>0:11</Text>
            </View>

            {/* 앱 아이콘 row — paddingVertical로 활성 타깃 펄스/glow 클리핑 방지 */}
            <View
              style={{
                flexDirection: 'row',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 12,
                alignItems: 'flex-start',
                overflow: 'visible',
              }}
            >
              {/* 비활성 앱들 — opacity로 약화 */}
              <View style={{ flexDirection: 'row', gap: 16, opacity: isInteractive ? INACTIVE_OPACITY : 1 }}>
                {[
                  { name: 'Gmail', color: '#EA4335', initial: 'M' },
                  { name: 'Facebook', color: '#1877F2', initial: 'f' },
                  { name: '메시지', color: '#34D399', initial: '' },
                  { name: 'Telegram', color: '#0088CC', initial: '' },
                ].map((app) => (
                  <Pressable
                    key={app.name}
                    onPress={handleWrongPress}
                    style={{ alignItems: 'center', gap: 6, width: 64 }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: app.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{app.initial}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#000' }} numberOfLines={1}>
                      {app.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 더보기 — 활성 타깃 (full opacity + glow + 큰 펄스) */}
              <View ref={moreButtonRef} collapsable={false} style={{ overflow: 'visible' }}>
                <PulseScale active={isInteractive && highlightActive} withGlow>
                  <Pressable
                    onPress={handleMore}
                    style={{ alignItems: 'center', gap: 6, width: 64 }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#FFE4D0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isInteractive ? 2.5 : 0,
                        borderColor: '#FF7300',
                      }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={26} color="#FF7300" />
                    </View>
                    <Text style={{ fontSize: 11, color: '#000', fontWeight: isInteractive ? '700' : '400' }}>
                      더보기
                    </Text>
                  </Pressable>
                </PulseScale>
              </View>
            </View>

            {/* 구분선 */}
            <View style={{ height: 1, backgroundColor: '#EEE', marginHorizontal: 20, marginTop: 8 }} />

            {/* 하단 액션 (장식, 비활성) — opacity로 약화 */}
            <View style={{ opacity: isInteractive ? INACTIVE_OPACITY : 1 }}>
              <Pressable onPress={handleWrongPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="copy-outline" size={18} color="#333" />
                </View>
                <Text style={{ fontSize: 15, color: '#000' }}>링크 복사</Text>
              </Pressable>
              <Pressable onPress={handleWrongPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="create-outline" size={18} color="#333" />
                </View>
                <Text style={{ fontSize: 15, color: '#000' }}>게시물 작성</Text>
              </Pressable>
            </View>
          </BottomSheetView>
        </BottomSheet>

        {/* === Overlays — absolute, 다른 layout 영향 없음 === */}

        {/* 발자국 */}
        {targetBounds && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }}
            pointerEvents="none"
          >
            <ToryPawHint
              targetX={targetBounds.x}
              targetY={targetBounds.y}
              active={pawActive}
              onComplete={() => setPawActive(false)}
              offsetX={28}
              offsetY={-32}
            />
          </View>
        )}

        {/* 캡션 — 더보기 버튼 바로 아래 */}
        {isInteractive && highlightActive && (
          <TargetCaption
            target={targetBounds}
            primary="더보기를 눌러주세요"
            suffix="안 보인다면 오른쪽으로 스크롤하면 보일 거예요"
            step={2}
            total={4}
          />
        )}
      </>
    );
  },
);
