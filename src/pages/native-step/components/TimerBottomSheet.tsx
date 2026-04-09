import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Timer, StepTimerResult } from '../hooks/useStepTimer';
import { useTimerStore } from '../hooks/useStepTimer';

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ─── 헤더 타이머 아이콘 ───
export function HeaderTimer({
  timer,
  displayTime,
  isUrgent,
  onPress,
}: {
  timer: Timer | null;
  displayTime: string;
  isUrgent: boolean;
  onPress: () => void;
}) {
  if (!timer || timer.state === 'IDLE') {
    return (
      <Pressable onPress={onPress} hitSlop={8} style={s.headerTimer}>
        <Ionicons name="timer-outline" size={20} color="rgba(255,255,255,0.4)" />
      </Pressable>
    );
  }

  const color = timer.state === 'FINISHED'
    ? '#22c55e'
    : isUrgent
      ? '#ef4444'
      : timer.state === 'PAUSED'
        ? 'rgba(255,255,255,0.5)'
        : '#C4632B';

  return (
    <Pressable onPress={onPress} hitSlop={8} style={s.headerTimer}>
      {timer.state === 'PAUSED' && (
        <Ionicons name="pause" size={12} color={color} style={{ marginRight: 2 }} />
      )}
      <Text style={[s.headerTimerText, { color }]}>{displayTime}</Text>
    </Pressable>
  );
}

// ─── 미니바 ───
export function TimerMiniBar({
  timer,
  displayTime,
  progress,
  isUrgent,
  onPause,
  onResume,
  onCancel,
  onDismiss,
}: {
  timer: Timer;
  displayTime: string;
  progress: number;
  isUrgent: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const isFinished = timer.state === 'FINISHED';
  const isPaused = timer.state === 'PAUSED';

  const borderColor = isFinished
    ? 'rgba(34,197,94,0.3)'
    : isUrgent ? 'rgba(239,68,68,0.4)'
    : isPaused ? 'rgba(255,255,255,0.1)'
    : 'rgba(249,115,22,0.3)';

  const bgColor = isFinished
    ? 'rgba(34,197,94,0.1)'
    : isPaused ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.06)';

  const barColor = isFinished
    ? '#22c55e'
    : isUrgent ? '#ef4444'
    : isPaused ? 'rgba(249,115,22,0.4)'
    : '#C4632B';

  const textColor = isPaused ? 'rgba(255,255,255,0.5)' : '#fff';

  return (
    <View style={[s.miniBar, { borderColor, backgroundColor: bgColor }]}>
      <View style={s.miniBarTop}>
        <Text style={s.miniBarIcon}>{isFinished ? '✅' : '🍳'}</Text>
        <Text style={[s.miniBarName, { color: textColor }]} numberOfLines={1}>{timer.name}</Text>
        <Text style={[
          s.miniBarTime,
          { color: isFinished ? '#22c55e' : isUrgent ? '#ef4444' : textColor },
        ]}>
          {displayTime}
        </Text>
        {isFinished ? (
          <Pressable onPress={onDismiss} hitSlop={8} style={s.miniBarBtn}>
            <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>확인</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={isPaused ? onResume : onPause} hitSlop={8} style={s.miniBarBtn}>
              <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Pressable onPress={onCancel} hitSlop={8} style={s.miniBarBtn}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </>
        )}
      </View>
      <View style={s.miniBarProgress}>
        <View style={[s.miniBarProgressFill, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── 바텀시트 ───
export type TimerSheetRef = {
  open: () => void;
  close: () => void;
}

type TimerBottomSheetProps = {
  timerResult: StepTimerResult;
  stepName: string;
}

export const TimerSheet = forwardRef<TimerSheetRef, TimerBottomSheetProps>(
  function TimerSheet({ timerResult, stepName }, ref) {
    const { timer, displayTime, progress, isUrgent, addTimer, pauseTimer, resumeTimer, cancelTimer } = timerResult;
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [selectedMinutes, setSelectedMinutes] = useState(5);
    const [selectedSeconds, setSelectedSeconds] = useState(0);

    const isSheetOpen = useTimerStore((s) => s.isSheetOpen);
    const closeSheet = useTimerStore((s) => s.closeSheet);

    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    useEffect(() => {
      if (isSheetOpen) {
        bottomSheetRef.current?.expand();
        closeSheet();
      }
    }, [isSheetOpen, closeSheet]);

    const handleStart = useCallback(() => {
      const totalSeconds = selectedMinutes * 60 + selectedSeconds;
      if (totalSeconds <= 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      addTimer(stepName, totalSeconds);
      bottomSheetRef.current?.close();
    }, [selectedMinutes, selectedSeconds, stepName, addTimer]);

    const handlePause = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pauseTimer();
    }, [pauseTimer]);

    const handleResume = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      resumeTimer();
    }, [resumeTimer]);

    const handleCancel = useCallback(() => {
      Alert.alert('타이머 취소', '타이머를 취소하시겠습니까?', [
        { text: '아니오', style: 'cancel' },
        { text: '취소', style: 'destructive', onPress: () => {
          cancelTimer();
          bottomSheetRef.current?.close();
        }},
      ]);
    }, [cancelTimer]);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        enableDynamicSizing
        enablePanDownToClose
        detached
        bottomInset={24}
        style={{ marginHorizontal: 16 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            pressBehavior="close"
          />
        )}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.grabber}
      >
        <BottomSheetView style={s.sheetContent}>
          {!timer || timer.state === 'FINISHED' ? (
            <View style={s.pickerContainer}>
              <Text style={s.pickerTitle}>타이머 설정</Text>
              <View style={s.pickerRow}>
                <WheelPicker
                  label="분"
                  items={MINUTES}
                  selectedIndex={MINUTES.indexOf(selectedMinutes)}
                  onSelect={(i) => setSelectedMinutes(MINUTES[i])}
                />
                <WheelPicker
                  label="초"
                  items={SECONDS}
                  selectedIndex={SECONDS.indexOf(selectedSeconds)}
                  onSelect={(i) => setSelectedSeconds(SECONDS[i])}
                />
              </View>
              <Pressable
                style={[s.startBtn, (selectedMinutes === 0 && selectedSeconds === 0) && { opacity: 0.4 }]}
                onPress={handleStart}
                disabled={selectedMinutes === 0 && selectedSeconds === 0}
              >
                <Ionicons name="flame" size={18} color="#fff" />
                <Text style={s.startBtnText}>시작</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.timerDetail}>
              <Text style={s.timerDetailName}>{timer.name}</Text>
              {timer.state === 'PAUSED' && <Text style={s.pausedLabel}>일시정지</Text>}
              <Text style={[
                s.timerDetailTime,
                timer.state === 'PAUSED' && { opacity: 0.5 },
                isUrgent && { color: '#ef4444' },
              ]}>
                {displayTime}
              </Text>
              <View style={s.timerDetailProgress}>
                <View style={[
                  s.timerDetailProgressFill,
                  { width: `${progress * 100}%` },
                  isUrgent && { backgroundColor: '#ef4444' },
                  timer.state === 'PAUSED' && { backgroundColor: 'rgba(249,115,22,0.4)' },
                ]} />
              </View>
              <View style={s.timerDetailActions}>
                {timer.state === 'ACTIVE' ? (
                  <Pressable style={s.actionBtn} onPress={handlePause}>
                    <Ionicons name="pause" size={20} color="#fff" />
                    <Text style={s.actionBtnText}>일시정지</Text>
                  </Pressable>
                ) : (
                  <Pressable style={s.actionBtn} onPress={handleResume}>
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={s.actionBtnText}>재개</Text>
                  </Pressable>
                )}
                <Pressable style={[s.actionBtn, { borderColor: 'rgba(239,68,68,0.3)' }]} onPress={handleCancel}>
                  <Ionicons name="close" size={20} color="#ef4444" />
                  <Text style={[s.actionBtnText, { color: '#ef4444' }]}>취소</Text>
                </Pressable>
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

// ─── 휠 피커 ───
function WheelPicker({
  label,
  items,
  selectedIndex,
  onSelect,
}: {
  label: string;
  items: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={s.wheelContainer}>
      <Text style={s.wheelLabel}>{label}</Text>
      <View style={s.wheelViewport}>
        <View style={s.wheelHighlight} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
          contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
            onSelect(Math.max(0, Math.min(index, items.length - 1)));
          }}
        >
          {items.map((item, i) => (
            <View key={i} style={s.wheelItem}>
              <Text style={[
                s.wheelItemText,
                i === selectedIndex && s.wheelItemTextSelected,
              ]}>
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───
const s = StyleSheet.create({
  headerTimer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 44 },
  headerTimerText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },

  miniBar: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  miniBarTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBarIcon: { fontSize: 16 },
  miniBarName: { flex: 1, fontSize: 14, fontWeight: '500' },
  miniBarTime: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], marginRight: 4 },
  miniBarBtn: { padding: 4 },
  miniBarProgress: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  miniBarProgressFill: { height: '100%', borderRadius: 2 },

  sheetBg: { backgroundColor: 'rgba(20,20,20,0.98)', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grabber: { backgroundColor: 'rgba(255,255,255,0.3)', width: 36 },
  sheetContent: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },

  pickerContainer: { alignItems: 'center', gap: 20 },
  pickerTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#C4632B', paddingHorizontal: 48, paddingVertical: 14, borderRadius: 24 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  wheelContainer: { alignItems: 'center', gap: 8 },
  wheelLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  wheelViewport: { height: PICKER_HEIGHT, width: 80, overflow: 'hidden' },
  wheelHighlight: { position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' },
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  wheelItemText: { fontSize: 24, color: 'rgba(255,255,255,0.3)', fontVariant: ['tabular-nums'] },
  wheelItemTextSelected: { color: '#C4632B', fontSize: 28, fontWeight: '700' },

  timerDetail: { alignItems: 'center', gap: 12 },
  timerDetailName: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  pausedLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  timerDetailTime: { color: '#fff', fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerDetailProgress: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  timerDetailProgressFill: { height: '100%', backgroundColor: '#C4632B', borderRadius: 2 },
  timerDetailActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
