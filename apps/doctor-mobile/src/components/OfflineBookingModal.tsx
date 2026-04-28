import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { findPatientsByPhone, addWalkInPatient } from '../services/queueService';
import { createManualAppointment } from '../services/calendarService';
import { useAuthStore } from '../store/authStore';

// INDUSTRY STANDARD: Import our deterministic Keyboard wrapper
import KeyboardAwareModal from './ui/KeyboardAwareModal';

const BRAND = '#22ae9e';

type Step = 'search' | 'create_patient' | 'appointment_details';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBooked: () => void;
  initialDate?: Date;
}

export default function OfflineBookingModal({ visible, onClose, onBooked, initialDate }: Props) {
  const [step, setStep] = useState<Step>('search');
  const [phone, setPhone] = useState('');
  const [patientFound, setPatientFound] = useState<any | null>(null);

  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // New Patient Form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('other');

  // Appointment Details
  const [apptType, setApptType] = useState<'in-person' | 'video'>('in-person');
  const [date, setDate] = useState<Date>(initialDate || new Date());
  const [duration, setDuration] = useState<number>(30); // minutes
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Doctor Auth
  const doctorId = useAuthStore((s) => s.session?.user?.id);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('search');
      setPhone('');
      setPatientFound(null);
      setHasSearched(false);
      setNewPatientName('');
      setNewPatientGender('other');
      setApptType('in-person');
      setDate(initialDate || new Date());
      setDuration(30);
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible, initialDate]);

  const handleSearch = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    
    setIsSearching(true);
    try {
      // Queries live database (online)
      const results = await findPatientsByPhone(phone);
      
      if (results && results.length > 0) {
        setPatientFound(results[0]);
        setStep('appointment_details');
      } else {
        setPatientFound(null);
        setHasSearched(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search local database.');
    } finally {
      setIsSearching(false);
    }
  };

  const proceedWithNewPatient = async () => {
    if (!newPatientName) {
      Alert.alert('Missing Info', 'Please enter the patient name.');
      return;
    }
    setIsProcessing(true);
    try {
      // Adds patient to live db
      await addWalkInPatient({
        fullName: newPatientName,
        phone: `91${phone}`,
        gender: newPatientGender,
      });
      // Immediately refetch to get their new Patient ID
      const results = await findPatientsByPhone(phone);
      if (results && results.length > 0) {
        setPatientFound(results[0]);
        setStep('appointment_details');
      } else {
        Alert.alert('Error', 'Patient created but could not be retrieved.');
      }
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Failed to create patient record.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!patientFound) return;
    
    setIsProcessing(true);
    try {
      const startTime = date;
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      // Creates appointment in live DB
      await createManualAppointment({
        patientId: patientFound.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        appointmentType: apptType,
      });
      
      Alert.alert('Success', 'Appointment booked successfully.');
      onBooked();
      onClose();
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'Could not save appointment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Dynamic title based on current step
  const modalTitle = 
    step === 'search' ? 'Identify Patient' : 
    step === 'create_patient' ? 'New Patient Profile' :
    'Appointment Details';

  return (
    <KeyboardAwareModal visible={visible} onClose={onClose} title={modalTitle}>
      {/* STEP 1: SEARCH */}
      {step === 'search' && (
        <>
          <Text style={styles.infoBadge}>Live Database Search Enabled</Text>
          <Text style={styles.label}>Patient Phone Number</Text>
          <View style={styles.inputRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Enter 10-digit number"
              maxLength={15} // allow paste with +91
              value={phone}
              onChangeText={(val) => {
                setPhone(val.replace(/[^0-9]/g, '').slice(-10));
                setPatientFound(null);
                setHasSearched(false);
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSearch}
            disabled={isSearching || phone.length < 10}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Search Storage</Text>
            )}
          </TouchableOpacity>

          {phone.length === 10 && hasSearched && !isSearching && !patientFound && (
            <View style={styles.notFoundBox}>
              <Ionicons name="warning-outline" size={32} color="#f59e0b" />
              <Text style={styles.notFoundTitle}>Patient Not Found</Text>
              <Text style={styles.notFoundText}>No record matches this number.</Text>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => setStep('create_patient')}
              >
                <Text style={styles.outlineBtnText}>Create New Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* STEP 2: CREATE PATIENT */}
      {step === 'create_patient' && (
        <>
          <Text style={styles.label}>Patient Full Name</Text>
          <TextInput
            style={styles.fullInput}
            placeholder="Enter full name"
            value={newPatientName}
            onChangeText={setNewPatientName}
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['male', 'female', 'other'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, newPatientGender === g && styles.genderBtnActive]}
                onPress={() => setNewPatientGender(g)}
              >
                <Text style={[styles.genderBtnText, newPatientGender === g && styles.genderBtnTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep('search')}
              disabled={isProcessing}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
              onPress={proceedWithNewPatient}
              disabled={isProcessing || !newPatientName}
            >
              {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue to Details</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* STEP 3: APPOINTMENT DETAILS */}
      {step === 'appointment_details' && patientFound && (
        <>
          <View style={styles.lockedPatientBox}>
            <View style={styles.lockedPatientHeader}>
              <Ionicons name="person-circle" size={32} color={BRAND} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.lockedPatientName}>{patientFound.fullName || patientFound.full_name}</Text>
                <Text style={styles.lockedPatientPhone}>+{patientFound.phoneNo || patientFound.phone_no}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.label}>Consultation Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity 
              style={[styles.typeBtn, apptType === 'in-person' && styles.typeBtnActive]}
              onPress={() => setApptType('in-person')}
            >
              <Ionicons name="business" size={20} color={apptType === 'in-person' ? BRAND : '#64748b'} />
              <Text style={[styles.typeBtnText, apptType === 'in-person' && styles.typeBtnTextActive]}>In-Person</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeBtn, apptType === 'video' && styles.typeBtnActive]}
              onPress={() => setApptType('video')}
            >
              <Ionicons name="videocam" size={20} color={apptType === 'video' ? BRAND : '#64748b'} />
              <Text style={[styles.typeBtnText, apptType === 'video' && styles.typeBtnTextActive]}>Video Call</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Appointment Date & Time</Text>
          {Platform.OS === 'ios' ? (
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <DateTimePicker
                value={date}
                mode="datetime"
                display="compact"
                onChange={(e, d) => d && setDate(d)}
                style={{ height: 40 }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity style={styles.dateTimeBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={styles.dateTimeText}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateTimeBtn} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={20} color="#64748b" />
                <Text style={styles.dateTimeText}>
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(e, d) => {
                setShowDatePicker(false);
                if (d) {
                  const newDate = new Date(date);
                  newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                  setDate(newDate);
                }
              }}
            />
          )}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={(e, d) => {
                setShowTimePicker(false);
                if (d) {
                  const newDate = new Date(date);
                  newDate.setHours(d.getHours(), d.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}

          <Text style={styles.label}>Duration (Minutes)</Text>
          <View style={styles.durationRow}>
            {[15, 30, 45, 60].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationBtnText, duration === d && styles.durationBtnTextActive]}>
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={handleBookAppointment}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Booking</Text>}
          </TouchableOpacity>
        </>
      )}
    </KeyboardAwareModal>
  );
}

// ---------------------------------------------------------------------------
// Styles (Structural modal styles removed! Handled by KeyboardAwareModal)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  infoBadge: {
    color: '#166534',
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  fullInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 20,
  },
  prefixBox: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    color: '#0f172a',
  },
  primaryBtn: {
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  notFoundBox: {
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#b45309',
    marginTop: 12,
  },
  notFoundText: {
    fontSize: 13,
    color: '#d97706',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d97706',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  outlineBtnText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: BRAND,
    backgroundColor: '#f0fdf9',
  },
  genderBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: BRAND,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  lockedPatientBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  lockedPatientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  lockedPatientPhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    gap: 8,
  },
  typeBtnActive: {
    borderColor: BRAND,
    backgroundColor: '#f0fdf9',
  },
  typeBtnText: {
    fontWeight: '600',
    color: '#475569',
  },
  typeBtnTextActive: {
    color: BRAND,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  durationBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
  },
  durationBtnActive: {
    borderColor: BRAND,
    backgroundColor: '#f0fdf9',
  },
  durationBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  durationBtnTextActive: {
    color: BRAND,
  },
});