import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { Screen } from '../components/Screen';

// ---------------------------------------------------------------------------
// LoginScreen
// ---------------------------------------------------------------------------
// Native implementation of DoctorVerificationPage.jsx
// Two-step flow: Enter Phone Number → Enter OTP
// Uses Supabase Auth's signInWithOtp + verifyOtp
// ---------------------------------------------------------------------------

const COUNTRY_CODE = '+91';

export default function LoginScreen() {
  // --- State ---
  const [step, setStep] = useState<'enter-phone' | 'enter-otp'>('enter-phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const otpInputRef = useRef<TextInput>(null);

  // --- Auto-submit OTP when 6 digits entered ---
  useEffect(() => {
    if (step === 'enter-otp' && otp.length === 6) {
      executeVerification(otp);
    }
  }, [otp, step]);

  // --- Core Logic: Send OTP ---
  const handlePhoneSubmit = async () => {
    setError('');

    if (!/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhoneNumber = `${COUNTRY_CODE.replace('+', '')}${phoneNumber.trim()}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) throw error;

      setStep('enter-otp');
      setTimeout(() => otpInputRef.current?.focus(), 200);
    } catch (err: any) {
      console.error('[Login] Send OTP Error:', err);
      setError(err.message || 'Failed to send OTP. Please check the number.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Core Logic: Verify OTP ---
  const executeVerification = useCallback(
    async (codeToVerify: string) => {
      setError('');

      if (!codeToVerify || codeToVerify.length !== 6) {
        setError('Please enter the 6-digit OTP.');
        return;
      }

      setIsLoading(true);
      const fullPhoneNumber = `${COUNTRY_CODE.replace('+', '')}${phoneNumber.trim()}`;

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullPhoneNumber,
          token: codeToVerify,
          type: 'sms',
        });

        if (error) throw error;
        if (!data.session || !data.user) throw new Error('Session creation failed.');

        // Session is now persisted in SecureStore by our Supabase adapter.
        // The auth listener in RootNavigator will pick this up automatically
        // and route the user to the correct screen.
        console.log('✅ [Login] OTP verified successfully. Session established.');
      } catch (err: any) {
        console.error('[Login] Verification Error:', err);
        setError(err.message || 'Invalid OTP. Please try again.');
        setIsLoading(false);
      }
    },
    [phoneNumber]
  );

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setIsTermsModalOpen(false);
  };

  // --- Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Header Icon */}
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={28} color="#ffffff" />
            </View>

            <Text style={styles.title}>Doctor Verification</Text>
            <Text style={styles.subtitle}>
              This is not for booking an appointment.{'\n'}Your number will be kept private.
            </Text>

            {/* Error Banner */}
            {error !== '' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* STEP 1: Phone Number Entry */}
            {step === 'enter-phone' && (
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>{COUNTRY_CODE}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#a0aec0"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={(val) => setPhoneNumber(val.replace(/\D/g, ''))}
                    autoFocus
                  />
                </View>

                {/* Terms Checkbox */}
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => {
                    if (termsAccepted) {
                      setTermsAccepted(false);
                    } else {
                      setIsTermsModalOpen(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setIsTermsModalOpen(true)}
                    >
                      Terms and Conditions
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!termsAccepted || isLoading || phoneNumber.length < 10) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={handlePhoneSubmit}
                  disabled={!termsAccepted || isLoading || phoneNumber.length < 10}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 'enter-otp' && (
              <View style={styles.formSection}>
                <Text style={styles.otpPrompt}>
                  Enter the code sent to{' '}
                  <Text style={styles.otpPhoneHighlight}>
                    {COUNTRY_CODE} {phoneNumber}
                  </Text>
                </Text>

                <TextInput
                  ref={otpInputRef}
                  style={styles.otpInput}
                  placeholder="------"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, ''))}
                  textContentType="oneTimeCode" // iOS auto-fill from SMS
                  autoComplete="sms-otp" // Android auto-fill from SMS
                />

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (isLoading || otp.length !== 6) && styles.primaryButtonDisabled,
                  ]}
                  onPress={() => executeVerification(otp)}
                  disabled={isLoading || otp.length !== 6}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirm & Verify</Text>
                  )}
                </TouchableOpacity>

                {/* Change Number Link */}
                <TouchableOpacity
                  style={styles.changeNumberButton}
                  onPress={() => {
                    setStep('enter-phone');
                    setOtp('');
                    setError('');
                  }}
                >
                  <Text style={styles.changeNumberText}>Change Number</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions Modal */}
      <TermsModal
        visible={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={handleAcceptTerms}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Terms & Conditions Modal
// ---------------------------------------------------------------------------
function TermsModal({
  visible,
  onClose,
  onAccept,
}: {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
    <Screen isModal={true} style={{ backgroundColor: '#f4f4f4' }}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Terms and Conditions</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalBody}>
              Welcome to Breathy. By using our platform, you agree to the following terms:
            </Text>
            <Text style={styles.modalSectionTitle}>1. Data Collection and Usage</Text>
            <Text style={styles.modalBody}>
              To provide personalized recommendations and improve our services, we will
              securely collect data about your usage patterns, location, and behavior. Your
              data is our top priority, and we use highly secure data centers to protect it.
            </Text>
            <Text style={styles.modalSectionTitle}>2. Verification</Text>
            <Text style={styles.modalBody}>
              You agree to receive SMS messages for verification purposes. We may also use
              location services to ensure the security of your account.
            </Text>
            <Text style={styles.modalSectionTitle}>3. User Responsibility</Text>
            <Text style={styles.modalBody}>
              You are responsible for maintaining the confidentiality of your account and for
              all activities that occur under your account.
            </Text>
            <Text style={[styles.modalBody, { marginTop: 16 }]}>
              Our team is relentlessly working to serve you best and ensure your data is safe.
            </Text>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalDeclineButton} onPress={onClose}>
              <Text style={styles.modalDeclineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalAcceptButton} onPress={onAccept}>
              <Text style={styles.modalAcceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const TEAL = '#14b8a6';
const TEAL_DARK = '#0d9488';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0fdf4',
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

  // --- Card ---
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },

  // --- Header ---
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },

  // --- Error ---
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    width: '100%',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
  },

  // --- Form ---
  formSection: {
    width: '100%',
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  countryCodeBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#f1f5f9',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },

  // --- Terms ---
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
  },
  termsLink: {
    color: TEAL,
    fontWeight: '600',
  },

  // --- Button ---
  primaryButton: {
    marginTop: 24,
    backgroundColor: TEAL,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonDisabled: {
    backgroundColor: '#94d5cd',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // --- OTP Step ---
  otpPrompt: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  otpPhoneHighlight: {
    fontWeight: '700',
    color: '#1e293b',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 12,
    color: '#1e293b',
  },
  changeNumberButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  changeNumberText: {
    fontSize: 14,
    color: TEAL,
    fontWeight: '600',
  },

  // --- Terms Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
    marginBottom: 6,
  },
  modalBody: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalDeclineButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalDeclineText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  modalAcceptButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: TEAL,
  },
  modalAcceptText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
});
