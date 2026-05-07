import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  findPatientsByPhone,
  addWalkInPatient,
} from '../services/queueService';
// Import your new wrapper!
import KeyboardAwareModal from '../components/ui/KeyboardAwareModal';
import WarningModal from '../components/ui/WarningModal';
import ErrorModal from '../components/ui/ErrorModal';

const BRAND = '#22ae9e';
type Step = 'search' | 'create';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  onSuccess?: (msg: string) => void;
}

export default function AddPatientToQueueModal({ visible, onClose, onAdded, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('search');
  const [phone, setPhone] = useState('');
  const [patientFound, setPatientFound] = useState<any | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('other');
  const [newPatientDob, setNewPatientDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('search');
      setPhone('');
      setPatientFound(null);
      setHasSearched(false);
      setNewPatientName('');
      setNewPatientGender('other');
      setNewPatientDob(null);
      setShowDobPicker(false);
    }
  }, [visible]);

  const handleSearch = async () => {
    if (phone.length < 10) {
      setWarningMessage('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSearching(true);
    try {
      const results = await findPatientsByPhone(phone);
      if (results && results.length > 0) {
        setPatientFound(results[0]);
      } else {
        setPatientFound(null);
        setHasSearched(true);
      }
    } catch (error: any) {
      setErrorMessage('Failed to search phone number. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddPatient = async () => {
    setIsAdding(true);
    try {
      if (patientFound) {
        await addWalkInPatient({ patientId: patientFound.id });
      } else {
        if (!newPatientName) {
          setWarningMessage('Please enter the patient name.');
          setIsAdding(false);
          return;
        }
        await addWalkInPatient({
          fullName: newPatientName,
          phone: `91${phone}`,
          gender: newPatientGender,
          ...(newPatientDob ? { dob: newPatientDob.toISOString().split('T')[0] } : {}),
        });
      }
      if (onSuccess) {
        onSuccess('Patient added to queue successfully.');
      } else {
        onClose();
      }
      onAdded();
    } catch (error: any) {
      setErrorMessage('Failed to add patient to queue. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
    <KeyboardAwareModal 
      visible={visible} 
      onClose={onClose} 
      title={step === 'search' ? 'Add to Queue' : 'Create New Patient'}
    >
      {step === 'search' ? (
        <>
          <Text style={styles.label}>Patient Phone Number</Text>
          <View style={styles.inputRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Enter 10-digit number"
              maxLength={10}
              value={phone}
              onChangeText={(val) => {
                setPhone(val.replace(/[^0-9]/g, '').slice(0, 10));
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
              <Text style={styles.primaryBtnText}>Search</Text>
            )}
          </TouchableOpacity>

          {patientFound ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="person-circle" size={40} color={BRAND} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{patientFound.full_name}</Text>
                  <Text style={styles.resultPhone}>+{patientFound.phone_no}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddPatient} disabled={isAdding}>
                {isAdding ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add to Queue</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : phone.length === 10 && hasSearched && !isSearching && !patientFound && (
            <View style={styles.notFoundBox}>
              <Ionicons name="warning-outline" size={32} color="#f59e0b" />
              <Text style={styles.notFoundTitle}>Patient Not Found</Text>
              <Text style={styles.notFoundText}>No patient registered with this number.</Text>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep('create')}>
                <Text style={styles.outlineBtnText}>Create New Patient</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.infoText}>Creating new patient profile for phone: +91 {phone}</Text>

          <Text style={styles.label}>Patient Full Name</Text>
          <TextInput
            style={styles.fullInput}
            placeholder="Enter full name"
            value={newPatientName}
            onChangeText={setNewPatientName}
            autoFocus={true}
          />

          <Text style={styles.label}>Date of Birth <Text style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</Text></Text>
          {Platform.OS === 'ios' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 }}>
              <DateTimePicker
                value={newPatientDob || new Date(2000, 0, 1)}
                mode="date"
                display="compact"
                maximumDate={new Date()}
                onChange={(_, d) => d && setNewPatientDob(d)}
                style={{ height: 40 }}
              />
              {newPatientDob && (
                <TouchableOpacity onPress={() => setNewPatientDob(null)}>
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDobPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={[styles.datePickerText, !newPatientDob && { color: '#94a3b8' }]}>
                  {newPatientDob
                    ? newPatientDob.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Select date of birth'}
                </Text>
                {newPatientDob && (
                  <TouchableOpacity onPress={() => setNewPatientDob(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showDobPicker && (
                <DateTimePicker
                  value={newPatientDob || new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_, d) => {
                    setShowDobPicker(false);
                    if (d) setNewPatientDob(d);
                  }}
                />
              )}
            </>
          )}

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
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('search')} disabled={isAdding}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
              onPress={handleAddPatient}
              disabled={isAdding || !newPatientName}
            >
              {isAdding ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save & Add</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAwareModal>
    <WarningModal
      visible={!!warningMessage}
      message={warningMessage || ''}
      onClose={() => setWarningMessage(null)}
    />
    <ErrorModal
      visible={!!errorMessage}
      message={errorMessage || ''}
      onClose={() => setErrorMessage(null)}
    />
  </>
  );
}

// Note: I stripped out the overlay/sheet/header styles since they now live in the wrapper!
const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  infoText: { fontSize: 13, color: BRAND, backgroundColor: '#f0fdf9', padding: 10, borderRadius: 8, overflow: 'hidden', marginBottom: 16, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  prefixBox: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#f8fafc', borderRightWidth: 1, borderRightColor: '#cbd5e1' },
  prefixText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 16, color: '#0f172a' },
  fullInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a', marginBottom: 20 },
  primaryBtn: { backgroundColor: BRAND, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: { marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  resultInfo: { marginLeft: 12 },
  resultName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  resultPhone: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND, paddingVertical: 12, borderRadius: 10, gap: 6 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  notFoundBox: { marginTop: 24, padding: 20, alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  notFoundTitle: { fontSize: 16, fontWeight: '700', color: '#b45309', marginTop: 12 },
  notFoundText: { fontSize: 13, color: '#d97706', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  outlineBtn: { borderWidth: 1, borderColor: '#d97706', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  outlineBtnText: { color: '#d97706', fontSize: 14, fontWeight: '600' },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  genderBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, alignItems: 'center' },
  genderBtnActive: { borderColor: BRAND, backgroundColor: '#f0fdf9' },
  genderBtnText: { color: '#475569', fontWeight: '600' },
  genderBtnTextActive: { color: BRAND },
  footerRow: { flexDirection: 'row', gap: 12 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, gap: 10 },
  datePickerText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0f172a' },
});