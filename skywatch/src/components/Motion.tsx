// Small motion primitives built on React Native's Animated, so they run the
// same on iOS and in the web preview.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

/** Fades and lifts its children into place; `delay` staggers siblings. */
export function Rise({
  children,
  delay = 0,
  distance = 14,
  duration = 560,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: easeOut, useNativeDriver: native }).start();
  }, [v, delay, duration]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Counts from 0 up to `target` with an ease-out curve. */
export function useCountUp(target: number, duration = 900, delay = 150) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value: x }) => setValue(Math.round(x)));
    Animated.timing(v, { toValue: target, duration, delay, easing: easeOut, useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [target, duration, delay]);
  return value;
}

/** A 0→1 progress value for driving SVG geometry (sun position, dial marker). */
export function useProgress(duration = 1200, delay = 200) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setP(value));
    Animated.timing(v, { toValue: 1, duration, delay, easing: easeOut, useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [duration, delay]);
  return p;
}

/** Spring scale for press feedback. */
export function usePressScale(pressed = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: native, speed: 40, bounciness: 6 }).start();
  return { scale, onPressIn: () => to(pressed), onPressOut: () => to(1) };
}
