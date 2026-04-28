import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useColors } from '../hooks/useColors';
import { useThemeStore } from '../store/themeStore';

// ---------------------------------------------------------------------------
// SharedHeader — Persistent Header across all tabs (Theme-Aware)
// ---------------------------------------------------------------------------

interface SharedHeaderProps {
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
}

export default function SharedHeader({
  onProfilePress,
  onNotificationPress,
}: SharedHeaderProps) {
  const insets = useSafeAreaInsets();
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const [activeMode, setActiveMode] = useState<'relax' | 'live'>('relax');
  const c = useColors();
  const resolved = useThemeStore((s) => s.resolved);

  const profilePhotoUrl = profileStatus?.profile_photo_url;
  const doctorInitial = profileStatus?.full_name?.charAt(0)?.toUpperCase() || 'D';

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 4, backgroundColor: c.headerBg, borderBottomColor: c.border }]}>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.headerBg} />

      {/* ─── Left: Logo ─── */}
      <View style={styles.leftSection}>
        <Image
          source={require('../../assets/breathy_logo.png')}
          style={styles.logoImage}
        />
      </View>

      {/* ─── Center: Mode Toggle ─── */}
      {/* <View style={[styles.modeToggleContainer, { backgroundColor: c.cardAlt }]}>
        <TouchableOpacity
          style={[styles.modeButton, activeMode === 'relax' && styles.modeButtonActiveRelax]}
          onPress={() => setActiveMode('relax')}
          activeOpacity={0.7}
        >
          <Ionicons name="leaf-outline" size={14} color={activeMode === 'relax' ? '#ffffff' : c.textTertiary} />
          <Text style={[styles.modeButtonText, { color: c.textTertiary }, activeMode === 'relax' && styles.modeButtonTextActive]}>
            Relax
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, activeMode === 'live' && styles.modeButtonActiveLive]}
          onPress={() => setActiveMode('live')}
          activeOpacity={0.7}
        >
          <View style={[styles.liveDot, { backgroundColor: activeMode === 'live' ? '#ffffff' : c.textTertiary }]} />
          <Text style={[styles.modeButtonText, { color: c.textTertiary }, activeMode === 'live' && styles.modeButtonTextActive]}>
            Live
          </Text>
        </TouchableOpacity>
      </View> */}

      {/* ─── Right: Notifications + Profile ─── */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: c.cardAlt }]}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={c.textSecondary} />
          <View style={[styles.bellDot, { borderColor: c.headerBg }]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.7}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: c.brandBg }]}>
              <Text style={[styles.avatarInitial, { color: c.brand }]}>{doctorInitial}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 34, height: 34, borderRadius: 10 },
  modeToggleContainer: { flexDirection: 'row', borderRadius: 20, padding: 3 },
  modeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 17, gap: 5 },
  modeButtonActiveRelax: { backgroundColor: '#22ae9e' },
  modeButtonActiveLive: { backgroundColor: '#ef4444' },
  modeButtonText: { fontSize: 12, fontWeight: '700' },
  modeButtonTextActive: { color: '#ffffff' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1.5 },
  avatarButton: { width: 36, height: 36, borderRadius: 12, overflow: 'hidden' },
  avatarImage: { width: 36, height: 36, borderRadius: 12 },
  avatarFallback: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 15, fontWeight: '700' },
});
