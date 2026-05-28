import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, BackHandler, ActivityIndicator, ScrollView
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { verifyPaymentAndBook } from '../../services/patientService';

export default function BookingSuccessScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { orderId, doctorName, startTime, appointmentType } = route.params || {};

  const [isVerifying, setIsVerifying] = useState(!!orderId);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [appointment, setAppointment] = useState<any>(null);

  // Prevent going back to the booking flow
  useEffect(() => {
    const onBackPress = () => {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Verify payment on mount (mirrors web's booking-confirmed/page.js)
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const result: any = await verifyPaymentAndBook({ cashfree_order_id: orderId });
        setAppointment(result?.appointment || result);
        setIsVerifying(false);
      } catch (err: any) {
        setIsError(true);
        setErrorMessage(
          err?.response?.data?.error || err?.message || 'An unexpected error occurred.'
        );
        setIsVerifying(false);
      }
    })();
  }, [orderId]);

  const handleDone = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleViewAppointments = () => {
    navigation.reset({
      index: 1,
      routes: [{ name: 'MainTabs' }, { name: 'Connect' }],
    });
  };

  const appointmentTime = startTime ? new Date(startTime) : null;
  const displayDate = appointmentTime
    ? appointmentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    : (appointment?.start_time
      ? new Date(appointment.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A');
  const displayTime = appointmentTime?.toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  }) || 'N/A';

  // --- VERIFYING STATE ---
  if (isVerifying) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[styles.title, { color: c.text, fontSize: 22, marginTop: 24 }]}>
            Confirming Your Booking...
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Verifying payment and finalizing your appointment. Please wait.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- ERROR STATE ---
  if (isError || !orderId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={styles.content}>
          <Ionicons name="close-circle" size={100} color="#ef4444" />
          <Text style={[styles.title, { color: c.text, marginTop: 24 }]}>
            {orderId ? 'Booking Failed' : 'Invalid Link'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {errorMessage || 'No order ID found. Please contact support.'}
          </Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: c.brand }]} onPress={handleDone}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- SUCCESS STATE ---
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.iconContainer}>
          <View style={[styles.circle, { backgroundColor: 'rgba(34, 174, 158, 0.1)' }]}>
            <Ionicons name="checkmark-circle" size={100} color={c.brand} />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(400)} style={[styles.title, { color: c.text }]}>
          Appointment Confirmed!
        </Animated.Text>

        <Animated.Text entering={FadeInDown.delay(500)} style={[styles.subtitle, { color: c.textSecondary }]}>
          Your booking is complete. You'll receive confirmation details shortly.
        </Animated.Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(600)} style={[styles.detailsCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Doctor</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>
                Dr. {appointment?.doctors?.full_name || doctorName || 'Doctor'}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>{displayDate}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Time</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>{displayTime}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.detailRow}>
            <Ionicons name={appointmentType === 'video' ? 'videocam' : 'business'} size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Type</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>
                {appointmentType === 'video' ? 'Video Consult' : 'In-Person Visit'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(800)} style={styles.footer}>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: c.brand }]} onPress={handleViewAppointments}>
          <Text style={styles.primaryButtonText}>View My Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { borderColor: c.border }]} onPress={handleDone}>
          <Text style={[styles.secondaryButtonText, { color: c.text }]}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerContainer: { alignItems: 'center', padding: 24, paddingBottom: 0 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 10 },
  iconContainer: { marginBottom: 32, alignItems: 'center' },
  circle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  detailsCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { width: 32 },
  detailLabel: { fontSize: 12, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginVertical: 16 },
  footer: { padding: 24 },
  primaryButton: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
});
