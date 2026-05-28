import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getClinicDetails, selfCheckIn } from '../../services/patientService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import ErrorModal from '../../components/ui/ErrorModal';
import { useAuthStore } from '../../store/authStore';

export default function CheckInScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();

  // Extract from nav params
  const { clinicId: rawClinicId, doctorId: rawDoctorId } = route.params || {};

  // Failsafe parsing logic matches web CheckInPage
  let clinicId = rawClinicId;
  let doctorId = rawDoctorId;

  if (rawClinicId && rawClinicId.length > 36) {
    clinicId = rawClinicId.substring(0, 36);
    if (!doctorId) {
      const potentialDoctorId = rawClinicId.substring(rawClinicId.length - 36);
      if (potentialDoctorId.length === 36) {
        doctorId = potentialDoctorId;
      }
    }
  }

  const [step, setStep] = useState<'FORM' | 'EARLY_FORM' | 'SUCCESS'>('FORM');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<any>(null);
  const [clinicInfo, setClinicInfo] = useState({ doctorName: '', clinicName: '', doctorProfileUrl: '', isSessionActive: false });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const COUNTRY_CODE = '+91';

  const handleViewAppointments = () => {
    navigation.reset({
      index: 1,
      routes: [{ name: 'MainTabs' }, { name: 'Connect' }],
    });
  };
  useEffect(() => {
    if (clinicId) {
      initializePage();
    } else {
      setErrorMessage('Invalid QR Code. Missing Clinic ID.');
      setPageLoading(false);
    }
  }, [clinicId, doctorId]);

  const initializePage = async () => {
    try {
      // 1. Check if they already checked in on this device
      const sessionStr = await AsyncStorage.getItem(`breathy_checkin_${clinicId}`);
      if (sessionStr) {
        const parsedSession = JSON.parse(sessionStr);
        // CHECK 24-HOUR TTL
        if (parsedSession.timestamp && (Date.now() - parsedSession.timestamp < 86400000)) {
          setResult(parsedSession);
          setPhone(parsedSession.rawPhone || '');
          setStep('SUCCESS');
          setPageLoading(false);
          return;
        } else {
          await AsyncStorage.removeItem(`breathy_checkin_${clinicId}`);
        }
      }

      // 2. Fetch Clinic Details
      const data = await getClinicDetails(clinicId, doctorId);

      // BRANCH A: OFF-DAY (Acquisition Path)
      if (data.hasSessionToday === false && data.doctorProfileUrl) {
        // Just go to doctor profile
        if (doctorId) {
          navigation.replace('DoctorProfile', { doctorId });
        } else {
          const extractedDoctorId = data.doctorProfileUrl.split('/').pop();
          if (extractedDoctorId) {
            navigation.replace('DoctorProfile', { doctorId: extractedDoctorId });
          } else {
            navigation.goBack();
          }
        }
        return;
      }

      setClinicInfo({
        doctorName: data.doctorName,
        clinicName: data.clinicName,
        doctorProfileUrl: data.doctorProfileUrl,
        isSessionActive: data.isSessionActive
      });

      // BRANCH B: EARLY BIRD
      if (data.hasSessionToday === true && data.isSessionActive === false) {
        setStep(prev => prev === 'SUCCESS' ? 'SUCCESS' : 'EARLY_FORM');
      }

      // Auto-fill from Auth Store if missing
      const profile = useAuthStore.getState().profile;
      if (profile && step !== 'SUCCESS') {
        if (!fullName) setFullName(profile.full_name || '');
        if (!phone) {
          let p = profile.phone_no || '';
          if (p.startsWith('+91')) p = p.substring(3);
          else if (p.startsWith('91') && p.length === 12) p = p.substring(2);
          setPhone(p);
        }
      }

      setPageLoading(false);
    } catch (error) {
      console.error("Failed to initialize CheckIn:", error);
      setErrorMessage('init_failed');
      setPageLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || phone.length !== 10) {
      setErrorMessage('Please provide a valid name and 10-digit phone number.');
      return;
    }

    setLoading(true);
    const formattedPhone = `${COUNTRY_CODE.replace('+', '')}${phone}`;

    try {
      const data = await selfCheckIn({
        clinicId,
        doctorId,
        fullName: fullName.trim(),
        phone: formattedPhone,
        userLat: 0,
        userLong: 0
      });

      const successData = { ...data, rawPhone: phone, timestamp: Date.now() };
      setResult(successData);
      setStep('SUCCESS');
      await AsyncStorage.setItem(`breathy_checkin_${clinicId}`, JSON.stringify(successData));

    } catch (error: any) {
      console.error("Check-in Error:", error);
      setErrorMessage(error.message || 'Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPatient = async () => {
    await AsyncStorage.removeItem(`breathy_checkin_${clinicId}`);
    setFullName('');
    setPhone('');
    setResult(null);
    setStep(clinicInfo.isSessionActive === false ? 'EARLY_FORM' : 'FORM');
  };

  if (pageLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.card}>
            {/* Header */}
            <View style={[styles.cardHeader, { backgroundColor: c.brand }]}>
              <Text style={styles.cardTitle}>Self Check-In</Text>
              
              {clinicInfo.clinicName ? (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#ccfbf1" />
                  <Text style={styles.infoText}>{clinicInfo.clinicName}</Text>
                </View>
              ) : null}

              {clinicInfo.doctorName ? (
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                  <Ionicons name="medical-outline" size={14} color="#99f6e4" />
                  <Text style={[styles.infoText, { fontSize: 13, color: '#ccfbf1' }]}>Dr. {clinicInfo.doctorName}</Text>
                </View>
              ) : null}
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
              {step === 'FORM' || step === 'EARLY_FORM' ? (
                <View>
                  {step === 'EARLY_FORM' && (
                    <View style={styles.earlyWarning}>
                      <Text style={styles.earlyWarningTitle}>Early Bird</Text>
                      <Text style={styles.earlyWarningText}>
                        Dr. {clinicInfo.doctorName} hasn't started the session yet. Join the early waitlist!
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>Patient Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter full name"
                      value={fullName}
                      onChangeText={setFullName}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <Text style={styles.label}>Contact Number</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.prefixWrapper}>
                      <Text style={styles.prefixText}>{COUNTRY_CODE}</Text>
                    </View>
                    <TextInput
                      style={styles.inputPhone}
                      placeholder="98765 43210"
                      value={phone}
                      onChangeText={(text) => {
                        const clean = text.replace(/\D/g, '');
                        if (clean.length <= 10) setPhone(clean);
                      }}
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                      maxLength={10}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.submitBtn, { backgroundColor: step === 'EARLY_FORM' ? '#f59e0b' : c.brand }]} 
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {step === 'EARLY_FORM' ? 'Join Early Waitlist' : 'Get Token Number'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.successContainer}>
                  <LottieView
                    source={require('../../../assets/animations/success.json')} // Generic success animation if needed, placeholder
                    autoPlay
                    loop={false}
                    style={{ width: 120, height: 120 }}
                  />
                  
                  <Text style={styles.tokenNumber}>#{result?.token}</Text>
                  <Text style={styles.tokenStatus}>You are in the queue!</Text>
                  <Text style={styles.doctorNameSuccess}>Doctor: {result?.doctor || clinicInfo.doctorName}</Text>

                  <TouchableOpacity 
                    style={[styles.trackBtn, { backgroundColor: c.brand }]}
                    onPress={handleViewAppointments}
                  >
                    <Text style={styles.trackBtnText}>Track Live Status</Text>
                  </TouchableOpacity>

                  {doctorId && (
                    <TouchableOpacity 
                      style={styles.profileBtn}
                      onPress={() => navigation.navigate('DoctorProfile', { doctorId })}
                    >
                      <Ionicons name="medical" size={16} color={c.brand} style={{ marginRight: 6 }} />
                      <Text style={[styles.profileBtnText, { color: c.brand }]}>View Doctor Profile</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.newPatientBtn} onPress={handleNewPatient}>
                    <Text style={[styles.newPatientBtnText, { color: c.brand }]}>Check-In Another Patient</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage === 'init_failed' ? 'Failed to load clinic details. Please scan again.' : errorMessage || ''}
        onClose={() => {
          const isInitFail = errorMessage === 'init_failed';
          setErrorMessage(null);
          if (isInitFail || pageLoading || !clinicId) {
            navigation.goBack();
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  cardBody: {
    padding: 24,
  },
  earlyWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  earlyWarningTitle: {
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  earlyWarningText: {
    color: '#92400e',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  prefixWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  prefixText: {
    fontWeight: '700',
    color: '#4b5563',
    fontSize: 16,
  },
  inputPhone: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
  },
  tokenNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1f2937',
  },
  tokenStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 4,
  },
  doctorNameSuccess: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 24,
  },
  trackBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  profileBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  newPatientBtn: {
    paddingVertical: 8,
  },
  newPatientBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
