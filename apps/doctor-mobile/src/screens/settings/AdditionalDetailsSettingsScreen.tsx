import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import SharedHeader from '../../components/SharedHeader';
import {
  searchMedicalCouncils,
  updateAdditionalDetails,
} from '../../services/profileService';
import AsyncAutocomplete from '../../components/ui/AsyncAutocomplete';
import SuccessModal from '../../components/ui/SuccessModal';
import ErrorModal from '../../components/ui/ErrorModal';

export default function AdditionalDetailsSettingsScreen() {
  const c = useColors();
  const navigation = useNavigation();
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const fetchProfileStatus = useAuthStore((s) => s.fetchProfileStatus);

  const [city, setCity] = useState(profileStatus?.city || '');
  const initialPhone = profileStatus?.phone_no ? profileStatus.phone_no.replace('+91', '').replace(/ /g, '') : '';
  const [phoneNo, setPhoneNo] = useState(initialPhone);
  const [email, setEmail] = useState(profileStatus?.email || '');
  const [registrationYear, setRegistrationYear] = useState(
    profileStatus?.registration_year ? profileStatus.registration_year.toString() : ''
  );

  // For autocomplete, if there's no pre-fetched council name in profileStatus, 
  // we leave the text blank or show 'Saved Council' if council_id exists.
  const [medicalCouncilText, setMedicalCouncilText] = useState(
    profileStatus?.council_id ? 'Saved Council' : ''
  );
  const [medicalCouncilId, setMedicalCouncilId] = useState<string | null>(
    profileStatus?.council_id || null
  );

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        city: city.trim(),
        phone_no: phoneNo ? `+91 ${phoneNo.trim()}` : '',
        email: email.trim(),
        registration_year: registrationYear ? parseInt(registrationYear, 10) : null,
        council_id: medicalCouncilId || null,
      };

      await updateAdditionalDetails(payload);

      // Refresh the local store with the new data
      await fetchProfileStatus(true);

      setShowSuccess(true);
    } catch (error: any) {
      console.error('Error saving additional details:', error);
      setErrorMessage('Failed to save details. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]} edges={['top']}>


      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.description, { color: c.textSecondary }]}>
            Update the optional contact and registration details that were skipped during onboarding.
          </Text>

          {/* Contact Details Section */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
            <Text style={[styles.sectionTitle, { color: c.text, borderBottomColor: c.border }]}>
              Contact Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>City</Text>
              <TextInput
                style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.borderMedium }]}
                placeholder="e.g., Kolkata"
                placeholderTextColor={c.textTertiary}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Phone Number</Text>
              <View style={[styles.phoneInputContainer, { backgroundColor: c.input, borderColor: c.borderMedium }]}>
                <View style={[styles.phonePrefix, { borderRightColor: c.borderMedium }]}>
                  <Text style={[styles.phonePrefixText, { color: c.text }]}>+91</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: c.text }]}
                  placeholder="9876543210"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNo}
                  onChangeText={(text) => {
                    const cleanText = text.replace(/[^0-9]/g, '');
                    setPhoneNo(cleanText);
                  }}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.borderMedium }]}
                placeholder="doctor@example.com"
                placeholderTextColor={c.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Medical Council Details Section */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium, zIndex: 10 }]}>
            <Text style={[styles.sectionTitle, { color: c.text, borderBottomColor: c.border }]}>
              Medical Council Details
            </Text>

            <View style={[styles.inputGroup, { zIndex: 10 }]}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Council Name</Text>
              <AsyncAutocomplete
                value={medicalCouncilText}
                onChangeText={setMedicalCouncilText}
                searchApi={searchMedicalCouncils}
                dataKey="name"
                placeholder="Select Medical Council"
                icon="business-outline"
                onSelect={(selectedItem) => {
                  setMedicalCouncilId(selectedItem.id);
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Registration Year</Text>
              <TextInput
                style={[styles.input, { color: c.text, backgroundColor: c.input, borderColor: c.borderMedium }]}
                placeholder="e.g., 2012"
                placeholderTextColor={c.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
                value={registrationYear}
                onChangeText={setRegistrationYear}
              />
            </View>
          </View>

          {/* Documents Placeholder Section */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
            <Text style={[styles.sectionTitle, { color: c.text, borderBottomColor: c.border }]}>
              Documents
            </Text>
            <View style={styles.placeholderBox}>
              <Ionicons name="document-attach-outline" size={32} color={c.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={[styles.placeholderText, { color: c.textSecondary }]}>
                Document upload is managed via the web portal or full app verification flow.
              </Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer / Save Button */}
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#14b8a6' }]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Details</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <SuccessModal
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
        message="Additional details saved successfully."
      />
      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 15,
    letterSpacing: 1,
  },
  placeholderBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveBtn: {
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
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
