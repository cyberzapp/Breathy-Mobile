import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import ErrorModal from '../../components/ui/ErrorModal';
import WarningModal from '../../components/ui/WarningModal';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getDoctorPublicProfile, createPaymentOrder, getMyProfile } from '../../services/patientService';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFSession, CFEnvironment, CFWebCheckoutPayment } from 'cashfree-pg-api-contract';

const CASHFREE_MODE = process.env.EXPO_PUBLIC_CASHFREE_MODE === 'production'
  ? CFEnvironment.PRODUCTION
  : CFEnvironment.SANDBOX;

export default function BookingFlowScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const {
    doctorId, doctorName: paramDoctorName, startTime,
    organizationId, appointmentType = 'in-person',
    consultationFee: feeParam, sessionUuid,
  } = route.params || {};

  const [doctor, setDoctor] = useState<any>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Slot lock timer (video only)
  const [timeLeft, setTimeLeft] = useState(180);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Load doctor profile
  useEffect(() => {
    if (!doctorId) { setIsLoadingDoctor(false); return; }
    (async () => {
      try { setDoctor(await getDoctorPublicProfile(doctorId)); }
      catch { /* use paramDoctorName fallback */ }
      finally { setIsLoadingDoctor(false); }
    })();
  }, [doctorId]);

  // Pre-fill patient details from profile
  useEffect(() => {
    (async () => {
      try {
        const profile: any = await getMyProfile();
        if (profile) {
          setPatientName(profile.full_name || '');
          setPatientEmail(profile.email || '');
          let phone = String(profile.phone_no || '').replace(/\D/g, '');
          if (phone.startsWith('91') && phone.length > 10) phone = phone.substring(2);
          setPatientPhone(phone);
        }
      } catch { /* silent — user can type manually */ }
    })();
  }, []);

  // Cashfree SDK callbacks
  useEffect(() => {
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string) {
        setIsProcessing(false);
        navigation.navigate('BookingSuccess', {
          orderId: orderID,
          doctorName: displayName,
          startTime,
          appointmentType,
        });
      },
      onError(error: any, orderID: string) {
        setIsProcessing(false);
        setErrorMessage(error?.message || 'Please try again.');
      },
    });
    return () => { CFPaymentGatewayService.removeCallback(); };
  }, []);

  // Slot lock countdown (video only)
  useEffect(() => {
    if (appointmentType !== 'video' || isTimeExpired || isProcessing) return;
    if (timeLeft <= 0) {
      setIsTimeExpired(true);
      setWarningMessage('This slot has been released. Please go back and select another.');
      return;
    }
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, appointmentType, isTimeExpired, isProcessing]);

  // Resolve fee (mirrors web book/page.js L181-216)
  const fee = useMemo(() => {
    const DEFAULT_FEE = 500;
    if (feeParam && !isNaN(Number(feeParam))) return Number(feeParam);
    if (!doctor) return DEFAULT_FEE;
    const doc = doctor.doctor || doctor;
    if (appointmentType === 'video') {
      const orgs = doctor.organizations || [];
      const allServices = orgs.flatMap((o: any) => o.services || []);
      const videoSvc = allServices.find((s: any) =>
        s.service_name?.toLowerCase().includes('video') || s.type?.toLowerCase().includes('video')
      );
      if (videoSvc?.fee) return videoSvc.fee;
      return doc.video_consultation_fee || DEFAULT_FEE;
    }
    const selectedOrg = (doctor.organizations || []).find((o: any) => o.id === organizationId);
    if (selectedOrg?.services) {
      const svc = selectedOrg.services.find((s: any) =>
        s.type === 'Consultation' || s.service_name?.toLowerCase().includes('consultation')
      );
      if (svc?.fee) return svc.fee;
    }
    return DEFAULT_FEE;
  }, [doctor, appointmentType, organizationId, feeParam]);

  const displayName = paramDoctorName || doctor?.doctor?.full_name || doctor?.full_name || 'Doctor';
  const appointmentTime = startTime ? new Date(startTime) : null;
  const isPhoneValid = /^\d{10}$/.test(patientPhone);
  const canProceed = patientName.trim() && isPhoneValid && termsAccepted && !isTimeExpired;

  const handlePayment = async () => {
    if (!canProceed) {
      setError('Please fill your name and a valid 10-digit phone number.');
      return;
    }
    setIsProcessing(true);
    setError(null);

    const fullPhone = `+91${patientPhone}`;
    const endTime = new Date(new Date(startTime).getTime() + 15 * 60000).toISOString();

    try {
      const orderData = {
        doctorId, clinicId: organizationId, startTime, endTime,
        appointmentType, amount: fee,
        billing_name: patientName,
        billing_email: patientEmail || undefined,
        billing_phone: fullPhone,
      };
      const response: any = await createPaymentOrder(orderData);

      if (!response?.payment_session_id || !response?.order_id) {
        throw new Error('Failed to get payment session from server.');
      }

      const session = new CFSession(
        response.payment_session_id,
        response.order_id,
        CASHFREE_MODE
      );
      CFPaymentGatewayService.doWebPayment(session);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Could not initiate payment. Please try again.');
    }
  };

  if (!startTime || !doctorId) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.error} />
        <Text style={[styles.errorMsg, { color: c.textSecondary }]}>Appointment details are missing. Please go back and select a slot.</Text>
        <TouchableOpacity style={[styles.goBackBtn, { backgroundColor: c.brand }]} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Payment Processing Overlay */}
      {isProcessing && (
        <View style={styles.overlay}>
          <View style={styles.overlayPulse} />
          <Ionicons name="shield-checkmark" size={64} color={c.brand} />
          <Text style={styles.overlayTitle}>Secure Payment in Progress</Text>
          <Text style={styles.overlaySubtitle}>Please complete the payment on the gateway.{'\n\n'}Do not hit back or close this screen.</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Confirm Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Countdown Timer (Video only) */}
      {appointmentType === 'video' && !isTimeExpired && (
        <View style={styles.timerBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={18} color="#c2410c" />
            <Text style={styles.timerLabel}>Reservation expires in</Text>
          </View>
          <Text style={styles.timerValue}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appointment Summary */}
        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Appointment Summary</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="person" size={18} color={c.textTertiary} />
            <Text style={[styles.summaryText, { color: c.text }]}>Dr. {displayName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar" size={18} color={c.textTertiary} />
            <Text style={[styles.summaryText, { color: c.text }]}>
              {appointmentTime?.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time" size={18} color={c.textTertiary} />
            <Text style={[styles.summaryText, { color: c.text }]}>
              {appointmentTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name={appointmentType === 'video' ? 'videocam' : 'business'} size={18} color={c.textTertiary} />
            <View style={[styles.typeBadge, { backgroundColor: appointmentType === 'video' ? '#ede9fe' : '#ecfdf5' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: appointmentType === 'video' ? '#7c3aed' : '#059669' }}>
                {appointmentType === 'video' ? 'Video Consult' : 'In-Person'}
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Details */}
        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Patient Details</Text>
          <TextInput style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            placeholder="Full Name *" placeholderTextColor={c.textTertiary}
            value={patientName} onChangeText={setPatientName} />
          <View style={[styles.phoneRow, { borderColor: c.border, backgroundColor: c.bg }]}>
            <Text style={[styles.phonePrefix, { color: c.textSecondary }]}>+91</Text>
            <TextInput style={[styles.phoneInput, { color: c.text }]}
              placeholder="Phone Number *" placeholderTextColor={c.textTertiary}
              keyboardType="phone-pad" maxLength={10}
              value={patientPhone} onChangeText={setPatientPhone} />
          </View>
          <TextInput style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            placeholder="Email (Optional)" placeholderTextColor={c.textTertiary}
            keyboardType="email-address" autoCapitalize="none"
            value={patientEmail} onChangeText={setPatientEmail} />
        </View>

        {/* Fee + Terms */}
        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: c.textSecondary }]}>Total Payable</Text>
            <Text style={[styles.feeAmount, { color: c.text }]}>₹{fee}</Text>
          </View>
          <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted(p => !p)}>
            <Ionicons name={termsAccepted ? 'checkbox' : 'square-outline'} size={22} color={c.brand} />
            <Text style={[styles.termsText, { color: c.textSecondary }]}>
              I agree to the Terms & Conditions and Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={[styles.errorMsg, { color: c.error }]}>{error}</Text>}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20, backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: canProceed ? c.brand : '#d1d5db' }]}
          onPress={handlePayment}
          disabled={!canProceed || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>Confirm & Pay ₹{fee}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <WarningModal
        visible={!!warningMessage}
        message={warningMessage || ''}
        title="Time Expired"
        onClose={() => { setWarningMessage(null); navigation.goBack(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 120 },
  summaryCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  summaryText: { fontSize: 15, fontWeight: '500' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  phonePrefix: { paddingHorizontal: 14, fontSize: 16, fontWeight: '600', borderRightWidth: 1, borderRightColor: '#e5e7eb', paddingVertical: 14 },
  phoneInput: { flex: 1, paddingHorizontal: 14, fontSize: 16, paddingVertical: 14 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  feeLabel: { fontSize: 15, fontWeight: '600' },
  feeAmount: { fontSize: 24, fontWeight: '800' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  termsText: { fontSize: 13, flex: 1 },
  errorMsg: { textAlign: 'center', marginTop: 8, fontSize: 14 },
  goBackBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  payBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  timerBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff7ed', borderBottomWidth: 1, borderBottomColor: '#fed7aa', paddingHorizontal: 16, paddingVertical: 10 },
  timerLabel: { fontSize: 14, fontWeight: '600', color: '#c2410c' },
  timerValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], color: '#c2410c' },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.97)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  overlayPulse: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#ccfbf1', opacity: 0.6 },
  overlayTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginTop: 20, textAlign: 'center' },
  overlaySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 12, lineHeight: 22 },
});
