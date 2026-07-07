import { Tabs, useRouter } from "expo-router";
import { Compass, QrCode, Bell, Calendar, User, MessageCircle, Search as SearchIcon } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import Colors, { INK } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import NeoHeaderBackground from "@/components/ui/NeoHeaderBackground";
import CreateMenuButton from "@/components/ui/CreateMenuButton";

function BrandTitle() {
  return <Text style={styles.brandTitle}>TitanConnect</Text>;
}

function CalendarButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/my-activity' as any)}
      style={styles.calendarButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="my-activity-button"
    >
      <Calendar size={20} color="#FFFFFF" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

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

function HeaderRight() {
  return (
    <View style={styles.headerRightRow}>
      <CalendarButton />
      <NotificationBell />
    </View>
  );
}

export default function TabLayout() {
  const { unreadCount } = useApp();

  return (
      <Tabs
        // The bottom dock is rendered once at the app root (GlobalTabBar, in
        // app/_layout.tsx) so it stays visible over screens outside this
        // group too (post/chat/profile detail) — this navigator only needs
        // its screens, not its own bar.
        tabBar={() => null}
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
          headerTitleAlign: 'center',
          // headerLeft/headerRight aren't equal widths (the right side carries
          // two buttons), so the default "centered in the space between them"
          // layout drifts left. An absolute, full-width container centers the
          // wordmark against the whole bar instead, with the side buttons
          // painted on top of it.
          headerTitleContainerStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
          },
          // The navy masthead prints the app wordmark instead of a per-tab
          // title — per-tab labels already live on the bottom dock below.
          headerTitle: () => <BrandTitle />,
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
          headerRight: () => <HeaderRight />,
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
  brandTitle: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 16,
  },
  calendarButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellButton: {
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
