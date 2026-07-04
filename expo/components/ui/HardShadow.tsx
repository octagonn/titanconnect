import { StyleSheet, View, type ViewStyle } from 'react-native';
import { INK } from '@/constants/colors';

interface HardShadowProps {
  offset?: number;
  radius?: number;
  color?: string;
  style?: ViewStyle;
}

// The neo-brutalist "sticker" shadow: a solid ink block rendered as an
// absolutely-positioned sibling behind a card, shifted down-right so it
// peeks out from under the card's border. Works identically on web and
// native since it's a real view, not a CSS box-shadow (which RN doesn't
// render with hard offsets/no blur on native).
export default function HardShadow({ offset = 8, radius = 20, color = INK, style }: HardShadowProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.base,
        {
          top: offset,
          left: offset,
          right: -offset,
          bottom: -offset,
          borderRadius: radius,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
  },
});
