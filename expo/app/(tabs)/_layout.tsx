import { Tabs, useRouter } from "expo-router";
import { Compass, QrCode, Bell, User, MessageCircle, Search as SearchIcon } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import Colors, { INK, palette } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import NeoHeaderBackground from "@/components/ui/NeoHeaderBackground";
import CreateMenuButton from "@/components/ui/CreateMenuButton";

function NotificationBell() {
  const router = useRouter();
  const { notificationCount } = useApp();

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      style={styles.bellButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="notification-bell"
    >
      <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
      {notificationCount > 0 && (
        <View style={styles.bellBadge} pointerEvents="none">
          <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Android's gesture/nav bar isn't reported through safe-area insets the same
// way, so it keeps its historical fixed padding. iOS and web (incl. iOS
// Safari, where env(safe-area-inset-bottom) reports the home-indicator
// height once viewport-fit=cover is set — see app/+html.tsx) use the real inset.
function getTabBarPaddingBottom(insets: EdgeInsets) {
  return Platform.OS === 'android' ? 14 : Math.max(insets.bottom, 12);
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = getTabBarPaddingBottom(insets);

  // No fixed height: the bar sizes itself from its content (icon + label +
  // item padding) plus the safe-area padding. A hardcoded height used to
  // undercut the content by ~11px, clipping the bottom of the labels.
  return (
    <View
      style={[styles.tabBar, { paddingBottom }]}
      pointerEvents="box-none"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? '#FFFFFF' : Colors.light.tabIconDefault;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const renderIcon = options.tabBarIcon
          ? options.tabBarIcon({ focused: isFocused, color, size: 22 })
          : null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.6}
            style={styles.tabItem}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <View style={[styles.pill, isFocused && styles.pillActive]}>
              {renderIcon}
              {typeof label === 'string' ? (
                <Text
                  style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {label}
                </Text>
              ) : (
                label
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { unreadCount } = useApp();

  return (
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: Colors.light.tabIconDefault,
          // With animations, inactive scenes get an Animated activityState
          // that react-native-screens' web Screen can't compare against 0,
          // so they never get display:none — and transparent scenes then
          // show stale tabs stacked beneath the active one.
          animation: 'none',
          headerShown: true,
          // Solid navy masthead with a thick ink bottom edge.
          headerBackground: () => <NeoHeaderBackground />,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '900' as const,
            color: '#FFFFFF',
          },
          // The navy masthead no longer prints a title — it's redundant with
          // the bottom dock's per-tab labels (tabBarLabel/title below).
          headerTitle: () => null,
          // Transparent scenes let the flat cream canvas underneath show through.
          sceneStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
      <Tabs.Screen
        name="home"
        options={{
          title: "Discover",
          tabBarLabel: "Discover",
          tabBarIcon: ({ color }) => <Compass size={22} color={color} strokeWidth={2.5} />,
          headerLeft: () => <CreateMenuButton />,
          headerRight: () => <NotificationBell />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <SearchIcon size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="tap-in"
        options={{
          title: "Tap-In",
          tabBarIcon: ({ color }) => <QrCode size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <View pointerEvents="box-none">
              <MessageCircle size={22} color={color} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <View style={styles.badge} pointerEvents="none">
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // In normal flow (react-navigation's default footer layout) rather than
    // absolute/fixed: iOS Safari anchors fixed elements to its layout
    // viewport, which extends behind the bottom toolbar and clips the dock.
    // A flow footer inside the 100dvh-bounded root can't be mis-anchored.
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
  bellButton: {
    marginRight: 16,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
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
});
