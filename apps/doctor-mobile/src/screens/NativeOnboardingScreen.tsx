import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import AsyncAutocomplete from '../components/ui/AsyncAutocomplete';
import {
  searchDegrees,
  searchSpecialties,
  searchMedicalCouncils,
} from '../services/profileService';

export default function NativeOnboardingScreen() {
  const c = useColors();
  const fetchProfileStatus = useAuthStore((s) => s.fetchProfileStatus);
  const session = useAuthStore((s) => s.session);

  // Form State
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('other');
  const [experience, setExperience] = useState('');
  const [degree, setDegree] = useState('');
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const isValid = 
    fullName.trim().length > 2 &&
    experience.trim().length > 0 &&
    degree.trim().length > 0 &&
    specialties.length > 0 &&
    registrationNumber.trim().length > 0 &&
    medicalCouncil.trim().length > 0;

  const handleAddSpecialty = (val: string) => {
    if (val.trim() && !specialties.includes(val.trim())) {
      setSpecialties((prev) => [...prev, val.trim()]);
    }
    setSpecialtyInput('');
  };

  const handleRemoveSpecialty = (index: number) => {
    setSpecialties((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Hold on', 'Please fill all mandatory fields before completing.');
      return;
    }

    if (!session?.user?.id) {
      Alert.alert('Error', 'No authenticated user found.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Personal Details
      const { error: err1 } = await supabase.rpc('update_doctor_profile_step', {
        p_doctor_id: session.user.id,
        p_step_name: 'personal_details',
        p_step_data: {
          full_name: fullName.trim(),
          gender,
          experience_years: parseInt(experience.trim(), 10) || 0,
        },
      });
      if (err1) throw err1;

      // Step 2: Education & Specialization
      const { error: err2 } = await supabase.rpc('update_doctor_profile_step', {
        p_doctor_id: session.user.id,
        p_step_name: 'education_specialization',
        p_step_data: {
          education: [{ degree_text: degree.trim() }],
          specialties: specialties.map(sp => ({ specialty_text: sp })),
        },
      });
      if (err2) throw err2;

      // Step 3: Registration
      const { error: err3 } = await supabase.rpc('update_doctor_profile_step', {
        p_doctor_id: session.user.id,
        p_step_name: 'registration_documents',
        p_step_data: {
          registration_documents: [{
            registration_number: registrationNumber.trim(),
            medical_council_text: medicalCouncil.trim(),
          }],
        },
      });
      if (err3) throw err3;

      // Refresh auth store to pull new status ('awaiting_review' or 'approved')
      await fetchProfileStatus();

    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={32} color="#14b8a6" />
            </View>
            <Text style={[styles.title, { color: c.text }]}>Complete Your Profile</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              Just the essentials to verify your medical credentials. Takes less than 2 minutes.
            </Text>
          </View>

          {/* PERSONAL DETAILS */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>1. Personal Details</Text>
            
            <View style={[styles.inputWrapper, fullName ? styles.inputSuccess : null]}>
              <Ionicons name="person-outline" size={20} color={fullName ? '#10b981' : c.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="Full Name (e.g., Dr. John Doe)"
                placeholderTextColor={c.textTertiary}
                value={fullName}
                onChangeText={setFullName}
              />
              {fullName.length > 2 && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1 }, experience ? styles.inputSuccess : null]}>
                <Ionicons name="briefcase-outline" size={20} color={experience ? '#10b981' : c.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: c.text }]}
                  placeholder="Experience (Years)"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="numeric"
                  value={experience}
                  onChangeText={setExperience}
                />
                {experience.length > 0 && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
              </View>

              <View style={[styles.genderRow, { backgroundColor: c.input, borderColor: c.borderMedium }]}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      gender === g && { backgroundColor: '#14b8a6' },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[
                      styles.genderText,
                      { color: c.textSecondary },
                      gender === g && { color: '#fff' },
                    ]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* EDUCATION & SPECIALIZATION */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>2. Education & Expertise</Text>
            
            <AsyncAutocomplete
              value={degree}
              onChangeText={setDegree}
              searchApi={searchDegrees}
              dataKey="name"
              placeholder="Primary Degree (e.g., MBBS, MD)"
              icon="school-outline"
              style={{ marginBottom: 16 }}
            />

            {/* Specialties Multiple Selection */}
            <View style={[styles.multiSelectWrapper, { borderColor: specialties.length > 0 ? '#10b981' : c.borderMedium }]}>
              <AsyncAutocomplete
                value={specialtyInput}
                onChangeText={(val) => {
                  setSpecialtyInput(val);
                  // If they select an option from dropdown, we add it automatically
                  if (val.length > 2 && val === specialtyInput) {
                    // But we don't know when they click, so we'll just show an Add button
                  }
                }}
                searchApi={searchSpecialties}
                dataKey="name"
                placeholder="Search Specialties (e.g., Cardiology)"
                icon="medical-outline"
              />
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: specialtyInput.length > 2 ? '#14b8a6' : c.input }]}
                onPress={() => handleAddSpecialty(specialtyInput)}
                disabled={specialtyInput.length < 3}
              >
                <Text style={{ color: specialtyInput.length > 2 ? '#fff' : c.textTertiary, fontWeight: 'bold' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {specialties.length > 0 && (
              <View style={styles.chipsContainer}>
                {specialties.map((sp, idx) => (
                  <View key={idx} style={[styles.chip, { backgroundColor: '#ccfbf1', borderColor: '#99f6e4' }]}>
                    <Text style={{ color: '#0f766e', fontWeight: '500', fontSize: 13 }}>{sp}</Text>
                    <TouchableOpacity onPress={() => handleRemoveSpecialty(idx)}>
                      <Ionicons name="close-circle" size={16} color="#0f766e" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* REGISTRATION */}
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>3. Medical Registration</Text>
            
            <View style={[styles.inputWrapper, registrationNumber ? styles.inputSuccess : null, { marginBottom: 16 }]}>
              <Ionicons name="document-text-outline" size={20} color={registrationNumber ? '#10b981' : c.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder="Registration Number"
                placeholderTextColor={c.textTertiary}
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
              />
              {registrationNumber.length > 0 && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
            </View>

            <AsyncAutocomplete
              value={medicalCouncil}
              onChangeText={setMedicalCouncil}
              searchApi={searchMedicalCouncils}
              dataKey="name"
              placeholder="Medical Council (e.g., Delhi Medical Council)"
              icon="business-outline"
            />
          </View>

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.border }]}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              isValid ? { backgroundColor: '#14b8a6' } : { backgroundColor: c.borderMedium }
            ]}
            disabled={!isValid || isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>Complete Profile</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  inputSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  genderRow: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    height: 52,
  },
  genderBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  multiSelectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitBtn: {
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
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
