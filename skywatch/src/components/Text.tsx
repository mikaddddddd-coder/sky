// Text that draws Chinese in PingFang SC. Without an explicit font, iOS picks
// the CJK fallback from the system language, so on a phone set to English the
// Simplified characters come out in Japanese glyph shapes and read as
// Traditional. Text without Chinese keeps the system font and its digits.
import { Children } from 'react';
import { Platform, Text as RNText, type TextProps } from 'react-native';

export const CJK_FONT = Platform.select({ ios: 'PingFang SC', default: undefined });

const HAN = /[　-〿㐀-鿿＀-￯]/;

function hasHan(children: TextProps['children']): boolean {
  let found = false;
  Children.forEach(children, (c) => {
    if (!found && (typeof c === 'string' || typeof c === 'number') && HAN.test(String(c))) found = true;
  });
  return found;
}

export function Text({ style, children, ...rest }: TextProps) {
  const cjk = CJK_FONT && hasHan(children);
  return (
    <RNText {...rest} style={cjk ? [{ fontFamily: CJK_FONT }, style] : style}>
      {children}
    </RNText>
  );
}
