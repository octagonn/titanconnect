import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NeoCard from './NeoCard';
import { INK, palette } from '@/constants/colors';

type SectionIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface SectionCardProps {
  icon: SectionIcon;
  title: string;
  children: ReactNode;
}

// Icon-header info card (academic info / interests blocks), shared between
// the profile modal and profile.tsx.
export default function SectionCard({ icon: Icon, title, children }: SectionCardProps) {
  return (
    <NeoCard offset={6} radius={18} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconWell}>
          <Icon size={16} color={INK} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: palette.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: INK,
    letterSpacing: 0.6,
  },
  body: {
    gap: 8,
  },
});
