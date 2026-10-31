// The first thing seen on a cold start. It picks up exactly where the native splash
// leaves off (the same dusk glow, drawn the same way), lets two lines of text light up,
// then fades onto the app. A tap skips it.
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import { easeOut } from './Motion';

// Held until this screen has drawn its glow, so the hand-off from the native splash is seamless.
SplashScreen.preventAutoHideAsync().catch(() => {});
// The native splash draws the picture a shade redder; a slow cross-fade hides the difference.
SplashScreen.setOptions({ fade: true, duration: 500 });

const native = Platform.OS !== 'web';
const SANS = Platform.select({ ios: 'Avenir Next', default: undefined });
// The orange of the glow in the corner, so the words read as part of it.
const ORANGE = '#FF8A3D';
const OPENING = require('../../assets/opening.png');

export function OpeningScreen() {
  const [done, setDone] = useState(false);
  const first = useRef(new Animated.Value(0)).current;
  const second = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  const leave = () => {
    Animated.timing(fade, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }).start(() =>
      setDone(true),
    );
  };

  const start = () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hideAsync().catch(() => {});
    const show = (v: Animated.Value, delay: number) =>
      Animated.timing(v, { toValue: 1, duration: 900, delay, easing: easeOut, useNativeDriver: native });
    Animated.sequence([
      Animated.parallel([
        show(first, 200),
        show(second, 900),
        // The glow breathes in once behind the words, and settles a little lower.
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1000, delay: 200, easing: easeOut, useNativeDriver: native }),
          Animated.timing(glow, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        ]),
      ]),
      Animated.delay(250),
    ]).start(({ finished }) => finished && leave());
  };

  // If the image never reports in, do not keep the app behind the splash.
  useEffect(() => {
    const id = setTimeout(start, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessibilityRole="button" accessibilityLabel="Look up. Just for a moment.">
        <Image source={OPENING} style={styles.backdrop} resizeMode="cover" onLoadEnd={start} />
        <View style={styles.words}>
          <Animated.View style={rise(first)}>
            <GlowText style={styles.line} glow={glow}>
              Look up.
            </GlowText>
          </Animated.View>
          <Animated.View style={[rise(second), styles.closer]}>
            <GlowText style={styles.line} glow={glow}>
              Just for a moment.
            </GlowText>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Text with a warm halo behind it whose strength follows `glow`. */
function GlowText({ children, style, glow }: { children: string; style: TextStyle; glow: Animated.Value }) {
  return (
    <View>
      <Animated.Text style={[style, styles.halo, { opacity: glow }]} aria-hidden>
        {children}
      </Animated.Text>
      <Animated.Text style={[style, styles.crisp]}>{children}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000', zIndex: 10 },
  // Sized outright: insets alone leave an Image at the picture's own size.
  backdrop: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  words: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: '12%' },
  // Both lines alike, read as a single thought.
  // Takes back the padding between the lines, so they sit as close as plain text would.
  closer: { marginTop: -22 },
  // Padded so the halo has room to spread instead of being cut off at the text's edges.
  line: { fontFamily: SANS, fontSize: 20, fontWeight: '400', letterSpacing: 0.8, textAlign: 'center', paddingHorizontal: 28, paddingVertical: 14 },
  halo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    color: ORANGE,
    textShadowColor: 'rgba(255,110,40,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  crisp: {
    color: ORANGE,
    textShadowColor: 'rgba(255,120,50,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
