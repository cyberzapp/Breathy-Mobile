import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBreathySounds } from '../../hooks/useBreathySounds';
import { useDrugSearch } from '../../hooks/useDrugSearch';
import { useTestSearch } from '../../hooks/useTestSearch';
import {
  createPrescription,
  getPrescriptionLocations,
  findPatientsByPhone,
  searchCommonNames,
  searchSurnames,
  getAISuggestions,
  getPrescriptionStyle,
  createTemplate,
  type Medication,
  type LabReport,
  type PrescriptionPayload,
  type PrescriptionLocation,
} from '../../services/prescriptionService';
import MedicationRow from '../../components/prescription/MedicationRow';
import VitalsBar from '../../components/prescription/VitalsBar';
import InvestigationRow from '../../components/prescription/InvestigationRow';
import LabReportRow from '../../components/prescription/LabReportRow';
import PrescriptionBuildingLoader from '../../components/prescription/PrescriptionBuildingLoader';
import NameAutocomplete from '../../components/prescription/NameAutocomplete';
import PatientSelectModal from '../../components/prescription/PatientSelectModal';
import MoreOptionsModal from '../../components/prescription/MoreOptionsModal';
import SaveTemplateModal from '../../components/prescription/SaveTemplateModal';
import SuccessModal from '../../components/ui/SuccessModal';
import WarningModal from '../../components/ui/WarningModal';
import ErrorModal from '../../components/ui/ErrorModal';

// ---------------------------------------------------------------------------
// FreehandReviewScreen — Post-AI-extraction review form
// ---------------------------------------------------------------------------
// Receives AI-extracted data via route params and pre-populates the form.
// Doctor reviews, edits, and submits the final prescription.
// ---------------------------------------------------------------------------

const sanitizeAI = (val: any): string => {
  if (val == null) return '';
  const s = String(val).trim();
  if (/^\[?unclear\]?$/i.test(s) || /^n\/?a$/i.test(s) || /^not\s*(found|identified|readable|available)$/i.test(s) || s.toLowerCase() === 'null' || s === '-') {
    return '';
  }
  return s;
};

export default function FreehandReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { playPop, playSuccess, playError } = useBreathySounds();

  const { aiResult, confidence = 0, elapsedMs = 0, clinicalInputs, freehandImagePath = '' } = route.params || {};

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

  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [vitals, setVitals] = useState({ bp: '', pulse: '', spo2: '', temp: '', weight: '' });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [investigations, setInvestigations] = useState<string[]>(['']);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [adviceVariables, setAdviceVariables] = useState<Record<string, string>>({});
  const [baseDefaultAdvice, setBaseDefaultAdvice] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const drugSearch = useDrugSearch();
  const testSearch = useTestSearch();

  // --- Populate from AI result ---
  useEffect(() => {
    if (!aiResult) return;

    setDiagnosis(clinicalInputs?.diagnosis || sanitizeAI(aiResult.diagnosis));
    setIcdCode(clinicalInputs?.icdCode || sanitizeAI(aiResult.icd_10_code));
    setFollowUp(clinicalInputs?.followUp || sanitizeAI(aiResult.follow_up));
    setAdvice(sanitizeAI(aiResult.advice));

    // Merge vitals: typed clinical inputs take priority, AI fills gaps (matches web behavior)
    const aiVitals = aiResult.vitals || {};
    const ciVitals = clinicalInputs?.vitals || {};
    setVitals({
      bp: sanitizeAI(ciVitals.bp || aiVitals.bp),
      pulse: sanitizeAI(ciVitals.pulse || aiVitals.pulse),
      spo2: sanitizeAI(ciVitals.spo2 || aiVitals.spo2),
      temp: sanitizeAI(ciVitals.temp || aiVitals.temp),
      weight: sanitizeAI(ciVitals.weight || aiVitals.weight),
    });

    if (aiResult.medications?.length > 0) {
      setMedications(
        aiResult.medications.map((m: any) => ({
          name: sanitizeAI(m.brand_name),
          strength: sanitizeAI(m.strength),
          frequency: sanitizeAI(m.frequency),
          duration: sanitizeAI(m.duration),
          notes: sanitizeAI(m.instructions),
          generic_name: sanitizeAI(m.generic_name),
        }))
      );
    } else {
      // Always provide at least one empty row for manual entry
      setMedications([{ name: '', strength: '', frequency: '', duration: '', notes: '', generic_name: '' }]);
    }

    if (aiResult.investigations?.length > 0) {
      setInvestigations(
        aiResult.investigations
          .map((i: any) => sanitizeAI(typeof i === 'string' ? i : i.name))
          .filter(Boolean)
      );
    } else {
      setInvestigations(['']);
    }

    if (aiResult.lab_values?.length > 0) {
      setLabReports(
        aiResult.lab_values.map((l: any) => ({
          test_name: sanitizeAI(l.test_name),
          value: sanitizeAI(l.value),
          unit: sanitizeAI(l.unit) || ''
        }))
      );
    }
  }, [aiResult, clinicalInputs]);

  // --- Load locations + style ---
  useEffect(() => {
    (async () => {
      try {
        const locs = await getPrescriptionLocations();
        if (Array.isArray(locs)) {
          setLocations(locs);
          const def = locs.find((l) => l.is_default) || locs[0];
          if (def) setLocationId(def.id);
        }
      } catch {}
      try {
        const styleData: any = await getPrescriptionStyle();
        if (styleData?.default_advice && !advice) {
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
    })();
  }, []);

  // --- Handlers ---
  const handleMedChange = useCallback(
    (index: number, field: keyof Medication, value: string) => {
      setMedications((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], [field]: value };
        return copy;
      });
    }, []
  );

  const handleVitalChange = (field: string, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleSaveTemplate = async (name: string) => {
    try {
      await createTemplate({
        template_name: name,
        diagnosis,
        advice,
        medications: medications.filter((m) => m.name),
        investigations: investigations.filter(Boolean).map((n) => ({ name: n })),
      });
      setSuccessMessage(`Template "${name}" saved.`);
    } catch (err: any) {
      setErrorMessage('Failed to save template. Please try again.');
    }
  };

  const handleAISuggest = async () => {
    if (!diagnosis) {
      setWarningMessage('Please enter a diagnosis first.');
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
      setErrorMessage('Could not fetch AI suggestions. Please try again.');
    } finally {
      setIsAISuggesting(false);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    const fullName = `${patientFirstName} ${patientSurname}`.trim();
    if (!fullName) { setWarningMessage('Patient name is required.'); return; }
    if (patientPhone.length < 10) { setWarningMessage('Valid phone is required.'); return; }

    const vitalsObj: any = {};
    Object.entries(vitals).forEach(([k, v]) => { if (v) vitalsObj[k] = v; });

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

    const filteredLabs = labReports.filter((r) => r.test_name && r.value);

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
      ai_confidence: confidence,
      freehand_image_url: freehandImagePath || null,
      lab_reports: filteredLabs.length > 0 ? filteredLabs : null,
    };

    setIsSubmitting(true);
    try {
      await createPrescription(payload);
      playSuccess();
      setSuccessMessage('Prescription created!');
      setTimeout(() => navigation.popToTop(), 1500);
    } catch (err: any) {
      playError();
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PrescriptionBuildingLoader open={isSubmitting} patientName={patientFirstName ? `${patientFirstName} ${patientSurname}`.trim() : ''} />

      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Review AI Extraction</Text>
          <Text style={[styles.headerSub, { color: c.textTertiary }]}>
            Verify and correct, then submit.
          </Text>
        </View>
        <View style={[
          styles.confidenceBadge,
          { backgroundColor: confidence >= 85 ? c.successBg : c.warningBg },
        ]}>
          <Text style={[
            styles.confidenceText,
            { color: confidence >= 85 ? c.success : c.warning },
          ]}>
            {confidence}%
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Patient */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>👤 Patient</Text>
          {linkedPatientId && (
            <View style={{ backgroundColor: c.successBg, padding: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 }}>
              <Text style={{ color: c.success, fontSize: 12, fontWeight: 'bold' }}>Patient linked</Text>
            </View>
          )}
          <View style={[styles.row, { zIndex: 10 }]}>
            <NameAutocomplete style={{ flex: 1 }} value={patientFirstName} onChangeText={setPatientFirstName} searchApi={searchCommonNames} dataKey="name" placeholder="First Name *" />
            <NameAutocomplete style={{ flex: 1 }} value={patientSurname} onChangeText={setPatientSurname} searchApi={searchSurnames} dataKey="surname" placeholder="Surname" />
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, { width: 70, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]} value={patientAge} onChangeText={setPatientAge} placeholder="Age" placeholderTextColor={c.textTertiary} keyboardType="numeric" />
            <View style={[{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, backgroundColor: c.cardAlt, borderColor: c.border }]}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[{ paddingHorizontal: 12, paddingVertical: 10 }, patientGender === g && { backgroundColor: c.brand }]}
                  onPress={() => setPatientGender(g)}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: c.textSecondary }, patientGender === g && { color: '#fff' }]}>
                    {g.charAt(0).toUpperCase() + g.slice(1, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <TextInput style={[styles.input, { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]} value={patientPhone} onChangeText={(v) => { setPatientPhone(v.replace(/[^0-9]/g, '').slice(-10)); setLinkedPatientId(null); }} onBlur={handlePhoneBlur} placeholder="Phone *" placeholderTextColor={c.textTertiary} keyboardType="phone-pad" maxLength={10} />
              {isFindingPatient && <ActivityIndicator size="small" color={c.brand} style={{ position: 'absolute', right: 10, top: 10 }} />}
            </View>
          </View>
        </View>

        {/* Vitals */}
        <View style={styles.section}>
          <VitalsBar vitals={vitals} onChange={handleVitalChange} />
        </View>

        {/* Diagnosis */}
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
            <TextInput style={[styles.input, { flex: 1, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]} value={diagnosis} onChangeText={setDiagnosis} placeholder="Diagnosis *" placeholderTextColor={c.textTertiary} />
            <TextInput style={[styles.input, { width: 100, backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]} value={icdCode} onChangeText={setIcdCode} placeholder="ICD-10" placeholderTextColor={c.textTertiary} />
          </View>
          {isAISuggesting && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <ActivityIndicator size="small" color={c.brand} />
              <Text style={{ color: c.brand, fontSize: 13 }}>AI is suggesting medications...</Text>
            </View>
          )}
        </View>

        {/* Medications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>💊 Rx — Medications</Text>
          {medications.map((med, i) => (
            <MedicationRow
              key={i} index={i} data={med}
              onChange={handleMedChange}
              onRemove={(idx) => setMedications((p) => p.filter((_, j) => j !== idx))}
              drugOptions={drugSearch.options}
              drugSearchTerm={drugSearch.searchTerm}
              onDrugSearchChange={drugSearch.setSearchTerm}
              isSearching={drugSearch.isLoading}
            />
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: c.brand }]}
            onPress={() => setMedications((p) => [...p, { name: '', strength: '', frequency: '', duration: '', notes: '', generic_name: '' }])}
          >
            <Ionicons name="add-circle-outline" size={18} color={c.brand} />
            <Text style={[styles.addBtnText, { color: c.brand }]}>Add Medication</Text>
          </TouchableOpacity>
        </View>

        {/* Lab Reports */}
        {labReports.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>📋 Lab Reports</Text>
            {labReports.map((lab, i) => (
              <LabReportRow
                key={i}
                index={i}
                data={lab}
                onChange={(idx, field, value) => { const c2=[...labReports]; c2[idx]={...c2[idx], [field]: value}; setLabReports(c2); }}
                onRemove={(idx) => setLabReports((p) => p.filter((_, j) => j !== idx))}
                testOptions={testSearch.options}
                testSearchTerm={testSearch.searchTerm}
                onTestSearchChange={testSearch.setSearchTerm}
                isSearching={testSearch.isLoading}
              />
            ))}
            <TouchableOpacity style={[styles.addBtn, { borderColor: c.brand }]} onPress={() => setLabReports((p) => [...p, {test_name: '', value: '', unit: ''}])}>
              <Ionicons name="add-circle-outline" size={18} color={c.brand} />
              <Text style={[styles.addBtnText, { color: c.brand }]}>Add Lab Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Investigations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>🔬 Investigations</Text>
          {investigations.map((inv, i) => (
            <InvestigationRow
              key={i}
              index={i}
              value={inv}
              onChange={(idx, val) => { const c2 = [...investigations]; c2[idx] = val; setInvestigations(c2); }}
              onRemove={(idx) => setInvestigations((p) => p.filter((_, j) => j !== idx))}
              testOptions={testSearch.options}
              testSearchTerm={testSearch.searchTerm}
              onTestSearchChange={testSearch.setSearchTerm}
              isSearching={testSearch.isLoading}
            />
          ))}
          <TouchableOpacity style={[styles.addBtn, { borderColor: c.brand }]} onPress={() => setInvestigations((p) => [...p, ''])}>
            <Ionicons name="add-circle-outline" size={18} color={c.brand} />
            <Text style={[styles.addBtnText, { color: c.brand }]}>Add Investigation</Text>
          </TouchableOpacity>
        </View>

        {/* Advice */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>📋 Advice</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]} value={advice} onChangeText={setAdvice} placeholder="Advice..." placeholderTextColor={c.textTertiary} multiline />
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

      {/* Submit */}
      <View style={[styles.submitBar, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: c.brand }, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitText}>Sign & Send</Text>
            </>
          )}
        </TouchableOpacity>
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
      <SuccessModal
        visible={!!successMessage}
        message={successMessage || ''}
        onClose={() => setSuccessMessage(null)}
      />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  confidenceText: { fontSize: 13, fontWeight: '700' },
  scroll: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  input: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontWeight: '500' },
  textArea: { minHeight: 80, paddingVertical: 12, textAlignVertical: 'top' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  submitBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
