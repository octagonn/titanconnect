import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HardShadow from './HardShadow';
import { INK } from '@/constants/colors';

interface NeoGradientCardProps {
  children?: ReactNode;
  colors: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  offset?: number;
  radius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
}

// Same scaffold as NeoCard, but the content surface is a LinearGradient
// instead of a flat fill — used for hero banners, gradient CTAs, and
// gradient avatar wells.
export default function NeoGradientCard({
  children,
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  offset = 8,
  radius = 20,
  borderWidth = 3,
  borderColor = INK,
  shadow = true,
  style,
  contentStyle,
}: NeoGradientCardProps) {
  return (
    <View style={[styles.wrap, style]}>
      {shadow && <HardShadow offset={offset} radius={radius} color={borderColor} />}
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={[{ borderRadius: radius, borderWidth, borderColor }, contentStyle]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
});
