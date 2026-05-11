import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getDoctorBookingMetadata, createPaymentOrder } from '../../services/patientService';
export default function BookingFlowScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const { doctorId } = route.params || {};

  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient Details
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');

  useEffect(() => {
    fetchSlots();
  }, [date]);

  const fetchSlots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = (await getDoctorBookingMetadata(doctorId, date)) as any;
      // Assuming data returns an array of slots or an object with slots
      setSlots(data.slots || data.available_slots || []);
    } catch (err) {
      console.error('Failed to fetch slots', err, { source: 'BookingFlowScreen' });
      setError('Could not load available slots.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToPay = async () => {
    if (!selectedSlot || !patientName || !patientPhone) {
      setError('Please select a slot and fill all details.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const orderData = {
        doctor_id: doctorId,
        slot_time: selectedSlot.start_time, // Adjust based on actual API payload
        patient_name: patientName,
        patient_phone: patientPhone,
        symptoms: symptoms,
      };
      
      const orderResponse = (await createPaymentOrder(orderData)) as any;
      
      // Mock Payment Success for now since Cashfree SDK isn't installed
      navigation.navigate('BookingSuccess', { 
        appointmentId: orderResponse.order_id,
        date: selectedSlot,
        doctorName: route.params?.doctorName || 'Doctor' 
      });

    } catch (err: any) {
      console.error('Failed to create payment order', err, { source: 'BookingFlowScreen' });
      setError(err.message || 'Payment initialization failed.');
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Book Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Selection Placeholder */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Select Date</Text>
          <Text style={{ color: c.textSecondary, marginBottom: 16 }}>
            {date.toDateString()}
          </Text>
          {/* Note: In a full app, implement a horizontal date picker here */}
        </View>

        {/* Slots */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Available Slots</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={c.brand} style={{ marginVertical: 20 }} />
          ) : slots.length === 0 ? (
            <Text style={{ color: c.textSecondary }}>No slots available for this date.</Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotButton,
                    { borderColor: c.border, backgroundColor: selectedSlot === slot ? c.brand : c.bg }
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[styles.slotText, { color: selectedSlot === slot ? '#fff' : c.text }]}>
                    {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Patient Details */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Patient Details</Text>
          
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            placeholder="Full Name"
            placeholderTextColor={c.textTertiary}
            value={patientName}
            onChangeText={setPatientName}
          />
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
            placeholder="Phone Number"
            placeholderTextColor={c.textTertiary}
            keyboardType="phone-pad"
            value={patientPhone}
            onChangeText={setPatientPhone}
          />
          <TextInput
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg, height: 80 }]}
            placeholder="Symptoms (Optional)"
            placeholderTextColor={c.textTertiary}
            multiline
            value={symptoms}
            onChangeText={setSymptoms}
          />
        </View>

        {error && (
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 20, backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity 
          style={[styles.payButton, { backgroundColor: selectedSlot ? c.brand : c.borderMedium }]}
          onPress={handleProceedToPay}
          disabled={!selectedSlot || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Proceed to Pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  slotText: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  payButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
  },
});
