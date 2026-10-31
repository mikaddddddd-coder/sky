// Shown instead of a blank screen when a screen throws. It sits above the settings,
// so it cannot know a language chosen in the app and follows the phone's instead.
import { getLocales } from 'expo-localization';
import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, type } from '../constants/theme';
import { translate } from '../lib/i18n/strings';
import { Text } from './Text';

export function ErrorScreen({ retry }: ErrorBoundaryProps) {
  const lang = getLocales()[0]?.languageCode === 'zh' ? 'zh' : 'en';
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{translate(lang, 'errorTitle')}</Text>
      <Text style={styles.body}>{translate(lang, 'errorBody')}</Text>
      <Pressable onPress={retry} accessibilityRole="button" style={styles.button}>
        <Text style={styles.buttonText}>{translate(lang, 'errorRetry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.tabBar },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textDim, textAlign: 'center' },
  button: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.glassFill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder },
  buttonText: { ...type.headline, color: colors.text },
});
