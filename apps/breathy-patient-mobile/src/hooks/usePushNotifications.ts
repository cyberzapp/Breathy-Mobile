import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import apiClient from '../lib/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
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
    await Notifications.setNotificationChannelAsync('breathy_alerts_v3', {
      name: 'Breathy Default Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22ae9e',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('[PushNotifications] Permission not granted!');
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0c64e6f4-07ea-4bd6-aa3a-d907d32235fd', 
    });

    await apiClient.post('/api/notifications/register-device', {
      device_token: tokenData.data,
      device_type: Platform.OS
    });
    
    console.log('[PushNotifications] Token registered successfully:', tokenData.data);
  } catch (error) {
    console.error('[PushNotifications] Device token registration failed:', error);
  }
}
