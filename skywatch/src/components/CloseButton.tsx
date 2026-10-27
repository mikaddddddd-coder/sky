import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useSettings } from '../lib/settings';
import { CloseIcon } from './Icons';

const GAP = 18;
const SIZE = 48;

/** Space to leave at the bottom of a scene so nothing sits under the close button. */
export function useCloseButtonClearance() {
  return useSafeAreaInsets().bottom + GAP + SIZE + 16;
}

/** Round frosted close button anchored to the bottom centre, as in a full-screen scene. */
export function CloseButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + GAP }]} pointerEvents="box-none">
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('close')} style={styles.button}>
        <CloseIcon color={colors.text} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
});
