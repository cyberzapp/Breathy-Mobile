import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useColors } from '../../hooks/useColors';

const PATIENT_WEB_URL = process.env.EXPO_PUBLIC_PATIENT_WEB_URL || 'https://breathy.in';
const SUPABASE_STORAGE_KEY = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_KEY || 'sb-uquprmicrpkubvjksbve-auth-token';

type SectionWebViewParams = {
  SectionWebView: {
    title: string;
    path: string;
  };
};

export default function SectionWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SectionWebViewParams, 'SectionWebView'>>();
  const { title, path } = route.params;

  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const session = useAuthStore((s) => s.session);
  const c = useColors();

  const fullUrl = `${PATIENT_WEB_URL}${path}`;

  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }
  }, [canGoBack]);

  const buildInjectedJS = () => {
    if (!session) return 'true;';

    const sessionPayload = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: session.user,
    });

    // We inject the session into localStorage and also as a cookie for maximum compatibility
    // We also set a global flag so the web app knows it is running inside the native wrapper
    return `
      (function() {
        try {
          var sessionData = '${sessionPayload.replace(/'/g, "\\'")}';
          var storageKey = '${SUPABASE_STORAGE_KEY}';
          
          // 1. Set localStorage
          window.localStorage.setItem(storageKey, sessionData);
          
          // 2. Set Cookie (Fallback for some middleware/SSR checks)
          var cookieValue = encodeURIComponent(sessionData);
          document.cookie = storageKey + "=" + cookieValue + "; path=/; max-age=3600; SameSite=Lax";
          
          // 3. Set global flags
          window.isNativeApp = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTH_SYNCED' }));
          
          // 4. Dispatch events for SPA frameworks to react
          window.dispatchEvent(new Event('native-auth-ready'));
          
          // 5. Visual polish: Hide web-specific navigation
          var style = document.createElement('style');
          style.innerHTML = 'nav, header, footer, .MuiDrawer-root, [class*="Header"], [class*="Footer"], #web-nav { display: none !important; } body { padding-top: 0 !important; }';
          document.head.appendChild(style);
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTH_ERROR', error: e.message }));
        }
      })();
      true;
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'AUTH_SYNCED') {
        console.log('[WebView] Auth successfully synced to web');
      } else if (data.type === 'AUTH_ERROR') {
        console.error('[WebView] Auth sync error:', data.error);
      }
    } catch (e) {
      // Not our message
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: c.cardAlt }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {isWebViewLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Loading {title}...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: fullUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        injectedJavaScriptBeforeContentLoaded={buildInjectedJS()}
        injectedJavaScript={buildInjectedJS()} // Run again after load to be sure
        onMessage={handleMessage}
        onLoadEnd={() => setIsWebViewLoading(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 64,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
});
