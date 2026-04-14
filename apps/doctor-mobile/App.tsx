import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ActivityIndicator, View, StyleSheet, Alert, Text, LogBox, FlatList, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext } from 'react';
import { database } from './src/database';
import { syncDatabase } from './src/database/sync';
import { useSyncStore } from './src/store/syncStore'; 
SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  '[Sync Engine] Sync failed',
  'AxiosError: Network Error',
  'Request failed with status code 401'
]);

export const DatabaseContext = createContext(database);
export const useDatabase = () => useContext(DatabaseContext);

const DOCTOR_WEB_URL = 'https://doctor.breathy.in';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function DoctorWebShell() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const isSyncing = useSyncStore((state) => state.isSyncing);
  const syncError = useSyncStore((state) => state.syncError);

  useEffect(() => {
    (async () => {
      await Camera.requestCameraPermissionsAsync().catch(() => {});
      await Audio.requestPermissionsAsync().catch(() => {});
      setIsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }
  }, [canGoBack]);

  const handleWebMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'AUTH_TOKEN' && data.payload) {
        console.log("🔐 Received JWT Token from WebView Bridge!");
        await SecureStore.setItemAsync('doctor_jwt', data.payload);
        await syncDatabase();
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  };

  const INJECTED_JAVASCRIPT = `
    (function() {
      window.isNativeApp = true;
      document.documentElement.style.webkitTouchCallout='none';
      document.documentElement.style.webkitUserSelect='none';
      const meta = document.createElement('meta');
      meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      meta.setAttribute('name', 'viewport');
      document.getElementsByTagName('head')[0].appendChild(meta);

      let tokenInterval = setInterval(function() {
        try {
          const rawToken = localStorage.getItem('sb-nvyyhucqrsptqctegnto-auth-token'); 
          
          if (rawToken && !window.nativeTokenSent) {
            let jwtToken = rawToken;
            try {
              const parsedData = JSON.parse(rawToken);
              if (parsedData.access_token) {
                jwtToken = parsedData.access_token;
              }
            } catch (parseError) {}

            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'AUTH_TOKEN', 
              payload: jwtToken 
            }));
            window.nativeTokenSent = true;
            clearInterval(tokenInterval);
          }
        } catch(e) {}
      }, 2000);

    })();
    true;
  `;

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      
      {(isSyncing || syncError) && (
        <View style={[styles.syncBadge, syncError ? styles.syncErrorBadge : styles.syncingBadge]}>
          {isSyncing ? (
            <Ionicons name="sync" size={14} color="#ffffff" style={styles.syncIcon} />
          ) : (
            <Ionicons name="warning" size={14} color="#856404" style={styles.syncIcon} />
          )}
          <Text style={[styles.syncText, syncError ? styles.syncErrorText : null]}>
            {isSyncing ? 'Syncing data...' : `Offline - Changes saved locally`}
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: DOCTOR_WEB_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleWebMessage}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(true);

  useEffect(() => {
    const bootSequence = async () => {
      try {
        const count = await database.get('patients').query().fetchCount();
        console.log(`✅ WatermelonDB is ALIVE! Patient count: ${count}`);

      } catch (e) {
        console.error(`❌ App Boot Sequence failed:`, e);
      }
    };
    bootSequence();
  }, []);

  useEffect(() => {
    if (isAnimationPlaying) {
      const fallbackTimer = setTimeout(() => {
        console.log("⏱️ Lottie timeout reached. Forcing app open.");
        setIsAnimationPlaying(false);
        SplashScreen.hideAsync().catch(() => {});
      }, 3500); // 3.5 seconds
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [isAnimationPlaying]);

  if (isAnimationPlaying) {
    return (
      <View 
        style={styles.animationContainer} 
        onLayout={async () => {
          await SplashScreen.hideAsync().catch(() => {});
        }}
      >
        <LottieView
          source={require('./assets/animation.json')}
          autoPlay
          loop={false}
          style={{ width: 300, height: 300 }}
          onAnimationFinish={() => {
            console.log("🎬 Animation finished naturally.");
            setIsAnimationPlaying(false);
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DatabaseContext.Provider value={database}>
        <DoctorWebShell />
      </DatabaseContext.Provider>      
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  syncBadge: {
    position: 'absolute',
    top: 50, 
    alignSelf: 'center',
    zIndex: 999, 
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  syncingBadge: {
    backgroundColor: '#007AFF',
  },
  syncErrorBadge: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  syncText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncIcon: {
    marginRight: 6,
  },
  syncErrorText: {
    color: '#856404', 
  }
});