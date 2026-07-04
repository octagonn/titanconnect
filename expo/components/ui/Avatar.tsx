import { StyleSheet, View, Text, Image, type ViewStyle } from 'react-native';
import HardShadow from './HardShadow';
import { INK, palette } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size: number;
  withShadow?: boolean;
  style?: ViewStyle;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '?';
}

// Circular avatar. Small inline avatars (comment rows, list rows) skip the
// hard shadow to avoid visual clutter when many appear in a list; larger
// avatars (profile headers, cards) get it by default.
export default function Avatar({ uri, name, size, withShadow, style }: AvatarProps) {
  const shadow = withShadow ?? size >= 60;
  const radius = size / 2;
  const borderWidth = size >= 60 ? 3 : 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      {shadow && <HardShadow offset={Math.max(4, Math.round(size * 0.12))} radius={radius} />}
      <View
        style={[
          styles.content,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth,
            borderColor: INK,
            backgroundColor: palette.skyBlue,
          },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '900' as const,
    color: INK,
  },
});
