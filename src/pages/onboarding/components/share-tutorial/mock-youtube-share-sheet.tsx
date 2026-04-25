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
    const [pawTarget, setPawTarget] = useState<{ x: number; y: number } | null>(null);
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
          // 시트 완전 expand → 더보기 measure + paw 활성화
          setHighlightActive(true);
          setTimeout(() => {
            moreButtonRef.current?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
              setPawTarget({ x: pageX, y: pageY });
              setPawActive(true);
            });
          }, 200);
        } else if (index === -1) {
          setHighlightActive(false);
          setPawActive(false);
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
      closingForMoreRef.current = true;
      onMorePress();
      sheetRef.current?.close();
    }, [isInteractive, onMorePress]);

    const handleWrongPress = useCallback(() => {
      if (!isInteractive) return;
      onWrongTap();
    }, [isInteractive, onWrongTap]);

    // isInteractive false로 바뀌면 paw 즉시 정리
    useEffect(() => {
      if (!isInteractive) {
        setPawActive(false);
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
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#000' }}>공유</Text>
              <Text style={{ fontSize: 13, color: '#666' }}>0:11</Text>
            </View>

            {/* 앱 아이콘 row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 16,
                paddingHorizontal: 20,
                paddingBottom: 18,
                alignItems: 'flex-start',
              }}
            >
              {/* 비활성 앱들 */}
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

              {/* 더보기 — 활성 타깃 */}
              <View ref={moreButtonRef} collapsable={false}>
                <PulseScale active={isInteractive && highlightActive}>
                  <Pressable
                    onPress={handleMore}
                    style={{ alignItems: 'center', gap: 6, width: 64 }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#E5E5E5',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isInteractive ? 2 : 0,
                        borderColor: '#FF7300',
                      }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={26} color="#333" />
                    </View>
                    <Text style={{ fontSize: 11, color: '#000', fontWeight: isInteractive ? '700' : '400' }}>
                      더보기
                    </Text>
                  </Pressable>
                </PulseScale>
              </View>
            </View>

            {/* 구분선 */}
            <View style={{ height: 1, backgroundColor: '#EEE', marginHorizontal: 20 }} />

            {/* 하단 액션 (장식, 비활성) */}
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
          </BottomSheetView>
        </BottomSheet>

        {/* 발자국 — 시트 위에 absolute */}
        {pawTarget && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000 }}
            pointerEvents="none"
          >
            <ToryPawHint
              targetX={pawTarget.x}
              targetY={pawTarget.y}
              active={pawActive}
              onComplete={() => setPawActive(false)}
              offsetX={28}
              offsetY={-32}
            />
          </View>
        )}
      </>
    );
  },
);
