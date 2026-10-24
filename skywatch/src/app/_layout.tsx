import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider } from '../lib/settings';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
