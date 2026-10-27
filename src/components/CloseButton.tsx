import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useSettings } from '../lib/settings';
import { CloseIcon } from './Icons';

/** Round frosted close button anchored to the bottom centre, as in a full-screen scene. */
export function CloseButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 18 }]} pointerEvents="box-none">
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('close')} style={styles.button}>
        <CloseIcon color={colors.text} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
});
