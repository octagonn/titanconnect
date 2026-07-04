import type { ComponentType } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HardShadow from './HardShadow';
import Colors, { INK } from '@/constants/colors';

type SegmentIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface SegmentItem {
  key: string;
  label: string;
  icon?: SegmentIcon;
}

interface SegmentedControlProps {
  items: SegmentItem[];
  value: string;
  onChange: (key: string) => void;
  activeColor?: string;
}

// Chunky bordered tab switcher, generalized from test.tsx's seg/segItem.
export default function SegmentedControl({
  items,
  value,
  onChange,
  activeColor = Colors.light.accent,
}: SegmentedControlProps) {
  return (
    <View style={styles.wrap}>
      <HardShadow offset={6} radius={18} />
      <View style={styles.seg}>
        {items.map((item) => {
          const active = item.key === value;
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.item, active && { backgroundColor: activeColor }]}
              onPress={() => onChange(item.key)}
              activeOpacity={0.8}
            >
              {Icon ? <Icon size={16} color={active ? '#FFFFFF' : INK} strokeWidth={2.5} /> : null}
              <Text style={[styles.text, active && styles.textActive]}>{item.label.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 18,
    padding: 5,
    gap: 5,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: INK,
    letterSpacing: 0.5,
  },
  textActive: {
    color: '#FFFFFF',
  },
});
