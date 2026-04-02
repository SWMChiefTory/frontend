import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

const useGradualAnimation = () => {
  const height = useSharedValue(0);
  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        height.value = Math.max(event.height, 0);
      },
      onEnd: (event) => {
        "worklet";
        height.value = event.height;
      },
    },
    [],
  );
  return {
    height,
  };
};

export const useKeyboardAvoidingAnimation = () => {
  const { height: keyboardHeight } = useGradualAnimation();
  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));
  return { animatedStyle };
};
