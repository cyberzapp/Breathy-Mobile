import React, { useRef, useEffect } from 'react';
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
import { useAuthStore } from '../store/authStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useColors } from '../hooks/useColors';

// ---------------------------------------------------------------------------
// SectionWebViewScreen
// ---------------------------------------------------------------------------
// A reusable WebView screen that opens a specific section of the web dashboard.
// Receives `title` and `path` as route params.
//
// Examples:
//   { title: 'Prescriptions', path: '/prescriptions' }
//   { title: 'Calendar', path: '/settings' }
//   { title: 'Transactions', path: '/billing' }
// ---------------------------------------------------------------------------

const DOCTOR_WEB_URL = process.env.EXPO_PUBLIC_DOCTOR_WEB_URL!;
const SUPABASE_STORAGE_KEY = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_KEY!;

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
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [isWebViewLoading, setIsWebViewLoading] = React.useState(true);
  const session = useAuthStore((s) => s.session);
  const c = useColors();

  const fullUrl = `${DOCTOR_WEB_URL}${path}`;

  // Android hardware back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        navigation.goBack();
        return true;
      });
      return () => handler.remove();
    }
  }, [canGoBack, navigation]);

  // Session injection (same as WebViewScreen)
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

    return `
      (function() {
        try {
          window.localStorage.setItem('${SUPABASE_STORAGE_KEY}', '${sessionPayload.replace(/'/g, "\\'")}');
          window.isNativeApp = true;
          window.dispatchEvent(new Event('native'));
          window.postMessage({ type: 'SET_NATIVE_MODE', isNative: true }, '*');
          document.documentElement.style.webkitTouchCallout = 'none';
          document.documentElement.style.webkitUserSelect = 'none';

          // CSS Injection: Hide web app sidebar/header for native wrapper
          var nativeStyle = document.createElement('style');
          nativeStyle.textContent = '.MuiDrawer-root, .MuiDrawer-docked, [class*=Sidebar], [class*=sidebar], nav, header, [class*=Header], [class*=header], [class*=TopBar], [class*=topbar], [class*=MobileNav], .MuiAppBar-root, .MuiBottomNavigation-root { display: none !important; width: 0 !important; min-width: 0 !important; overflow: hidden !important; } main, [class*=content], [class*=main], [class*=layout_content] { margin-left: 0 !important; padding-left: 0 !important; width: 100% !important; max-width: 100% !important; flex: 1 !important; }';
          document.head.appendChild(nativeStyle);
        } catch(e) {
        }
      })();
      true;
    `;
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header with back button */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Loading */}
      {isWebViewLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#22ae9e" />
          <Text style={styles.loadingText}>Loading {title}...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: fullUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        startInLoadingState={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        injectedJavaScriptBeforeContentLoaded={buildInjectedJS()}
        onLoadEnd={() => setIsWebViewLoading(false)}
        originWhitelist={['https://*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  webview: {
    flex: 1,
  },
});
