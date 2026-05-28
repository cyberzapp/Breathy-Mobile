import React from 'react';
import { View, Text, Platform, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../hooks/useColors';
import {
  Home,
  Stethoscope,
  Sparkles,
  LineChart,
  LayoutGrid
} from 'lucide-react-native';

import HomeScreen from '../screens/dashboard/HomeScreen';
import SearchScreen from '../screens/dashboard/SearchScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';
import TrackerScreen from '../screens/dashboard/TrackerScreen';
import TaraScreen from '../screens/dashboard/TaraScreen';

const Tab = createBottomTabNavigator();

function CustomTabBarButton(props: any) {
  return (
    <View style={styles.customTabContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={props.onPress}
        style={styles.customTabButton}
      >
        {props.children}
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardTabs() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: 'rgba(34,174,158,0.2)',
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.02,
          shadowRadius: 20,
          elevation: 5,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#22ae9e',
        tabBarInactiveTintColor: 'rgba(128, 128, 128,0.8)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Home size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Consult',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Stethoscope size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Tara AI"
        component={View} // Dummy component, we intercept the press
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('TaraScreen');
          },
        })}
        options={{
          tabBarHideOnKeyboard: true,
          tabBarLabel: () => (
            <Text style={styles.taraLabel}>Tara AI</Text>
          ),
          tabBarIcon: () => (
            <LinearGradient
              colors={['#0f172a', '#1b8c7f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taraButton}
            >
              <Image source={require('../../assets/lady_doctor_icon.png')} style={{ width: 44, height: 44, borderRadius: 22 }} />
            </LinearGradient>
          ),
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Track"
        component={TrackerScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <LineChart size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <LayoutGrid size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    padding: 6,
    borderRadius: 12,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(34,174,158,0.1)',
  },
  customTabContainer: {
    flex: 1,
    alignItems: 'center',
  },
  customTabButton: {
    position: 'absolute',
    top: -24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taraButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  taraLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22ae9e',
    marginTop: 32,
  }
});
