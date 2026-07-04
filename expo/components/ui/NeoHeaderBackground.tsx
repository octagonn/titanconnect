import { StyleSheet, View } from 'react-native';
import { INK, palette } from '@/constants/colors';

// Flat navy masthead shared by the root Stack and the Tabs navigator,
// replacing the frosted-glass header. No blur, no translucency — a solid
// brand-color bar with a thick ink bottom edge.
export default function NeoHeaderBackground() {
  return <View style={[StyleSheet.absoluteFill, styles.bar]} />;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: palette.navy,
    borderBottomWidth: 3,
    borderBottomColor: INK,
  },
});
