import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { INK, palette } from '@/constants/colors';

type ChipVariant = 'solid' | 'outline' | 'sticker';
type ChipIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface ChipProps {
  label: string;
  icon?: ChipIcon;
  color?: string;
  variant?: ChipVariant;
  rotate?: number;
  size?: 'sm' | 'md';
  onPress?: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

// Palette fills dark enough to need white text on top of them.
const DARK_FILLS: string[] = [palette.navy, palette.blue, palette.rust];

function textColorFor(bg: string): string {
  return DARK_FILLS.includes(bg) ? '#FFFFFF' : INK;
}

// Unifies tags, badges, segment items, and rotated "sticker" callouts
// (test.tsx's HOT/PRO stamps) into one primitive.
export default function Chip({
  label,
  icon: Icon,
  color = palette.amber,
  variant = 'outline',
  rotate = 0,
  size = 'md',
  onPress,
  loading = false,
  style,
}: ChipProps) {
  const isSm = size === 'sm';
  const isFilled = variant !== 'outline';
  const backgroundColor = isFilled ? color : '#FFFFFF';
  const textColor = isFilled ? textColorFor(color) : INK;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {Icon ? <Icon size={isSm ? 11 : 13} color={textColor} strokeWidth={2.5} /> : null}
          <Text style={[styles.label, { color: textColor, fontSize: isSm ? 10 : 12 }]}>{label}</Text>
        </>
      )}
    </>
  );

  const baseStyle = {
    backgroundColor,
    borderWidth: isSm ? 1.5 : 2,
    paddingHorizontal: isSm ? 8 : 10,
    paddingVertical: isSm ? 3 : 5,
    transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
  };

  if (!onPress) {
    return <View style={[styles.chip, baseStyle, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.chip,
        baseStyle,
        style,
        { opacity: pressed || loading ? 0.7 : 1, transform: [...(baseStyle.transform ?? []), { scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    borderColor: INK,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '900' as const,
    letterSpacing: 0.4,
  },
});
