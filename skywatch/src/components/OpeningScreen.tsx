// The first thing seen on a cold start. It picks up where the native splash leaves off
// (the same near-black), lets the glow in the corner brighten from faint to full while
// one line of text comes in letter by letter, then fades onto the app. A tap skips it.
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { easeOut } from './Motion';

// Held until this screen has drawn, so the hand-off from the native splash is seamless.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 300 });

const native = Platform.OS !== 'web';
const SANS = Platform.select({ ios: 'Helvetica Neue', default: undefined });
// The native splash's colour, and the picture's own black.
const DARK = '#060403';
const OPENING = require('../../assets/opening.png');
// Two spaces after the comma, as in the design.
const LINE = 'LOOK UP,  JUST FOR A MOMENT';
const LETTERS = [...LINE];

export function OpeningScreen() {
  const [done, setDone] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;
  const letters = useRef(LETTERS.map(() => new Animated.Value(0))).current;
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
    Animated.sequence([
      Animated.parallel([
        // The light in the corner comes up slowly, like the last of the sun.
        Animated.timing(glow, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }),
        Animated.stagger(
          40,
          letters.map((v) => Animated.timing(v, { toValue: 1, duration: 700, delay: 500, easing: easeOut, useNativeDriver: native })),
        ),
      ]),
      Animated.delay(700),
    ]).start(({ finished }) => finished && leave());
  };

  // If the image never reports in, do not keep the app behind the splash.
  useEffect(() => {
    const id = setTimeout(start, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessibilityRole="button" accessibilityLabel="Look up, just for a moment">
        <Animated.Image
          source={OPENING}
          style={[styles.backdrop, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }) }]}
          resizeMode="cover"
          onLoadEnd={start}
        />
        <View style={styles.words} aria-hidden>
          {LETTERS.map((ch, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                {
                  opacity: letters[i],
                  transform: [{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                },
              ]}
            >
              {ch}
            </Animated.Text>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: DARK, zIndex: 10 },
  // Sized outright: insets alone leave an Image at the picture's own size.
  backdrop: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  // Sits just above the middle, where the design puts it.
  words: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: '4%' },
  letter: { fontFamily: SANS, fontSize: 12, fontWeight: '400', letterSpacing: 1.3, color: '#fff' },
});
