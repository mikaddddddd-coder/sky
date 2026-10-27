import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ReportProvider } from '../lib/report';
import { SettingsProvider } from '../lib/settings';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ReportProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="glow" options={{ animation: 'fade' }} />
          <Stack.Screen name="sun" options={{ animation: 'fade' }} />
          <Stack.Screen name="moon" options={{ animation: 'fade' }} />
          <Stack.Screen name="venus" options={{ animation: 'fade' }} />
          <Stack.Screen name="typhoon" options={{ animation: 'fade' }} />
        </Stack>
      </ReportProvider>
    </SettingsProvider>
  );
}
