import type { ComponentType } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HardShadow from './HardShadow';
import { INK } from '@/constants/colors';

type StatIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface StatTileProps {
  icon: StatIcon;
  value: string;
  label: string;
  color: string;
  onPress?: () => void;
}

// Icon + big number + label tile with its own hard shadow (test.tsx's
// statTile), used for stat rows in tap-in.tsx and profile.tsx. Pass onPress
// to make it tappable (e.g. profile's Connections tile opening a friends list).
export default function StatTile({ icon: Icon, value, label, color, onPress }: StatTileProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <View style={styles.wrap}>
      <HardShadow offset={6} radius={20} />
      <Wrapper style={[styles.tile, { backgroundColor: color }]} onPress={onPress} activeOpacity={onPress ? 0.8 : undefined}>
        <Icon size={22} color={INK} strokeWidth={2.5} />
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
  },
  tile: {
    borderRadius: 20,
    borderWidth: 3,
    borderColor: INK,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: INK,
    letterSpacing: -1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: INK,
    letterSpacing: 0.5,
  },
});
