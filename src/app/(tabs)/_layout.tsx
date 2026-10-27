import { BlurView } from 'expo-blur';
import Tabs from 'expo-router/tabs';
import { StyleSheet } from 'react-native';
import { PinIcon, SlidersIcon, SunsetIcon } from '../../components/Icons';
import { colors } from '../../constants/theme';
import { useSettings } from '../../lib/settings';

const icon =
  (Icon: typeof SunsetIcon) =>
  ({ color }: { color: unknown }) => <Icon color={typeof color === 'string' ? color : colors.textDim} size={22} />;

export default function TabsLayout() {
  const { t } = useSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute', backgroundColor: 'rgba(8,10,28,0.35)', borderTopColor: colors.glassBorder, borderTopWidth: StyleSheet.hairlineWidth },
        tabBarBackground: () => <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '500', letterSpacing: 0.2, paddingBottom: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabTonight'), tabBarIcon: icon(SunsetIcon) }} />
      <Tabs.Screen name="cities" options={{ title: t('tabCities'), tabBarIcon: icon(PinIcon) }} />
      <Tabs.Screen name="settings" options={{ title: t('tabSettings'), tabBarIcon: icon(SlidersIcon) }} />
    </Tabs>
  );
}
