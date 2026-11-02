import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { CometSky } from '../components/CometSky';
import { Rise } from '../components/Motion';
import { Panel, panelText } from '../components/Panel';
import { colors, spacing } from '../constants/theme';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';
import { peakLine, upcomingEvents } from '../lib/sky/events';

/** The year's special sky events from today on, soonest first. */
export default function EventsScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  // The horizon sits just above the panel, wherever that ends up on this screen.
  const [horizon, setHorizon] = useState(320);
  const clearance = useCloseButtonClearance();

  if (!r) return <View style={styles.root} />;

  const events = upcomingEvents(r.city.timezone);

  return (
    <View style={styles.root}>
      <CometSky horizon={horizon} />
      <SafeAreaView edges={['top']} style={styles.top}>
        <Rise delay={100}>
          <Text style={panelText.eyebrow}>
            {t('eventsTitle')} · {r.city.name[lang]}
          </Text>
        </Rise>
      </SafeAreaView>

      <View style={styles.sky} onLayout={(e) => setHorizon(e.nativeEvent.layout.y + e.nativeEvent.layout.height - spacing.sm)} />

      <Rise delay={250} style={[styles.panelWrap, { marginBottom: clearance - spacing.md }]}>
        <Panel tint={['rgba(120,150,255,0.06)', 'rgba(0,0,0,0.88)']} style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
            <Text style={panelText.title}>{t('eventsUpcoming')}</Text>
            <View style={styles.list}>
              {events.map((e) => (
                <View key={`${e.id}-${e.date.getTime()}`} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {t(`event_${e.id}`)}
                    </Text>
                    <Text style={panelText.sub}>{peakLine(e, t, lang)}</Text>
                  </View>
                  <Text style={styles.rate}>{t('eventsRate', { n: e.zhr })}</Text>
                </View>
              ))}
            </View>
            <View style={panelText.divider} />
            <Text style={panelText.note}>{t('eventsNote')}</Text>
          </ScrollView>
        </Panel>
      </Rise>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  // Open sky for the comet, above the panel.
  sky: { flex: 1, minHeight: 240 },
  panelWrap: { maxHeight: '54%', marginHorizontal: spacing.md },
  panel: { padding: 0, gap: 0, flexShrink: 1 },
  // Extra room at the end so the note can scroll clear of the close button.
  panelContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.lg },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '500', color: colors.text },
  rate: { fontSize: 13, color: colors.textDim, fontVariant: ['tabular-nums'] },
});
