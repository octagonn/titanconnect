import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import HardShadow from './HardShadow';
import Colors, { INK } from '@/constants/colors';

interface NeoCardProps {
  children?: ReactNode;
  offset?: number;
  radius?: number;
  borderWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
  shadow?: boolean;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
}

// The default card scaffold: a relatively-positioned wrapper holding a
// HardShadow sibling plus the real, ink-bordered content view on top.
// Covers post cards, info cards, buttons, and modal sheets.
export default function NeoCard({
  children,
  offset = 8,
  radius = 20,
  borderWidth = 3,
  backgroundColor = Colors.light.card,
  borderColor = INK,
  shadow = true,
  style,
  contentStyle,
}: NeoCardProps) {
  return (
    <View style={[styles.wrap, style]}>
      {shadow && <HardShadow offset={offset} radius={radius} color={borderColor} />}
      <View
        style={[
          { borderRadius: radius, borderWidth, borderColor, backgroundColor },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
});
