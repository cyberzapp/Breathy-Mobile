import React, { useState, useEffect, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../hooks/useColors';
import { posthog } from '../../config/posthog';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useThemeStore } from '../../store/themeStore';

const COUNTRY_CODE = '+91';

type RootStackParamList = {
  Login: undefined;
  OTPVerification: { phoneNumber: string };
};

export default function OTPVerificationScreen() {
  const c = useColors();
  const resolved = useThemeStore((s) => s.resolved);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OTPVerification'>>();
  const { phoneNumber } = route.params;

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOtp(otp);
    }
  }, [otp]);

  const handleVerifyOtp = async (code: string) => {
    setError('');
    setIsLoading(true);

    try {
      const fullPhoneNumber = `${COUNTRY_CODE}${phoneNumber}`;
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: code,
        type: 'sms',
      });

      if (verifyError) throw verifyError;
      if (!data.session || !data.user) throw new Error('Failed to create session.');

      posthog.identify(data.user.id, {
        $set: { phone: data.user.phone || null },
        $set_once: { first_login_date: new Date().toISOString() },
      });
      posthog.capture('otp_verified', { user_id: data.user.id });

      console.log('OTP verified successfully');
      // Navigation will be handled by RootNavigator's auth listener
    } catch (err: any) {
      console.error('OTP verification failed', err, { source: 'OTPVerificationScreen' });
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const fullPhoneNumber = `${COUNTRY_CODE}${phoneNumber}`;
      const { error: resendError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });
      if (resendError) throw resendError;
      console.log('OTP resent successfully');
    } catch (err: any) {
      console.error('OTP resend failed', err, { source: 'OTPVerificationScreen' });
      setError('Failed to resend OTP. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoxPress = () => {
    otpInputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
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
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={c.text} />
            </TouchableOpacity>

            <View style={[styles.iconCircle, { backgroundColor: c.brand }]}>
              <Ionicons name="lock-closed" size={28} color="#ffffff" />
            </View>

            <Text style={[styles.title, { color: c.text }]}>Verify OTP</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={{ fontWeight: '700', color: c.text }}>{COUNTRY_CODE} {phoneNumber}</Text>
            </Text>

            {error !== '' && (
              <View style={[styles.errorBanner, { backgroundColor: c.errorBg }]}>
                <Ionicons name="alert-circle" size={18} color={c.error} />
                <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
              </View>
            )}

            <View style={styles.formSection}>
              {/* Hidden TextInput that captures keyboard input */}
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(val) => setOtp(val.replace(/\D/g, ''))}
                autoFocus
                caretHidden={true}
              />

              {/* Visual OTP digit boxes */}
              <TouchableOpacity 
                style={styles.otpBoxRow} 
                onPress={handleBoxPress}
                activeOpacity={0.8}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      {
                        borderColor: i === otp.length ? c.brand : otp[i] ? c.border : c.border,
                        backgroundColor: c.input,
                        borderWidth: i === otp.length ? 2 : 1.5,
                      },
                    ]}
                  >
                    <Text style={[styles.otpDigit, { color: c.text }]}>
                      {otp[i] || ''}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: c.brand },
                  (isLoading || otp.length < 6) && styles.primaryButtonDisabled,
                ]}
                onPress={() => handleVerifyOtp(otp)}
                disabled={isLoading || otp.length < 6}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={[styles.footerText, { color: c.textSecondary }]}>Didn't receive code?</Text>
                <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                  <Text style={[styles.resendText, { color: c.brand }]}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '700',
  },
  primaryButton: {
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
