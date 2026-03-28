import { Tabs } from "expo-router";
import { Home, QrCode, Bell, User, MessageCircle, Users } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 14;
  const height = 64 + paddingBottom - 12; // 64 default + extra safe area

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom,
          height,
        },
      ]}
      pointerEvents="box-none"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? Colors.light.primary : Colors.light.tabIconDefault;

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
          ? options.tabBarIcon({ focused: isFocused, color, size: 24 })
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { unreadCount } = useApp();
  const insets = useSafeAreaInsets();

  return (
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: Colors.light.primary,
          tabBarInactiveTintColor: Colors.light.tabIconDefault,
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '700' as const,
          },
          sceneContainerStyle: {
            paddingBottom: 90,
          },
        }}
      >
      <Tabs.Screen
        name="home"
        options={{
          title: "TitanConnect",
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarLabel: "Friends",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tap-in"
        options={{
          title: "Tap-In",
          tabBarIcon: ({ color }) => <QrCode size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <View pointerEvents="box-none">
              <MessageCircle size={24} color={color} />
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
        name="notifications"
        options={{
          title: "Notifications",
          tabBarLabel: "Alerts",
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 50,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    fontWeight: '600' as const,
  },
  tabLabelActive: {
    color: Colors.light.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.light.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
});
