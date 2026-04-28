// apps/doctor-mobile/src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useColors } from '../hooks/useColors';

// INDUSTRY STANDARD: Reuse our modal wrapper for a consistent UI
import KeyboardAwareModal from '../components/ui/KeyboardAwareModal';

type SettingItem = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const signOut = useAuthStore((s) => s.signOut);
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const c = useColors();

  const [showAppInfo, setShowAppInfo] = useState(false);

  const appearance = themeMode === 'light' ? 'day' : themeMode === 'dark' ? 'night' : 'default';
  const setAppearance = (mode: 'day' | 'night' | 'default') => {
    const storeMode = mode === 'day' ? 'light' : mode === 'night' ? 'dark' : 'system';
    setThemeMode(storeMode);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Manage your clinical practice seamlessly with Breathy! Download the app here:\n\nhttps://play.google.com/store/apps/details?id=com.breathy.doctor',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const settingSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Practice',
      items: [
        { title: 'Availability', subtitle: 'Manage your weekly schedule', icon: 'time-outline', color: c.brand, onPress: () => navigation.navigate('AvailabilitySettings') },
        { title: 'Prescription Settings', subtitle: 'Customize header, logo, and defaults', icon: 'document-text-outline', color: c.brand, onPress: () => navigation.navigate('PrescriptionSettings') },
        { title: 'Receptionists', subtitle: 'Manage assistants for your practice', icon: 'people-outline', color: c.brand, onPress: () => navigation.navigate('ReceptionistsSettings') },
      ],
    },
    {
      title: 'Account',
      items: [
        { title: 'Security', subtitle: 'Login history and account safety', icon: 'shield-checkmark-outline', color: c.brand, onPress: () => navigation.navigate('SecuritySettings') },
      ],
    },
    {
      title: 'About',
      items: [
        { title: 'Help Center', subtitle: 'FAQs and support articles', icon: 'help-circle-outline', color: c.brand, onPress: () => navigation.navigate('HelpSettings') },
        { title: 'Terms & Policies', subtitle: 'Financial & conduct rules', icon: 'document-lock-outline', color: c.brand, onPress: () => navigation.navigate('TermsSettings') },
        { 
          title: 'App Version', 
          subtitle: 'v2.0.0 (Native)', 
          icon: 'information-circle-outline', 
          color: c.brand, 
          onPress: () => setShowAppInfo(true) // Triggers our new modal
        },
      ],
    },
  ];

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 10 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Summary */}
        <TouchableOpacity
          style={[s.profileSummary, { backgroundColor: c.card }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={[s.profileAvatarBox, { backgroundColor: c.brandBg }]}>
            <Text style={[s.profileInitial, { color: c.brand }]}>
              {profileStatus?.full_name?.charAt(0)?.toUpperCase() || 'D'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.profileName, { color: c.text }]}>
              Dr. {profileStatus?.full_name || 'Doctor'}
            </Text>
            <Text style={[s.profileStatus, { color: c.brand }]}>
              {profileStatus?.profile_status === 'approved' ? '✓ Verified' : 'Pending'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
        </TouchableOpacity>

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <View key={section.title} style={{ marginBottom: 20 }}>
            <Text style={[s.sectionTitle, { color: c.textTertiary }]}>{section.title}</Text>
            <View style={[s.sectionCard, { backgroundColor: c.card }]}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.title}
                  style={[
                    s.settingItem,
                    index < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
                  ]}
                  activeOpacity={item.onPress ? 0.6 : 1}
                  onPress={item.onPress}
                >
                  <View style={[s.settingIcon, { backgroundColor: c.brandBg }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.settingTitle, { color: c.text }]}>{item.title}</Text>
                    {item.subtitle && <Text style={[s.settingSubtitle, { color: c.textTertiary }]}>{item.subtitle}</Text>}
                  </View>
                  {item.onPress && <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Appearance Section */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[s.sectionTitle, { color: c.textTertiary }]}>Appearance</Text>
          <View style={[s.sectionCard, { backgroundColor: c.card }]}>
            <View style={s.appearanceRow}>
              {(['day', 'night', 'default'] as const).map((mode) => {
                const isActive = appearance === mode;
                const modeConfig = {
                  day: { icon: 'sunny-outline' as const, label: 'Day' },
                  night: { icon: 'moon-outline' as const, label: 'Night' },
                  default: { icon: 'contrast-outline' as const, label: 'Default' },
                };
                const config = modeConfig[mode];
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      s.appearanceButton,
                      { backgroundColor: isActive ? c.brand : c.cardAlt },
                    ]}
                    onPress={() => setAppearance(mode)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={config.icon} size={20} color={isActive ? '#ffffff' : c.icon} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#ffffff' : c.icon }}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[s.signOutButton, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={c.error} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.error }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* App Version & Share Modal */}
      <KeyboardAwareModal
        visible={showAppInfo}
        onClose={() => setShowAppInfo(false)}
        title="About Breathy"
      >
        <View style={s.modalContent}>
          <View style={[s.logoBox, { backgroundColor: c.brandBg }]}>
            <Ionicons name="medical" size={40} color={c.brand} />
          </View>
          <Text style={[s.appName, { color: c.text }]}>Breathy Doctor</Text>
          <Text style={[s.versionText, { color: c.textTertiary }]}>Version 2.0.0</Text>

          <Text style={[s.thankYouText, { color: c.textSecondary }]}>
            Thank you for being a part of the Breathy community! We are dedicated to making your clinical practice management seamless and efficient.
          </Text>

          <TouchableOpacity
            style={[s.shareBtn, { backgroundColor: c.brand }]}
            onPress={handleShareApp}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={s.shareBtnText}>Share Breathy App</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareModal>
    </View>
  );
}

const s = StyleSheet.create({
  profileSummary: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1, gap: 14 },
  profileAvatarBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileStatus: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  sectionCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontSize: 14, fontWeight: '600' },
  settingSubtitle: { fontSize: 12, marginTop: 2 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 12, borderWidth: 1 },
  appearanceRow: { flexDirection: 'row', padding: 12, gap: 10 },
  appearanceButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  
  // App Info Modal Styles
  modalContent: { alignItems: 'center', paddingVertical: 20 },
  logoBox: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  versionText: { fontSize: 14, marginBottom: 24, fontFamily: 'monospace' },
  thankYouText: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 32 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});