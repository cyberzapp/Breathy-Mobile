import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import AsyncAutocomplete from '../components/ui/AsyncAutocomplete';
import {
  searchDegrees,
  searchSpecialties,
  searchMedicalCouncils,
} from '../services/profileService';
import { useOnboardingSubmit } from '../hooks/useOnboardingSubmit';
import ErrorModal from '../components/ui/ErrorModal';
import WarningModal from '../components/ui/WarningModal';

// --- Sub-components (Memoized for performance) ---

const PersonalDetailsSection = React.memo(({
  c, fullName, setFullName, experience, setExperience, gender, setGender, isSubmitting
}: any) => {
  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>1. Personal Details</Text>

      <View style={[styles.inputWrapper, fullName ? styles.inputSuccess : null]}>
        <Ionicons name="person-outline" size={20} color={fullName ? '#10b981' : c.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="Full Name"
          placeholderTextColor={c.textTertiary}
          value={fullName}
          onChangeText={setFullName}
          editable={!isSubmitting}
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
            editable={!isSubmitting}
          />
          {experience.length > 0 && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
        </View>

        <View style={[styles.genderRow, { backgroundColor: c.input, borderColor: c.borderMedium }]}>
          {[
            { id: 'male', icon: 'male-outline', label: 'Male' },
            { id: 'female', icon: 'female-outline', label: 'Female' },
            { id: 'other', icon: 'transgender-outline', label: 'Other' }
          ].map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.genderBtn,
                gender === g.id && { backgroundColor: '#14b8a6' },
              ]}
              onPress={() => setGender(g.id)}
              disabled={isSubmitting}
              accessibilityLabel={g.label}
            >
              <Ionicons
                name={g.icon as any}
                size={24}
                color={gender === g.id ? '#fff' : c.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
});

const EducationExpertiseSection = React.memo(({
  c, degrees, setDegrees, specialties, setSpecialties, isSubmitting
}: any) => {
  const [degreeInput, setDegreeInput] = useState('');
  const [specialtyInput, setSpecialtyInput] = useState('');
  
  // Temporary state to hold the "currently selected" object from the dropdown
  const [selectedDegreeObj, setSelectedDegreeObj] = useState<any>(null);
  const [selectedSpecialtyObj, setSelectedSpecialtyObj] = useState<any>(null);

  const handleAddDegree = useCallback(() => {
    // Ensure we have a valid object with an ID before adding
    if (selectedDegreeObj && !degrees.find((d: any) => d.id === selectedDegreeObj.id)) {
      setDegrees((prev: any[]) => [...prev, selectedDegreeObj]);
      setDegreeInput('');
      setSelectedDegreeObj(null);
    }
  }, [selectedDegreeObj, degrees, setDegrees]);

  const handleAddSpecialty = useCallback(() => {
    if (selectedSpecialtyObj && !specialties.find((s: any) => s.id === selectedSpecialtyObj.id)) {
      setSpecialties((prev: any[]) => [...prev, selectedSpecialtyObj]);
      setSpecialtyInput('');
      setSelectedSpecialtyObj(null);
    }
  }, [selectedSpecialtyObj, specialties, setSpecialties]);

  const handleRemoveDegree = useCallback((index: number) => {
    setDegrees((prev: string[]) => prev.filter((_, i) => i !== index));
  }, [setDegrees]);



  const handleRemoveSpecialty = useCallback((index: number) => {
    setSpecialties((prev: string[]) => prev.filter((_, i) => i !== index));
  }, [setSpecialties]);

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>2. Education & Expertise</Text>

      {/* Degrees Multiple Selection */}
      <View style={[styles.multiSelectWrapper, { borderColor: degrees.length > 0 ? '#10b981' : c.borderMedium, marginBottom: 16 }]}>
        <View style={{ flex: 1 }}>
          <AsyncAutocomplete
            value={degreeInput}
            onChangeText={setDegreeInput}
            searchApi={searchDegrees}
            dataKey="name"
            placeholder="Primary Degree (e.g., MBBS, MD)"
            icon="school-outline"
            editable={!isSubmitting}
            onSelect={(item) => setSelectedDegreeObj(item)}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: degreeInput.length > 2 && !isSubmitting ? '#14b8a6' : c.input }]}
          onPress={handleAddDegree}
          disabled={degreeInput.length < 3 || isSubmitting}
        >
          <Text style={{ color: degreeInput.length > 2 && !isSubmitting ? '#fff' : c.textTertiary, fontWeight: 'bold' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {degrees.length > 0 && (
        <View style={[styles.chipsContainer, { marginBottom: 16 }]}>
          {degrees.map((d: any, idx: number) => (
            <View key={d.id || idx} style={[styles.chip, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
              <Text style={{ color: '#4338ca', fontWeight: '500', fontSize: 13 }}>{d.name || d}</Text>
              <TouchableOpacity onPress={() => handleRemoveDegree(idx)} disabled={isSubmitting}>
                <Ionicons name="close-circle" size={16} color="#4338ca" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Specialties Multiple Selection */}
      <View style={[styles.multiSelectWrapper, { borderColor: specialties.length > 0 ? '#10b981' : c.borderMedium }]}>
        <View style={{ flex: 1 }}>
          <AsyncAutocomplete
            value={specialtyInput}
            onChangeText={setSpecialtyInput}
            searchApi={searchSpecialties}
            dataKey="name"
            placeholder="Search Specialties (e.g., Cardiology)"
            icon="medical-outline"
            editable={!isSubmitting}
            onSelect={(item) => setSelectedSpecialtyObj(item)}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: specialtyInput.length > 2 && !isSubmitting ? '#14b8a6' : c.input }]}
          onPress={handleAddSpecialty}
          disabled={specialtyInput.length < 3 || isSubmitting}
        >
          <Text style={{ color: specialtyInput.length > 2 && !isSubmitting ? '#fff' : c.textTertiary, fontWeight: 'bold' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {specialties.length > 0 && (
        <View style={styles.chipsContainer}>
          {specialties.map((sp: any, idx: number) => (
            <View key={sp.id || idx} style={[styles.chip, { backgroundColor: '#ccfbf1', borderColor: '#99f6e4' }]}>
              <Text style={{ color: '#0f766e', fontWeight: '500', fontSize: 13 }}>{sp.name || sp}</Text>
              <TouchableOpacity onPress={() => handleRemoveSpecialty(idx)} disabled={isSubmitting}>
                <Ionicons name="close-circle" size={16} color="#0f766e" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const MedicalRegistrationSection = React.memo(({
  c, registrationNumber, setRegistrationNumber, medicalCouncil, setMedicalCouncil, medicalCouncilId, setMedicalCouncilId, isSubmitting
}: any) => {
  return (
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
          editable={!isSubmitting}
        />
        {registrationNumber.length > 0 && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
      </View>

      <View style={{ zIndex: 100 }}>
        <AsyncAutocomplete
          value={medicalCouncil}
          onChangeText={setMedicalCouncil}
          searchApi={searchMedicalCouncils}
          dataKey="name"
          placeholder="Medical Council (e.g., Delhi Medical Council)"
          icon="business-outline"
          editable={!isSubmitting}
          onSelect={(selectedItem) => {
            // Store the UUID for submission
            setMedicalCouncilId(selectedItem.id);
          }}
        />
      </View>
    </View>
  );
});

export default function NativeOnboardingScreen() {
  const c = useColors();
  const { submitProfile, isSubmitting, submitError, setSubmitError, submitWarning, setSubmitWarning } = useOnboardingSubmit();

  const keyboardHeight = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHeight]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('other');
  const [experience, setExperience] = useState('');
  const [degrees, setDegrees] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('');
  const [medicalCouncilId, setMedicalCouncilId] = useState<string | null>(null);

  // Validation
  const isValid =
    fullName.trim().length > 2 &&
    experience.trim().length > 0 &&
    degrees.length > 0 &&
    specialties.length > 0 &&
    registrationNumber.trim().length > 0 &&
    medicalCouncil.trim().length > 0;

  const handleSubmit = async () => {
    await submitProfile(
      {
        fullName,
        gender,
        experience,
        degrees,
        specialties,
        registrationNumber,
        medicalCouncilId,
      },
      isValid
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <Animated.View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
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

          <PersonalDetailsSection
            c={c}
            fullName={fullName}
            setFullName={setFullName}
            experience={experience}
            setExperience={setExperience}
            gender={gender}
            setGender={setGender}
            isSubmitting={isSubmitting}
          />

          <EducationExpertiseSection
            c={c}
            degrees={degrees}
            setDegrees={setDegrees}
            specialties={specialties}
            setSpecialties={setSpecialties}
            isSubmitting={isSubmitting}
          />

          <MedicalRegistrationSection
            c={c}
            registrationNumber={registrationNumber}
            setRegistrationNumber={setRegistrationNumber}
            medicalCouncil={medicalCouncil}
            setMedicalCouncil={setMedicalCouncil}
            medicalCouncilId={medicalCouncilId}
            setMedicalCouncilId={setMedicalCouncilId}
            isSubmitting={isSubmitting}
          />

          {/* HINT TEXT */}
          <Text style={[styles.hintText, { color: c.textTertiary }]}>
            You can add more details like your clinic locations, digital signature, profile photo, and passing years later from Settings.
          </Text>
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
      </Animated.View>
      <WarningModal
        visible={!!submitWarning}
        message={submitWarning || ''}
        onClose={() => setSubmitWarning(null)}
      />
      <ErrorModal
        visible={!!submitError}
        message={submitError || ''}
        onClose={() => setSubmitError(null)}
      />
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
    zIndex: 1, // Base zIndex
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
  hintText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 10,
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
