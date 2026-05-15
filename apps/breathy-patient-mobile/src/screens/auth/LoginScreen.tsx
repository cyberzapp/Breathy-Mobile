import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../hooks/useColors';
import { posthog } from '../../config/posthog';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useThemeStore } from '../../store/themeStore';

const COUNTRY_CODE = '+91';

export default function LoginScreen() {
  const c = useColors();
  const resolved = useThemeStore((s) => s.resolved);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = async () => {
    setError('');

    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhoneNumber = `${COUNTRY_CODE}${phoneNumber.trim()}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) throw error;

      posthog.capture('otp_requested', { country_code: COUNTRY_CODE });
      
      // Navigate to OTP screen
      navigation.navigate('OTPVerification', { phoneNumber: phoneNumber.trim() });
    } catch (err: any) {
      console.error('OTP send failed', err, { source: 'LoginScreen' });
      setError(err.message || 'Failed to send OTP. Please check the number.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: c.card }]}>
            {/* Header Icon */}
            <View style={[styles.iconCircle, { backgroundColor: c.brand }]}>
              <Ionicons name="person" size={28} color="#ffffff" />
            </View>

            <Text style={[styles.title, { color: c.text }]}>Patient Login</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Manage your health and book{'\n'}appointments with ease.
            </Text>

            {/* Error Banner */}
            {error !== '' && (
              <View style={[styles.errorBanner, { backgroundColor: c.errorBg }]}>
                <Ionicons name="alert-circle" size={18} color={c.error} />
                <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Mobile Number</Text>
              <View style={[styles.phoneInputRow, { borderColor: c.border, backgroundColor: c.input }]}>
                <View style={[styles.countryCodeBox, { backgroundColor: c.cardAlt, borderRightColor: c.border }]}>
                  <Text style={[styles.countryCodeText, { color: c.text }]}>{COUNTRY_CODE}</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: c.text }]}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(val) => setPhoneNumber(val.replace(/\D/g, ''))}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: c.brand },
                  (isLoading || phoneNumber.length < 10) && styles.primaryButtonDisabled,
                ]}
                onPress={handlePhoneSubmit}
                disabled={isLoading || phoneNumber.length < 10}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    width: '100%',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  formSection: {
    width: '100%',
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCodeBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
