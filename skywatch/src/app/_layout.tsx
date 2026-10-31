import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
// Loaded first so the background refresh task is defined before any screen.
import '../lib/background';
import { ErrorScreen } from '../components/ErrorScreen';
import { ReportProvider } from '../lib/report';
import { SettingsProvider } from '../lib/settings';
import { useFeedbackResponses } from '../lib/useFeedbackResponses';

// A screen that throws shows this instead of going blank.
export { ErrorScreen as ErrorBoundary };

function FeedbackResponses() {
  useFeedbackResponses();
  return null;
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ReportProvider>
        <StatusBar style="light" />
        {/* Notification responses exist only on the phone; the web preview has none. */}
        {Platform.OS !== 'web' && <FeedbackResponses />}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="glow" options={{ animation: 'fade' }} />
          <Stack.Screen name="sun" options={{ animation: 'fade' }} />
          <Stack.Screen name="moon" options={{ animation: 'fade' }} />
          <Stack.Screen name="venus" options={{ animation: 'fade' }} />
          <Stack.Screen name="typhoon" options={{ animation: 'fade' }} />
          <Stack.Screen name="member" options={{ animation: 'fade' }} />
          <Stack.Screen name="feedback" options={{ animation: 'fade' }} />
        </Stack>
      </ReportProvider>
    </SettingsProvider>
  );
}
