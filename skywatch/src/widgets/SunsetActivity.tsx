// The Live Activity for an evening worth going out for: the sunset's chance and time on
// a card painted in the sky it expects, and a countdown in the Dynamic Island. Started
// by the app (lib/widgets.ts) when it is open in the hours before such a sunset. Like
// the widget, it runs in the extension's own runtime: words arrive formatted through
// props, times as epoch milliseconds.
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding, shapes } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** How the sky is expected to look, which sets the card's colours. */
export type GlowTone = 'fire' | 'glow' | 'soft' | 'quiet';

export type SunsetActivityProps = {
  /** "今晚可能有火烧云" */
  headline: string;
  pct: number;
  tone: GlowTone;
  /** When the countdown started and when the sun sets, in epoch ms. */
  from: number;
  sunsetAt: number;
  /** "日落" and "17:10" */
  sunsetLabel: string;
  sunsetTime: string;
};

const SunsetActivity = (props: SunsetActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const WHITE = '#FFFFFF';
  // The app icon's colours: a sun in ember, orange and peach, glowing on near-black.
  const EMBER = '#EF3F00';
  const CORE = '#FD671F';
  const BRIGHT = '#FD8348';
  const PEACH = '#F6A27F';
  const CREAM = '#FFE8D9';
  // A 火烧云 gets the full sun; a likely 晚霞 a lower, softer one.
  const fire = props.tone === 'fire';
  // Back to front: the dark of the evening, warming toward the bottom, then the sun rising out of it.
  const dusk = { type: 'linearGradient' as const, colors: ['#070404', '#1C0A05', '#3A1407'], startPoint: { x: 0.5, y: 0 }, endPoint: { x: 0.5, y: 1 } };
  const sun = {
    type: 'radialGradient' as const,
    colors: fire ? [BRIGHT, CORE, EMBER, 'rgba(160,40,0,0.35)', 'rgba(60,15,0,0)'] : [PEACH, BRIGHT, CORE, 'rgba(150,45,10,0.3)', 'rgba(60,15,0,0)'],
    center: { x: 0.5, y: fire ? 1.25 : 1.4 },
    startRadius: 0,
    endRadius: fire ? 230 : 200,
  };
  // On the black of the Dynamic Island the same sun carries the colour.
  const warm = env.isLuminanceReduced ? WHITE : BRIGHT;
  const ember = { type: 'linearGradient' as const, colors: [PEACH, BRIGHT, CORE], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  const pct = (size: number, style: string | typeof ember) => (
    <HStack alignment="lastTextBaseline" spacing={1}>
      <Text modifiers={[font({ size, weight: 'bold' }), foregroundStyle(style)]}>{`${props.pct}`}</Text>
      <Text modifiers={[font({ size: Math.round(size * 0.42), weight: 'bold' }), foregroundStyle(style)]}>%</Text>
    </HStack>
  );
  const sunset = (labelSize: number, timeSize: number, labelColor: string) => (
    <VStack alignment="trailing" spacing={0}>
      <Text modifiers={[font({ size: labelSize, weight: 'bold' }), foregroundStyle(labelColor)]}>{props.sunsetLabel}</Text>
      <Text modifiers={[font({ size: timeSize, weight: 'bold' }), monospacedDigit(), foregroundStyle(CREAM)]}>{props.sunsetTime}</Text>
    </VStack>
  );
  const dot = (size: number) => (
    <Text modifiers={[frame({ width: size, height: size }), background({ type: 'radialGradient', colors: [BRIGHT, CORE, EMBER], center: { x: 0.4, y: 0.35 }, startRadius: 0, endRadius: size * 0.7 }, shapes.circle())]}> </Text>
  );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ horizontal: 26, top: 22, bottom: 20 }), frame({ maxWidth: 10000, minHeight: 160, alignment: 'leading' }), background(sun), background(dusk)]}
      >
        <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(PEACH), lineLimit(1)]}>{props.headline}</Text>
        <Spacer />
        <HStack alignment="lastTextBaseline">
          {pct(64, CREAM)}
          <Spacer />
          {sunset(16, 28, PEACH)}
        </HStack>
      </VStack>
    ),
    compactLeading: dot(16),
    compactTrailing: (
      <Text
        timerInterval={{ lower: new Date(props.from), upper: new Date(props.sunsetAt) }}
        countsDown
        modifiers={[font({ size: 14, weight: 'bold' }), monospacedDigit(), foregroundStyle(warm), frame({ width: 52, alignment: 'trailing' })]}
      />
    ),
    minimal: dot(16),
    expandedLeading: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ leading: 10, top: 6 })]}>
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(warm), lineLimit(1)]}>{props.headline}</Text>
        {pct(44, env.isLuminanceReduced ? WHITE : ember)}
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 10, top: 26 })]}>
        {sunset(13, 26, 'rgba(245,243,255,0.6)')}
      </VStack>
    ),
    // The sky's colours as a thin horizon under the numbers.
    expandedBottom: (
      <Text
        modifiers={[
          frame({ maxWidth: 10000, minHeight: 4, maxHeight: 4 }),
          background({ type: 'linearGradient', colors: [EMBER, CORE, BRIGHT, PEACH], startPoint: { x: 0, y: 0.5 }, endPoint: { x: 1, y: 0.5 } }, shapes.capsule()),
          padding({ horizontal: 10, top: 4, bottom: 6 }),
        ]}
      >
        {' '}
      </Text>
    ),
  };
};

export default createLiveActivity<SunsetActivityProps>('SunsetActivity', SunsetActivity);
