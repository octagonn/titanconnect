import type { ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import HardShadow from './HardShadow';
import Colors, { INK } from '@/constants/colors';

type ButtonIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  color?: string;
  icon?: ButtonIcon;
  disabled?: boolean;
  loading?: boolean;
  withShadow?: boolean;
  style?: ViewStyle;
}

// Generalizes the app's various one-off button treatments (postButton,
// profileButton, cta, actionBtn, shareBtn) into one primitive.
export default function Button({
  label,
  onPress,
  variant = 'primary',
  color,
  icon: Icon,
  disabled,
  loading,
  withShadow,
  style,
}: ButtonProps) {
  const backgroundColor =
    variant === 'ghost' ? 'transparent' : color ?? (variant === 'primary' ? Colors.light.primary : Colors.light.card);
  const textColor = variant === 'primary' ? '#FFFFFF' : INK;
  const shadow = withShadow ?? variant === 'primary';

  return (
    <View style={[styles.wrap, style]}>
      {shadow && !disabled ? <HardShadow offset={5} radius={14} /> : null}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.btn,
          {
            backgroundColor,
            borderWidth: variant === 'ghost' ? 0 : 2.5,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            {Icon ? <Icon size={16} color={textColor} strokeWidth={2.5} /> : null}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: INK,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '900' as const,
    letterSpacing: 0.3,
  },
});
