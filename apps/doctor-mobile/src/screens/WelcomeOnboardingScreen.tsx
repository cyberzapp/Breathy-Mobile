// ---------------------------------------------------------------------------
// WelcomeOnboardingScreen — Exact Port of Web's Onboarding.jsx
// ---------------------------------------------------------------------------
// Web Flow (from App.jsx):
//   profile_status === 'onboarding' → renders <Onboarding />
//   Onboarding.jsx collects { prefix, fullName } and calls:
//     createProfile(formData) → profileStore.createProfile()
//       → POST /api/doctors/me/profile
//       → fetchInitialStatus(true) → profile_status changes to 'in_progress'
//       → App.jsx re-renders → shows <ProfileLayout />
//
// This screen is the FIRST step of the mobile onboarding flow.
// It only collects the doctor's prefix and full name, then creates the
// parent row in the 'doctors' table. After success, fetchProfileStatus()
// refreshes the auth store, profile_status becomes 'in_progress', and
// RootNavigator.tsx shows the NativeOnboardingScreen for the remaining steps.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { useAuthStore } from '../store/authStore';
import { createDoctorProfile } from '../services/profileService';

export default function WelcomeOnboardingScreen() {
  const c = useColors();
  const fetchProfileStatus = useAuthStore((s) => s.fetchProfileStatus);

  const [prefix, setPrefix] = useState('Dr.');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard-aware padding (same pattern as KeyboardAwareModal)
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  const isValid = fullName.trim().length > 2;

  // Exact match of web's Onboarding.jsx onSubmit
  const handleCreateProfile = async () => {
    if (!isValid) return;

    setIsLoading(true);
    try {
      // Web: await createProfile(formData)
      // profileStore.createProfile() → POST /api/doctors/me/profile
      await createDoctorProfile({ prefix, fullName: fullName.trim() });

      // Web: profileStore.createProfile() → await get().fetchInitialStatus(true)
      // This refreshes profileStatus to 'in_progress', causing RootNavigator
      // to re-render and show NativeOnboardingScreen
      await fetchProfileStatus();
    } catch (error: any) {
      // Handle 409 (profile already exists) gracefully
      if (error?.message?.includes('409') || error?.message?.includes('already exists')) {
        // Profile exists, just refresh status to move forward
        await fetchProfileStatus();
      } else {
        Alert.alert('Error', error.message || 'An error occurred while creating your profile.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <Animated.View style={[styles.container, { paddingBottom: keyboardHeight }]}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: '#ccfbf1' }]}>
            <Ionicons name="medkit-outline" size={40} color="#14b8a6" />
          </View>

          <Text style={[styles.title, { color: c.text }]}>Welcome to Breathy</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Let's create your professional profile to get you started.
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
          {/* Prefix Selector */}
          <Text style={[styles.label, { color: c.textSecondary }]}>Prefix</Text>
          <View style={styles.prefixRow}>
            {['Dr.', 'Prof.'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.prefixBtn,
                  { borderColor: prefix === p ? '#14b8a6' : c.borderMedium },
                  prefix === p && styles.prefixBtnActive,
                ]}
                onPress={() => setPrefix(p)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.prefixText,
                    { color: prefix === p ? '#fff' : c.textSecondary },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Full Name Input */}
          <Text style={[styles.label, { color: c.textSecondary, marginTop: 20 }]}>Full Name</Text>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: c.input, borderColor: fullName.length > 2 ? '#10b981' : c.borderMedium },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={fullName.length > 2 ? '#10b981' : c.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: c.text }]}
              placeholder="e.g., Anirban Banerjee"
              placeholderTextColor={c.textTertiary}
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateProfile}
            />
            {fullName.length > 2 && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            isValid ? { backgroundColor: '#14b8a6' } : { backgroundColor: c.borderMedium },
          ]}
          disabled={!isValid || isLoading}
          onPress={handleCreateProfile}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitText}>Create My Profile</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  prefixRow: {
    flexDirection: 'row',
    gap: 12,
  },
  prefixBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixBtnActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  submitBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
