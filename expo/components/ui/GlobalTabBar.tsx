import { useRouter, useSegments } from 'expo-router';
import { Compass, QrCode, User, MessageCircle, Search as SearchIcon } from 'lucide-react-native';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import Colors, { INK, palette } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

// Same rule as the header masthead: Android's gesture/nav bar isn't reported
// through safe-area insets the same way, so it keeps its historical fixed
// padding, while iOS/web use the real inset.
function getTabBarPaddingBottom(insets: EdgeInsets) {
  return Platform.OS === 'android' ? 14 : Math.max(insets.bottom, 12);
}

const TABS = [
  { name: 'home', label: 'Discover', icon: Compass, href: '/(tabs)/home' },
  { name: 'search', label: 'Search', icon: SearchIcon, href: '/(tabs)/search' },
  { name: 'tap-in', label: 'Tap-In', icon: QrCode, href: '/(tabs)/tap-in' },
  { name: 'messages', label: 'Messages', icon: MessageCircle, href: '/(tabs)/messages' },
  { name: 'profile', label: 'Profile', icon: User, href: '/(tabs)/profile' },
] as const;

// Rendered once at the app root instead of inside the (tabs) navigator, so
// it stays visible over every screen — post/chat/profile detail pages
// included — rather than disappearing whenever a route outside the tab
// group is pushed on top of it.
export default function GlobalTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useApp();
  const paddingBottom = getTabBarPaddingBottom(insets);

  const activeName = segments[0] === '(tabs)' ? segments[1] ?? 'home' : null;

  return (
    <View style={[styles.tabBar, { paddingBottom }]} pointerEvents="box-none">
      {TABS.map((tab) => {
        const isFocused = tab.name === activeName;
        const color = isFocused ? '#FFFFFF' : Colors.light.tabIconDefault;
        const Icon = tab.icon;

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => router.navigate(tab.href as any)}
            activeOpacity={0.6}
            style={styles.tabItem}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <View style={[styles.pill, isFocused && styles.pillActive]}>
              <View pointerEvents="box-none">
                <Icon size={22} color={color} strokeWidth={2.5} />
                {tab.name === 'messages' && unreadCount > 0 && (
                  <View style={styles.badge} pointerEvents="none">
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // In normal flow (not absolute/fixed): iOS Safari anchors fixed elements
    // to its layout viewport, which extends behind the bottom toolbar and
    // clips the dock. A flow footer inside the 100dvh-bounded root can't be
    // mis-anchored.
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderColor: INK,
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pill: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pillActive: {
    backgroundColor: palette.orange,
    borderWidth: 2,
    borderColor: INK,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.light.tabIconDefault,
    fontWeight: '800' as const,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.light.error,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: INK,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900' as const,
  },
});
