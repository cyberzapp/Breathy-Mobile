import React, { useState, useCallback, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBreathySounds } from '../../hooks/useBreathySounds';
import { useDrugSearch } from '../../hooks/useDrugSearch';
import { useTestSearch } from '../../hooks/useTestSearch';
import { isOnline } from '../../services/offlineCacheService';
import {
  createPrescription,
  getPrescriptionLocations,
  findPatientsByPhone,
  listTemplates,
  getTemplateById,
  createTemplate,
  searchCommonNames,
  searchSurnames,
  getAISuggestions,
  getPrescriptionStyle,
  type Medication,
  type LabReport,
  type PrescriptionPayload,
  type PrescriptionLocation,
  type PrescriptionTemplate,
} from '../../services/prescriptionService';
import MedicationRow from '../../components/prescription/MedicationRow';
import InvestigationRow from '../../components/prescription/InvestigationRow';
import LabReportRow from '../../components/prescription/LabReportRow';
import VitalsBar from '../../components/prescription/VitalsBar';
import PrescriptionBuildingLoader from '../../components/prescription/PrescriptionBuildingLoader';
import NameAutocomplete from '../../components/prescription/NameAutocomplete';
import PatientSelectModal from '../../components/prescription/PatientSelectModal';
import MoreOptionsModal from '../../components/prescription/MoreOptionsModal';
import SaveTemplateModal from '../../components/prescription/SaveTemplateModal';

// ---------------------------------------------------------------------------
// DigitalPrescriptionForm — Full native prescription form
// ---------------------------------------------------------------------------

const EMPTY_MED: Medication = {
  name: '', strength: '', frequency: '', duration: '', notes: '', generic_name: '',
};

export default function DigitalPrescriptionForm() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { playPop, playSuccess, playError } = useBreathySounds();

  // --- Form State ---
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientSurname, setPatientSurname] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('other');
  const [patientPhone, setPatientPhone] = useState('');
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);
  const [isFindingPatient, setIsFindingPatient] = useState(false);
  const [foundPatients, setFoundPatients] = useState<any[]>([]);
  const [showPatientModal, setShowPatientModal] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<PrescriptionLocation[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [advice, setAdvice] = useState('');
  const [adviceVariables, setAdviceVariables] = useState<Record<string, string>>({});
  const [baseDefaultAdvice, setBaseDefaultAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [vitals, setVitals] = useState({ bp: '', pulse: '', spo2: '', temp: '', weight: '' });
  const [medications, setMedications] = useState<Medication[]>([{ ...EMPTY_MED }]);
  const [investigations, setInvestigations] = useState<string[]>(['']);
  const [labReports, setLabReports] = useState<LabReport[]>([]);

  // Templates
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // More Options & AI
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offline, setOffline] = useState(false);

  // --- Hooks ---
  const drugSearch = useDrugSearch();
  const testSearch = useTestSearch();

  // --- Load locations + templates + style ---
  useEffect(() => {
    (async () => {
      const online = await isOnline();
      setOffline(!online);
      if (online) {
        try {
          const locs = await getPrescriptionLocations();
          if (Array.isArray(locs)) {
            setLocations(locs);
            const defaultLoc = locs.find((l) => l.is_default) || locs[0];
            if (defaultLoc) setLocationId(defaultLoc.id);
          }
        } catch {}
        try {
          setIsLoadingTemplates(true);
          const tpls = await listTemplates();
          if (Array.isArray(tpls)) setTemplates(tpls);
        } catch {} finally { setIsLoadingTemplates(false); }
        try {
          const styleData: any = await getPrescriptionStyle();
          if (styleData?.default_advice) {
            setBaseDefaultAdvice(styleData.default_advice);
            const matches = styleData.default_advice.match(/\[(.*?)\]/g);
            if (matches) {
              const initialVars: Record<string, string> = {};
              matches.forEach((match: string) => {
                initialVars[match.replace(/\[|\]/g, '')] = '';
              });
              setAdviceVariables(initialVars);
            }
          }
        } catch {}
      }
    })();
  }, []);

  // --- Patient phone lookup ---
  const handlePhoneBlur = useCallback(async () => {
    if (patientPhone.length === 10 && !linkedPatientId) {
      setIsFindingPatient(true);
      try {
        const results: any = await findPatientsByPhone(patientPhone);
        if (Array.isArray(results) && results.length > 0) {
          if (results.length === 1) {
            selectPatient(results[0]);
          } else {
            setFoundPatients(results);
            setShowPatientModal(true);
          }
        }
      } catch {}
      setIsFindingPatient(false);
    }
  }, [patientPhone, linkedPatientId]);

  const selectPatient = (p: any) => {
    playPop();
    const parts = p.full_name?.split(' ') || [];
    setPatientFirstName(parts[0] || '');
    setPatientSurname(parts.slice(1).join(' ') || '');
    if (p.age) setPatientAge(String(p.age));
    if (p.gender) setPatientGender(p.gender);
    setLinkedPatientId(p.id);
    setShowPatientModal(false);
  };

  // --- Medication handlers ---
  const handleMedChange = useCallback(
    (index: number, field: keyof Medication, value: string) => {
      setMedications((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], [field]: value };
        return copy;
      });
    }, []
  );

  const addMedication = () => setMedications((p) => [...p, { ...EMPTY_MED }]);
  const removeMedication = (i: number) =>
    setMedications((p) => p.filter((_, idx) => idx !== i));

  // --- Investigation handlers ---
  const handleInvChange = (index: number, value: string) => {
    setInvestigations((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };
  const addInvestigation = () => setInvestigations((p) => [...p, '']);
  const removeInvestigation = (i: number) =>
    setInvestigations((p) => p.filter((_, idx) => idx !== i));

  // --- Lab report handlers ---
  const addLabReport = () => setLabReports((p) => [...p, { test_name: '', value: '', unit: '' }]);
  const removeLabReport = (i: number) => setLabReports((p) => p.filter((_, idx) => idx !== i));
  const handleLabChange = (i: number, field: keyof LabReport, value: string) => {
    setLabReports((prev) => { const c2 = [...prev]; c2[i] = { ...c2[i], [field]: value }; return c2; });
  };

  // --- Vitals handler ---
  const handleVitalChange = (field: string, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  // --- Template handlers (matches web) ---
  const handleLoadTemplate = async (tpl: PrescriptionTemplate) => {
    try {
      const data: any = await getTemplateById(tpl.id);
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.advice) setAdvice(data.advice);
      if (data.medications?.length > 0) {
        setMedications(data.medications.map((m: any) => ({
          ...m, generic_name: m.generic_name || '',
        })));
      }
      if (data.investigations?.length > 0) {
        setInvestigations(data.investigations.map((i: any) => i.test_name || i.name || ''));
      }
      setShowTemplatePicker(false);
      Alert.alert('Loaded', `Template "${data.template_name}" loaded.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load template.');
    }
  };

  const handleSaveTemplate = async (name: string) => {
    try {
      await createTemplate({
        template_name: name,
        diagnosis,
        advice,
        medications: medications.filter((m) => m.name),
        investigations: investigations.filter(Boolean).map((n) => ({ name: n })),
      });
      Alert.alert('Saved', `Template "${name}" saved.`);
      // Refresh templates
      try { const tpls = await listTemplates(); if (Array.isArray(tpls)) setTemplates(tpls); } catch {}
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save template.');
    }
  };

  const handleAISuggest = async () => {
    if (!diagnosis) {
      Alert.alert('Required', 'Please enter a diagnosis first.');
      return;
    }
    setIsAISuggesting(true);
    try {
      const data: any = await getAISuggestions({ diagnosis });
      if (data.medications?.length > 0) {
        setMedications(data.medications.map((m: any) => ({
          ...m, generic_name: m.generic_name || '',
        })));
      }
      if (data.investigations?.length > 0) {
        setInvestigations(data.investigations.map((i: any) => i.test_name || i.name || ''));
      }
    } catch (err: any) {
      Alert.alert('AI Error', err.message || 'Could not fetch suggestions.');
    } finally {
      setIsAISuggesting(false);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    const fullName = `${patientFirstName} ${patientSurname}`.trim();
    if (!fullName) { Alert.alert('Required', 'Patient name is required.'); return; }
    if (patientPhone.length < 10) { Alert.alert('Required', 'Valid 10-digit phone is required.'); return; }
    if (!locationId && locations.length > 0) { Alert.alert('Required', 'Select a prescription location.'); return; }

    const vitalsObj: any = {};
    if (vitals.bp) vitalsObj.bp = vitals.bp;
    if (vitals.pulse) vitalsObj.pulse = vitals.pulse;
    if (vitals.spo2) vitalsObj.spo2 = vitals.spo2;
    if (vitals.temp) vitalsObj.temp = vitals.temp;
    if (vitals.weight) vitalsObj.weight = vitals.weight;

    const filteredLabs = labReports.filter((r) => r.test_name && r.value);

    let finalDefaultAdvice: string | null = null;
    if (baseDefaultAdvice) {
      let generatedDefault = baseDefaultAdvice;
      if (Object.keys(adviceVariables).length > 0) {
        Object.keys(adviceVariables).forEach((key) => {
          const regex = new RegExp(`\\[${key}\\]`, 'g');
          generatedDefault = generatedDefault.replace(regex, adviceVariables[key] || '');
        });
      }
      finalDefaultAdvice = generatedDefault.trim();
    }

    const payload: PrescriptionPayload = {
      location_id: locationId,
      diagnosis,
      icd_code: icdCode || undefined,
      medications: medications.filter((m) => m.name),
      investigations: investigations.filter(Boolean).join('\n'),
      advice: advice.trim(),
      default_advice: finalDefaultAdvice,
      patientName: fullName,
      patientPhone: `91${patientPhone}`,
      patientAge,
      patientGender,
      patientId: linkedPatientId,
      vitals: Object.keys(vitalsObj).length > 0 ? vitalsObj : null,
      follow_up_date: followUp || null,
      lab_reports: filteredLabs.length > 0 ? filteredLabs : null,
    };

    setIsSubmitting(true);
    try {
      await createPrescription(payload);
      playSuccess();
      Alert.alert('Success', 'Prescription created and sent!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      playError();
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Selected location label ---
  const selectedLocation = locations.find((l) => l.id === locationId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PrescriptionBuildingLoader open={isSubmitting} patientName={patientFirstName ? `${patientFirstName} ${patientSurname}`.trim() : ''} />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Offline Banner */}
        {offline && (
          <View style={[styles.offlineBanner, { backgroundColor: c.warningBg }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={c.warning} />
            <Text style={[styles.offlineText, { color: c.warning }]}>
              You are offline. Some features may be limited.
            </Text>
          </View>
        )}

        {/* ═══ Location ═══ */}
        {locations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>📍 Location</Text>
            <TouchableOpacity
              style={[styles.locationPicker, { backgroundColor: c.input, borderColor: c.borderMedium }]}
              onPress={() => setShowLocationPicker(!showLocationPicker)}
              activeOpacity={0.7}
            >
              <Text style={[styles.locationText, { color: selectedLocation ? c.text : c.textTertiary }]}>
                {selectedLocation
                  ? `${selectedLocation.clinic_name} — ${selectedLocation.address_line_1}`
                  : 'Select location'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={c.textTertiary} />
            </TouchableOpacity>
            {showLocationPicker && (
              <View style={[styles.locationDropdown, { backgroundColor: c.card, borderColor: c.border }]}>
                {locations.map((loc) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.locationOption,
                      { borderBottomColor: c.border },
                      loc.id === locationId && { backgroundColor: c.brandBg },
                    ]}
                    onPress={() => { setLocationId(loc.id); setShowLocationPicker(false); }}
                  >
                    <Text style={[styles.locationOptionText, { color: c.text }]}>
                      {loc.clinic_name}
                    </Text>
                    <Text style={[styles.locationOptionMeta, { color: c.textTertiary }]}>
                      {loc.address_line_1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {/* Template Loader */}
          {templates.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.locationPicker, { backgroundColor: c.input, borderColor: c.borderMedium }]}
                onPress={() => setShowTemplatePicker(!showTemplatePicker)}
                activeOpacity={0.7}
              >
                <Text style={[styles.locationText, { color: c.textTertiary }]}>Load Template (Optional)</Text>
                <Ionicons name="chevron-down" size={18} color={c.textTertiary} />
              </TouchableOpacity>
              {showTemplatePicker && (
                <View style={[styles.locationDropdown, { backgroundColor: c.card, borderColor: c.border }]}>
                  {templates.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.locationOption, { borderBottomColor: c.border }]}
                      onPress={() => handleLoadTemplate(tpl)}
                    >
                      <Text style={[styles.locationOptionText, { color: c.text }]}>{tpl.template_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          </View>
        )}

        {/* ═══ Patient Details ═══ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>👤 Patient Details</Text>

          {linkedPatientId && (
            <View style={[styles.linkedBadge, { backgroundColor: c.successBg }]}>
              <Ionicons name="checkmark-circle" size={14} color={c.success} />
              <Text style={[styles.linkedText, { color: c.success }]}>Patient linked</Text>
            </View>
          )}

          <View style={[styles.row, { zIndex: 10 }]}>
            <NameAutocomplete
              style={{ flex: 1 }}
              value={patientFirstName}
              onChangeText={setPatientFirstName}
              searchApi={searchCommonNames}
              dataKey="name"
              placeholder="First Name *"
            />
            <NameAutocomplete
              style={{ flex: 1 }}
              value={patientSurname}
              onChangeText={setPatientSurname}
              searchApi={searchSurnames}
              dataKey="surname"
              placeholder="Surname"
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { width: 70, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
              value={patientAge}
              onChangeText={setPatientAge}
              placeholder="Age"
              placeholderTextColor={c.textTertiary}
              keyboardType="numeric"
            />
            {/* Gender picker */}
            <View style={[styles.genderRow, { backgroundColor: c.cardAlt, borderColor: c.border, flex: 1 }]}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    patientGender === g && { backgroundColor: c.brand },
                  ]}
                  onPress={() => setPatientGender(g)}
                >
                  <Text style={[
                    styles.genderText,
                    { color: c.textSecondary },
                    patientGender === g && { color: '#fff' },
                  ]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={[styles.input, { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
              value={patientPhone}
              onChangeText={(v) => {
                setPatientPhone(v.replace(/[^0-9]/g, '').slice(-10));
                setLinkedPatientId(null);
              }}
              onBlur={handlePhoneBlur}
              placeholder="Phone *"
              placeholderTextColor={c.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {isFindingPatient && (
              <ActivityIndicator size="small" color={c.brand} style={styles.phoneLoader} />
            )}
          </View>
        </View>

        {/* ═══ Vitals ═══ */}
        <View style={styles.section}>
          <VitalsBar vitals={vitals} onChange={handleVitalChange} />
        </View>

        {/* ═══ Lab Reports ═══ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>📋 Previous Lab Reports / Values</Text>
          {labReports.map((lab, i) => (
            <LabReportRow
              key={i}
              index={i}
              data={lab}
              onChange={handleLabChange}
              onRemove={removeLabReport}
              testOptions={testSearch.options}
              testSearchTerm={testSearch.searchTerm}
              onTestSearchChange={testSearch.setSearchTerm}
              isSearching={testSearch.isLoading}
            />
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: '#6366f1' }]}
            onPress={addLabReport}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color="#6366f1" />
            <Text style={[styles.addBtnText, { color: '#6366f1' }]}>Add Lab Value</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Diagnosis + ICD-10 ═══ */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 0 }]}>🩺 Diagnosis</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
              onPress={() => setShowMoreOptions(true)}
            >
              <Text style={{ color: c.brand, fontSize: 14, fontWeight: '500' }}>More</Text>
              <Ionicons name="ellipsis-vertical" size={16} color={c.brand} />
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="Diagnosis / Chief Complaint *"
              placeholderTextColor={c.textTertiary}
            />
            <TextInput
              style={[styles.input, { width: 100, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
              value={icdCode}
              onChangeText={setIcdCode}
              placeholder="ICD-10"
              placeholderTextColor={c.textTertiary}
            />
          </View>
          {isAISuggesting && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <ActivityIndicator size="small" color={c.brand} />
              <Text style={{ color: c.brand, fontSize: 13 }}>AI is suggesting medications...</Text>
            </View>
          )}
        </View>

        {/* ═══ Medications ═══ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>💊 Rx — Medications</Text>
          {medications.map((med, i) => (
            <MedicationRow
              key={i}
              index={i}
              data={med}
              onChange={handleMedChange}
              onRemove={removeMedication}
              drugOptions={drugSearch.options}
              drugSearchTerm={drugSearch.searchTerm}
              onDrugSearchChange={drugSearch.setSearchTerm}
              isSearching={drugSearch.isLoading}
            />
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: c.brand }]}
            onPress={addMedication}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={c.brand} />
            <Text style={[styles.addBtnText, { color: c.brand }]}>Add Medication</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Investigations ═══ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>🔬 Investigations</Text>
          {investigations.map((inv, i) => (
            <InvestigationRow
              key={i}
              index={i}
              value={inv}
              onChange={handleInvChange}
              onRemove={removeInvestigation}
              testOptions={testSearch.options}
              testSearchTerm={testSearch.searchTerm}
              onTestSearchChange={testSearch.setSearchTerm}
              isSearching={testSearch.isLoading}
            />
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: c.brand }]}
            onPress={addInvestigation}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={c.brand} />
            <Text style={[styles.addBtnText, { color: c.brand }]}>Add Investigation</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Advice + Follow-up ═══ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>📋 Advice</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
            value={advice}
            onChangeText={setAdvice}
            placeholder="Dietary advice, lifestyle changes, precautions..."
            placeholderTextColor={c.textTertiary}
            multiline
            numberOfLines={3}
          />
          {Object.keys(adviceVariables).length > 0 && (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: c.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8 }}>
                Default Advice Parameters
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {Object.keys(adviceVariables).map((key) => (
                  <View key={key} style={{ flexBasis: '48%' }}>
                    <Text style={{ fontSize: 11, color: c.textSecondary, marginBottom: 4 }}>
                      {key.replace(/_/g, ' ')}
                    </Text>
                    <TextInput
                      style={[styles.input, { height: 40, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
                      value={adviceVariables[key]}
                      onChangeText={(val) => setAdviceVariables((p) => ({ ...p, [key]: val }))}
                      placeholder={`Enter ${key}`}
                      placeholderTextColor={c.textTertiary}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Follow-up Date
            </Text>
            
            {Platform.OS === 'ios' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.input, borderRadius: 10, borderWidth: 1, borderColor: c.borderMedium, padding: 8, marginBottom: 12 }}>
                <DateTimePicker
                  value={followUp ? new Date(followUp) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setFollowUp(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: c.input, borderColor: c.borderMedium, marginBottom: 12, justifyContent: 'center' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: followUp ? c.text : c.textTertiary }}>
                    {followUp || "Select a date"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={followUp ? new Date(followUp) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        setFollowUp(selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ═══ Submit Bar (matches web: Save as Template | Sign & Send) ═══ */}
      <View style={[styles.submitBar, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.submitBtn, { flex: 1, backgroundColor: c.brand }, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>Sign & Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </View>

      <PatientSelectModal
        visible={showPatientModal}
        patients={foundPatients}
        onSelect={selectPatient}
        onClose={() => setShowPatientModal(false)}
      />

      <MoreOptionsModal
        visible={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
        onAISuggest={() => {
          setShowMoreOptions(false);
          handleAISuggest();
        }}
        onSaveTemplate={() => {
          setShowMoreOptions(false);
          setShowSaveTemplate(true);
        }}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        onSave={handleSaveTemplate}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    height: 44, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 14, fontWeight: '500',
  },
  textArea: { minHeight: 80, paddingVertical: 12, textAlignVertical: 'top' },
  genderRow: {
    flexDirection: 'row', borderRadius: 10, borderWidth: 1,
    overflow: 'hidden', height: 44,
  },
  genderBtn: { paddingHorizontal: 12, justifyContent: 'center' },
  genderText: { fontSize: 13, fontWeight: '600' },
  phoneLoader: { position: 'absolute', right: 12, top: 12 },
  linkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10,
    alignSelf: 'flex-start',
  },
  linkedText: { fontSize: 12, fontWeight: '600' },
  locationPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
  },
  locationText: { fontSize: 14, fontWeight: '500', flex: 1 },
  locationDropdown: {
    borderWidth: 1, borderRadius: 12, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, overflow: 'hidden',
  },
  locationOption: { padding: 14, borderBottomWidth: 0.5 },
  locationOptionText: { fontSize: 14, fontWeight: '600' },
  locationOptionMeta: { fontSize: 12, marginTop: 2 },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  submitBar: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14,
    shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 52, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
  },
  saveTemplateText: { fontSize: 13, fontWeight: '600' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 12,
  },
  offlineText: { fontSize: 13, fontWeight: '500' },
});
