import { Tabs } from "expo-router";
import { Home, QrCode, Calendar, User, MessageCircle } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet } from "react-native";

import Colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

export default function TabLayout() {
  const { unreadCount } = useApp();

  return (
      <Tabs
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
          tabBarStyle: {
            backgroundColor: Colors.light.background,
            borderTopWidth: 1,
            borderTopColor: Colors.light.border,
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
            <View>
              <MessageCircle size={24} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
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
