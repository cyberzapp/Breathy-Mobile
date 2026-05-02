import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import apiClient from '../lib/apiClient';
import { Logger } from '../utils/logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('breathy_alerts_v2', {
      name: 'Breathy Alerts',
      importance: Notifications.AndroidImportance.MAX, // Forces Heads-Up globally!
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00A859',
      sound: 'breathy_alert.wav', // Your custom sound
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID, 
    });

    // 🚀 Calling your EXACT existing endpoint and variables
    await apiClient.post('/api/notifications/register-device', {
      device_token: tokenData.data,
      device_type: Platform.OS
    });
    
    
  } catch (error) {
    Logger.error('Device token registration failed', error, { source: 'usePushNotifications' });
  }
}