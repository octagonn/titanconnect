import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import Avatar from './Avatar';
import Colors, { INK } from '@/constants/colors';

interface ListRowProps {
  avatarUri?: string | null;
  avatarName?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  unread?: boolean;
  style?: ViewStyle;
}

// Avatar + title/subtitle/meta + trailing node. Border-only, no hard
// shadow by design — repeated rows (friend lists, conversations,
// notifications, comments) stay quiet so the section/card wrapping them
// carries the shadow instead. See the "visual density" rule in the plan.
export default function ListRow({
  avatarUri,
  avatarName,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  unread,
  style,
}: ListRowProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.row, style]} onPress={onPress} activeOpacity={onPress ? 0.7 : undefined}>
      <Avatar uri={avatarUri} name={avatarName ?? title} size={44} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {unread ? <View style={styles.dot} /> : null}
      {trailing}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.card,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 16,
    padding: 12,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: INK,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  meta: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.accent,
    borderWidth: 1.5,
    borderColor: INK,
  },
});
