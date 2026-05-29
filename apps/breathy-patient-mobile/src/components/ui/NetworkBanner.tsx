import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform, Dimensions } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

// Usually statusBarHeight handles the notch. We'll give it a safe top padding.
const STATUS_BAR_HEIGHT = Constants.statusBarHeight || 44;

export default function NetworkBanner() {
  const netInfo = useNetInfo();
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const [hasEverConnected, setHasEverConnected] = useState(true);

  // We consider it offline if `isConnected` is strictly false OR `isInternetReachable` is strictly false
  // However, isInternetReachable can be null briefly upon startup.
  const isOffline = 
    (netInfo.isConnected === false) || 
    (netInfo.isInternetReachable === false);

  useEffect(() => {
    // Prevent the banner from flashing on fast mounts if internet was already fine
    if (netInfo.isConnected === true) {
      setHasEverConnected(true);
    }
  }, [netInfo.isConnected]);

  useEffect(() => {
    if (isOffline) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
        speed: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, slideAnim]);

  // Don't render anything if it's never been offline and is currently connected
  if (!isOffline && hasEverConnected) {
    // We still keep the View in the tree so it can animate out, but once hidden, it sits off-screen
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <Ionicons name="wifi-outline" size={20} color="#fff" style={styles.icon} />
        <Text style={styles.text}>No Internet Connection. Please check your settings.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 99999, // Super high z-index to sit above everything
    elevation: 99999,
  },
  content: {
    backgroundColor: '#ef4444', // Red-500
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: STATUS_BAR_HEIGHT + 10, // Account for notch
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
