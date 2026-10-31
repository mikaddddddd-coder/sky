// The Live Activity for a clear full-moon night: when it rises, on black with the moon
// itself. Started by the app (lib/widgets.ts) on such an evening when no sunset is worth
// a countdown. Runs in the widget extension's own runtime; the photo comes from the
// folder the app shares with it.
import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { background, clipShape, clipped, fixedSize, font, foregroundStyle, frame, lineLimit, monospacedDigit, offset, padding, resizable, shapes } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type MoonActivityProps = {
  /** "满月 · 通透" */
  title: string;
  /** Moonrise, "17:39" */
  time: string;
  /** file:// URL of the moon photo in the shared folder; empty if it could not be copied. */
  photo: string;
};

const MoonActivity = (props: MoonActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const WHITE = '#FFFFFF';
  const GREY = 'rgba(235,235,245,0.6)';
  const moon = (size: number) =>
    props.photo ? (
      <Image uiImage={props.photo} modifiers={[resizable(), frame({ width: size, height: size }), clipShape('circle')]} />
    ) : (
      <Text modifiers={[frame({ width: size, height: size }), background({ type: 'radialGradient', colors: ['#E6E6E6', '#8A8A8E'], center: { x: 0.4, y: 0.4 }, startRadius: 0, endRadius: size * 0.7 }, shapes.circle())]}> </Text>
    );
  // A faint glow around the moon, so it sits in the night rather than on a flat black.
  const night = {
    type: 'radialGradient' as const,
    colors: ['rgba(60,62,72,0.55)', 'rgba(20,21,26,0.4)', 'rgba(0,0,0,0)'],
    center: { x: 0.78, y: 0.5 },
    startRadius: 0,
    endRadius: 200,
  };

  return {
    banner: (
      // The moon sits behind the words and runs off the right edge, so it takes no room from the time.
      <ZStack alignment="trailing" modifiers={[frame({ maxWidth: 10000, minHeight: 160 }), background(night), background('#000000'), clipped()]}>
        <HStack modifiers={[offset({ x: 46 })]}>{moon(184)}</HStack>
        <VStack alignment="leading" spacing={0} modifiers={[padding({ leading: 26, top: 22, bottom: 18 }), frame({ maxWidth: 10000, minHeight: 160, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(GREY), lineLimit(1)]}>{props.title}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 62, weight: 'bold' }), monospacedDigit(), foregroundStyle(WHITE), lineLimit(1), fixedSize()]}>{props.time}</Text>
        </VStack>
      </ZStack>
    ),
    compactLeading: moon(18),
    compactTrailing: <Text modifiers={[font({ size: 14, weight: 'bold' }), monospacedDigit(), foregroundStyle(WHITE)]}>{props.time}</Text>,
    minimal: moon(18),
    expandedLeading: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ leading: 10, top: 6 })]}>
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(GREY), lineLimit(1)]}>{props.title}</Text>
        <Text modifiers={[font({ size: 44, weight: 'bold' }), monospacedDigit(), foregroundStyle(env.isLuminanceReduced ? GREY : WHITE)]}>{props.time}</Text>
      </VStack>
    ),
    expandedTrailing: <HStack modifiers={[padding({ trailing: 6, top: 4 })]}>{moon(76)}</HStack>,
  };
};

export default createLiveActivity<MoonActivityProps>('MoonActivity', MoonActivity);
