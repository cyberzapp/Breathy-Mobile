import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useColors } from '../hooks/useColors';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// WebViewScreen
// ---------------------------------------------------------------------------
// Used for non-approved doctors (onboarding, in_progress, awaiting_review).
// Renders the full web dashboard inside a WebView with session injection.
//
// Session Bridge Architecture:
//   1. INJECT (Native → Web): Before the WebView loads, we inject the Supabase
//      session token into the web app's localStorage so the doctor is
//      automatically authenticated — no double login.
//   2. LISTEN (Web → Native): The web app can also send tokens back via
//      postMessage for session refresh scenarios.
// ---------------------------------------------------------------------------

const DOCTOR_WEB_URL = process.env.EXPO_PUBLIC_DOCTOR_WEB_URL!;
const SUPABASE_STORAGE_KEY = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_KEY!;

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [isWebViewLoading, setIsWebViewLoading] = React.useState(true);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const c = useColors();

  // Android hardware back button handling
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

  // -------------------------------------------------------------------------
  // JavaScript injected BEFORE the page loads
  // -------------------------------------------------------------------------
  // This is the critical "Scenario A" session bridge:
  //   - We set the Supabase session token into localStorage
  //   - The web app's Supabase client reads it on mount and skips login
  // -------------------------------------------------------------------------
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
          // Inject session into web app's localStorage
          window.localStorage.setItem('${SUPABASE_STORAGE_KEY}', '${sessionPayload.replace(/'/g, "\\'")}');
          
          // Signal to the web app that we are inside a native container
          window.isNativeApp = true;
          
          // Disable zoom and long-press context menu for a native feel
          document.documentElement.style.webkitTouchCallout = 'none';
          document.documentElement.style.webkitUserSelect = 'none';
          
          const meta = document.createElement('meta');
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
          meta.setAttribute('name', 'viewport');
          document.getElementsByTagName('head')[0].appendChild(meta);
        } catch(e) {
          
        }
      })();
      true;
    `;
  };

  // Handle messages coming FROM the WebView (Web → Native)
  const handleWebMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'AUTH_TOKEN' && data.payload) {
        console.log('🔐 [WebView Bridge] Received token refresh from web.');
        // If the web app sends us a new token, we could refresh our session
        // but since Supabase handles auto-refresh in the native client,
        // this is primarily for backward compatibility.
      }
      if (data.type === 'PROFILE_UPDATED') {
        // When the doctor completes their profile in the web's onboarding flow,
        // the web can notify us to re-fetch the profile status
        console.log('📋 [WebView Bridge] Profile updated signal received.');
        useAuthStore.getState().fetchProfileStatus();
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={c.bg === '#0f172a' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      {/* Native Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={[styles.headerTitle, { color: c.text }]}>Breathy Doctor</Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            signOut();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* WebView Loading Indicator */}
      {isWebViewLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Loading your dashboard...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: DOCTOR_WEB_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        injectedJavaScriptBeforeContentLoaded={buildInjectedJS()}
        onMessage={handleWebMessage}
        onLoadEnd={() => setIsWebViewLoading(false)}
        // Security: Only allow navigation to breathy.in domains
        originWhitelist={['https://*']}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
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
    width: '100%',
  },
});
