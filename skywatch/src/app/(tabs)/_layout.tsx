import Tabs from 'expo-router/tabs';
import { Text } from 'react-native';
import { colors } from '../../constants/theme';
import { useSettings } from '../../lib/settings';

const icon = (glyph: string) => () => <Text style={{ fontSize: 20 }}>{glyph}</Text>;

export default function TabsLayout() {
  const { t } = useSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.cardBorder },
        tabBarActiveTintColor: colors.glow,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabTonight'), tabBarIcon: icon('🌅') }} />
      <Tabs.Screen name="cities" options={{ title: t('tabCities'), tabBarIcon: icon('📍') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabSettings'), tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
