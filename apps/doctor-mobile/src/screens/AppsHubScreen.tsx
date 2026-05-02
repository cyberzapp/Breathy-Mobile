import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../hooks/useColors';
import { useBreathySounds } from '../hooks/useBreathySounds';
import RecentPrescriptionsWidget from '../components/prescription/RecentPrescriptionsWidget';

// ---------------------------------------------------------------------------
// AppsHubScreen — Center tab opening the Apps Hub
// ---------------------------------------------------------------------------
// Mirrors the web's AppsHubPage.jsx. Now fully wired with navigation:
//   - Breathy Desk, Invoice Manager, Financials → native screens
//   - Write, Reports, Notifications → WebView
//   - Subscription, Help → native screens
//   - Referral Rewards → WebView
//   - Prescription card: tap → new prescription, LONG-PRESS → recent history
// ---------------------------------------------------------------------------

type AppItem = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  requiresOnline?: boolean;
  route?: string;         // native stack route
  webViewPath?: string;   // WebView path (for SectionWebView)
  webViewTitle?: string;  // title shown in WebView header
};

const CORE_APPS: AppItem[] = [
  // {
  //   title: 'Prescription',
  //   description: 'Write digital or freehand prescriptions',
  //   icon: 'document-text-outline',
  //   color: '#22ae9e',
  //   bgColor: '#f0fdfa',
  //   route: 'Prescription',
  // },
  {
    title: 'Breathy Desk',
    description: 'Your complete practice management suite',
    icon: 'briefcase-outline',
    color: '#14b8a6',
    bgColor: '#f0fdfa',
    route: 'BreathyDesk',
  },
  {
    title: 'Diet Plans',
    description: 'Create and manage nutrition templates',
    icon: 'nutrition-outline',
    color: '#10b981',
    bgColor: '#ecfdf5',
    route: 'DietPlanApp',
  },
  {
    title: 'Invoice Manager',
    description: 'Create, send, and track invoices',
    icon: 'receipt-outline',
    color: '#6366f1',
    bgColor: '#eef2ff',
    route: 'InvoiceManager',
  },
  // {
  //   title: 'Billing & Payouts',
  //   description: 'Manage earnings and transactions',
  //   icon: 'card-outline',
  //   color: '#f59e0b',
  //   bgColor: '#fef3c7',
  //   route: 'Financials',
  // },
  // {
  //   title: 'Referral Rewards',
  //   description: 'Manage your reward program',
  //   icon: 'people-outline',
  //   color: '#ec4899',
  //   bgColor: '#fdf2f8',
  //   webViewPath: '/apps/refer-reward',
  //   webViewTitle: 'Referral Rewards',
  // },
];

const MORE_PAGES: AppItem[] = [
  {
    title: 'Write',
    description: 'Create and manage blog posts',
    icon: 'pencil-outline',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    requiresOnline: true,
    webViewPath: '/blog-manager',
    webViewTitle: 'Blog Manager',
  },
  {
    title: 'Reports',
    description: 'View analytics and insights',
    icon: 'bar-chart-outline',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    requiresOnline: true,
    webViewPath: '/reports',
    webViewTitle: 'Reports',
  },
  // {
  //   title: 'Notifications',
  //   description: 'View all your notifications',
  //   icon: 'notifications-outline',
  //   color: '#f97316',
  //   bgColor: '#fff7ed',
  //   webViewPath: '/notifications',
  //   webViewTitle: 'Notifications',
  // },
  // {
  //   title: 'Subscription',
  //   description: 'Manage your plan',
  //   icon: 'diamond-outline',
  //   color: '#a855f7',
  //   bgColor: '#faf5ff',
  //   requiresOnline: true,
  //   route: 'Subscription',
  // },
  // {
  //   title: 'Help',
  //   description: 'FAQs and support articles',
  //   icon: 'help-circle-outline',
  //   color: '#64748b',
  //   bgColor: '#f8fafc',
  //   route: 'Help',
  // },
];

export default function AppsHubScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { playPop } = useBreathySounds();
  const [showHistory, setShowHistory] = useState(false);

  const handlePress = (app: AppItem) => {
    playPop();
    if (app.route) {
      navigation.navigate(app.route);
    } else if (app.webViewPath) {
      navigation.navigate('SectionWebView', {
        title: app.webViewTitle || app.title,
        path: app.webViewPath,
      });
    }
  };

  const handleLongPress = (app: AppItem) => {
    if (app.title === 'Prescription') {
      playPop();
      setShowHistory(true);
    }
  };

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 10 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: c.text }]}>Apps</Text>
      <Text style={[styles.pageSubtitle, { color: c.textTertiary }]}>
        Tools and services to manage and grow your practice.
      </Text>

      {/* Core Apps */}
      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Practice Tools</Text>
      <View style={styles.appsGrid}>
        {CORE_APPS.map((app) => (
          <AppCard
            key={app.title}
            app={app}
            onPress={() => handlePress(app)}
            onLongPress={() => handleLongPress(app)}
          />
        ))}
      </View>

      {/* More Pages */}
      <Text style={[styles.sectionTitle, { marginTop: 28, color: c.textSecondary }]}>More</Text>
      <View style={[styles.moreList, { backgroundColor: c.card }]}>
        {MORE_PAGES.map((app) => (
          <MoreListItem
            key={app.title}
            app={app}
            onPress={() => handlePress(app)}
          />
        ))}
      </View>
    </ScrollView>

    {/* Recent Prescriptions Floating Widget — MUST be outside ScrollView */}
    <RecentPrescriptionsWidget
      visible={showHistory}
      onClose={() => setShowHistory(false)}
    />
    </>
  );
}

function AppCard({
  app,
  onPress,
  onLongPress,
}: {
  app: AppItem;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const c = useColors();
  const isPrescription = app.title === 'Prescription';
  const longPressedRef = useRef(false);

  const handlePressIn = useCallback(() => {
    longPressedRef.current = false;
  }, []);

  const handleLongPress = useCallback(() => {
    longPressedRef.current = true;
    onLongPress?.();
  }, [onLongPress]);

  const handlePress = useCallback(() => {
    // Guard: don't fire onPress if onLongPress just fired
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onPress();
  }, [onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.appCard,
        { backgroundColor: c.card },
        pressed && { opacity: 0.7 },
      ]}
      onPressIn={handlePressIn}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <View style={[styles.appIconBox, { backgroundColor: app.bgColor }]}>
        <Ionicons name={app.icon} size={24} color={app.color} />
      </View>
      <Text style={[styles.appTitle, { color: c.text }]}>{app.title}</Text>
      <Text style={[styles.appDesc, { color: c.textTertiary }]} numberOfLines={2}>
        {app.description}
      </Text>
      {isPrescription && (
        <View style={styles.longPressHint}>
          <Ionicons name="time-outline" size={11} color="#94a3b8" />
          <Text style={styles.longPressHintText}>Hold for history</Text>
        </View>
      )}
    </Pressable>
  );
}

function MoreListItem({
  app,
  onPress,
}: {
  app: AppItem;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <TouchableOpacity style={[styles.moreItem, { borderBottomColor: c.border }]} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.moreIconBox, { backgroundColor: app.bgColor }]}>
        <Ionicons name={app.icon} size={20} color={app.color} />
      </View>
      <View style={styles.moreTextBox}>
        <Text style={[styles.moreTitle, { color: c.text }]}>{app.title}</Text>
        <Text style={[styles.moreDesc, { color: c.textTertiary }]} numberOfLines={1}>
          {app.description}
        </Text>
      </View>
      {app.requiresOnline && (
        <View style={styles.onlineBadge}>
          <Ionicons name="cloud-outline" size={12} color="#6366f1" />
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1e293b' },
  pageSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4, marginBottom: 24 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  // Apps Grid
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  appCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  appDesc: { fontSize: 12, color: '#94a3b8', lineHeight: 17 },
  longPressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    opacity: 0.6,
  },
  longPressHintText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },

  // More List
  moreList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  moreIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreTextBox: { flex: 1 },
  moreTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  moreDesc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  onlineBadge: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#eef2ff',
  },
});
