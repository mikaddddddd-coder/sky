// Home screen and Lock Screen widget: the first followed city's next sunset glow, drawn as
// the evening it expects (a dusk sky with the sun low on the horizon), and on the wider
// size the week's sunsets as bars. Runs in the widget extension's own runtime, so
// everything arrives through props already worded and formatted by the app (see
// lib/widgets.ts), and every constant lives inside the function.
import { HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { background, blur, containerBackground, font, foregroundStyle, frame, kerning, lineLimit, offset, opacity, shapes } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { GlowTone } from './SunsetActivity';

export type GlowSlot = {
  /** "今晚可能有火烧云" / "安静的黄昏" */
  headline: string;
  /** "晚霞" / "明早朝霞" / "火烧云", for the short spots */
  short: string;
  pct: number;
  /** "日落" / "日出" and "17:10" */
  timeLabel: string;
  time: string;
  tone: GlowTone;
};

/** One evening of the week ahead: its chance, a one-letter day, and whether it should burn. */
export type WeekBar = { pct: number; day: string; fire: boolean };

// Missing slots are left out rather than null: the shared storage the widget reads cannot hold nulls.
export type TonightWidgetProps = {
  city: string;
  dusk?: GlowSlot;
  dawn?: GlowSlot;
  /** The sunset glows from the evening shown onward; empty before the first forecast. */
  week?: WeekBar[];
  /** Shown before the app has made a forecast. */
  empty: string;
};

const TonightWidget = (props: TonightWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const WHITE = '#FFFFFF';
  const SOFT = 'rgba(255,255,255,0.78)';
  const DIM = 'rgba(245,243,255,0.55)';
  // The app icon's sun.
  const EMBER = '#EF3F00';
  const CORE = '#FD671F';
  const BRIGHT = '#FD8348';
  // Dusk skies like the app's own pages, from overhead down to the horizon; warmer as the glow gets likelier.
  const SKIES = {
    fire: ['#1B0F33', '#4A2154', '#A8436B', '#F0703E'],
    glow: ['#0F1033', '#3B2A63', '#8E4A7A', '#E07A5F'],
    soft: ['#0E1232', '#2C2A5C', '#5E4472', '#A0606A'],
    quiet: ['#080B24', '#151B45', '#2B2A58', '#4B3A60'],
  };
  // How much of the sun is showing: a 火烧云 sits big and bright on the horizon, a quiet dusk barely glows.
  const SUN = { fire: 1, glow: 0.85, soft: 0.55, quiet: 0.3 };
  const s = props.dusk;

  if (env.widgetFamily === 'accessoryInline') {
    return <Text>{s ? `${s.short} ${s.pct}% · ${s.timeLabel} ${s.time}` : props.empty}</Text>;
  }

  if (env.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: 10000, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1)]}>{s ? s.headline : props.city}</Text>
        <HStack alignment="firstTextBaseline" spacing={4}>
          <Text modifiers={[font({ size: 28, weight: 'light' })]}>{s ? `${s.pct}%` : '—'}</Text>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), lineLimit(1)]}>{s ? `${s.timeLabel} ${s.time}` : props.empty}</Text>
        </HStack>
      </VStack>
    );
  }

  const tone = s?.tone ?? 'quiet';
  const sky = SKIES[tone] ?? SKIES.quiet;
  const skyFill = { type: 'linearGradient' as const, colors: sky, startPoint: { x: 0.5, y: 0 }, endPoint: { x: 0.5, y: 1 } };
  // The setting sun: a soft disc in the icon's colours sitting on the bottom edge. It hangs
  // from a 1×1 point anchor, so it is drawn at full size without taking any room from the words.
  const sunDisc = (size: number, x: number, y: number) => (
    <VStack spacing={0} modifiers={[frame({ maxWidth: 10000, maxHeight: 10000 })]}>
      <Spacer />
      <HStack spacing={0}>
        <Spacer />
        <ZStack modifiers={[frame({ width: 1, height: 1 }), opacity(SUN[tone] ?? 0.5), offset({ x, y })]}>
          {/* The light around it, then the disc itself: bright at the core, ember at the rim. */}
          <Text
            modifiers={[
              frame({ width: size * 1.9, height: size * 1.9 }),
              background({ type: 'radialGradient', colors: ['rgba(253,103,31,0.55)', 'rgba(239,63,0,0.18)', 'rgba(239,63,0,0)'], center: { x: 0.5, y: 0.5 }, startRadius: size * 0.3, endRadius: size * 0.95 }, shapes.circle()),
            ]}
          >
            {' '}
          </Text>
          <Text
            modifiers={[
              frame({ width: size, height: size }),
              background({ type: 'radialGradient', colors: ['#FFB27F', BRIGHT, CORE, EMBER], center: { x: 0.45, y: 0.35 }, startRadius: 0, endRadius: size * 0.55 }, shapes.circle()),
              blur(size * 0.04),
            ]}
          >
            {' '}
          </Text>
        </ZStack>
        <Spacer />
      </HStack>
    </VStack>
  );
  const label = (
    <Text modifiers={[font({ size: 11, weight: 'semibold' }), kerning(0.6), foregroundStyle(DIM), lineLimit(1)]}>
      {s ? `${s.short} · ${props.city}` : props.city}
    </Text>
  );
  const pct = (size: number) => (
    <HStack alignment="firstTextBaseline" spacing={2}>
      <Text modifiers={[font({ size, weight: 'thin' }), foregroundStyle(WHITE)]}>{s ? `${s.pct}` : '—'}</Text>
      <Text modifiers={[font({ size: Math.round(size * 0.3), weight: 'light' }), foregroundStyle(SOFT)]}>%</Text>
    </HStack>
  );
  const headline = (size: number) => (
    <Text modifiers={[font({ size, weight: 'semibold' }), foregroundStyle(WHITE), lineLimit(1)]}>{s ? s.headline : props.empty}</Text>
  );
  const sunsetLine = (
    <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(SOFT), lineLimit(1)]}>{s ? `${s.timeLabel} ${s.time}` : ''}</Text>
  );

  if (env.widgetFamily === 'systemMedium') {
    const d = props.dawn;
    const week = (props.week ?? []).slice(0, 7);
    const MAX_BAR = 46;
    return (
      <ZStack alignment="topLeading" modifiers={[containerBackground(skyFill, 'widget'), frame({ maxWidth: 10000, maxHeight: 10000 })]}>
        {sunDisc(118, 40, -18)}
        <HStack alignment="bottom" spacing={0} modifiers={[frame({ maxWidth: 10000, maxHeight: 10000 })]}>
          <VStack alignment="leading" spacing={0}>
            {label}
            <Spacer />
            {pct(54)}
            {headline(14)}
            {sunsetLine}
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={0}>
            {d && <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(SOFT), lineLimit(1)]}>{`${d.short} ${d.pct}%`}</Text>}
            <Spacer />
            <HStack alignment="bottom" spacing={6}>
              {week.map((w, i) => (
                <VStack key={i} alignment="center" spacing={4}>
                  <Text
                    modifiers={[
                      frame({ width: 7, height: Math.max(4, Math.round((w.pct / 100) * MAX_BAR)) }),
                      background(i === 0 ? WHITE : w.fire ? BRIGHT : 'rgba(255,255,255,0.32)', shapes.capsule()),
                    ]}
                  >
                    {' '}
                  </Text>
                  <Text modifiers={[font({ size: 9, weight: i === 0 ? 'bold' : 'medium' }), foregroundStyle(i === 0 ? WHITE : DIM)]}>{w.day}</Text>
                </VStack>
              ))}
            </HStack>
          </VStack>
        </HStack>
      </ZStack>
    );
  }

  return (
    <ZStack alignment="topLeading" modifiers={[containerBackground(skyFill, 'widget'), frame({ maxWidth: 10000, maxHeight: 10000 })]}>
      {sunDisc(96, 30, -14)}
      <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' })]}>
        {label}
        <Spacer />
        {pct(50)}
        {headline(13)}
        {sunsetLine}
      </VStack>
    </ZStack>
  );
};

export default createWidget<TonightWidgetProps>('TonightWidget', TonightWidget, { city: '天色 Look Up', empty: '打开天色看今晚的晚霞' });
