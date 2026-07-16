import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, CalendarDays, Dumbbell, TrendingUp } from 'lucide-react-native';

// We will create these screens next
import DiscoverScreen from '../screens/workout/DiscoverScreen';
import RoutinePlannerScreen from '../screens/workout/RoutinePlannerScreen';
import ExerciseDirectoryScreen from '../screens/workout/ExerciseDirectoryScreen';
import WorkoutProgressScreen from '../screens/workout/WorkoutProgressScreen';
import RecoveryScreen from '../screens/workout/RecoveryScreen';
import { Activity } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function WorkoutTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Planned"
        component={RoutinePlannerScreen}
        options={{
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExerciseDirectoryScreen}
        options={{
          tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={WorkoutProgressScreen}
        options={{
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Recovery"
        component={RecoveryScreen}
        options={{
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});
