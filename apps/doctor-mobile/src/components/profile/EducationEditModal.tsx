import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateEducationAndSpecialties, searchDegrees, searchUniversities, searchSpecialties } from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';
import AsyncAutocomplete from '../ui/AsyncAutocomplete';

// INDUSTRY STANDARD: Import the deterministic wrapper
import KeyboardAwareModal from '../ui/KeyboardAwareModal';

const BRAND = '#22ae9e';

interface EducationEntry {
  degree: string;
  university: string;
  passing_year: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  profile: any;
}

export default function EducationEditModal({ visible, onClose, onSuccess, profile }: Props) {
  const fetchProfile = useAuthStore((s) => s.fetchProfileStatus);
  const [entries, setEntries] = useState<EducationEntry[]>(
    profile?.education?.length > 0
      ? profile.education.map((e: any) => {
          // Handle both plain strings (from mobile) and react-select objects (from web)
          const degStr = typeof e.degree === 'object' ? (e.degree?.label || e.degree?.value || '') : (e.degree || '');
          const uniStr = typeof e.university === 'object' ? (e.university?.label || e.university?.value || '') : (e.university || '');
          return {
            degree: degStr,
            university: uniStr,
            passing_year: String(e.passing_year || ''),
          };
        })
      : [{ degree: '', university: '', passing_year: '' }]
  );
  
  // Specialties State
  const [specialties, setSpecialties] = useState<any[]>(
    profile?.specialties || []
  );
  const [selectedSpecialtyText, setSelectedSpecialtyText] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeInput, setActiveInput] = useState<{ index: number, field: string } | null>(null);

  const addEntry = () => {
    setEntries([...entries, { degree: '', university: '', passing_year: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, key: keyof EducationEntry, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [key]: value };
    setEntries(updated);
  };

  const handleSave = async () => {
    const validEntries = entries.filter((e) => e.degree.trim());
    if (validEntries.length === 0) {
      Alert.alert('Required', 'Please add at least one qualification.');
      return;
    }
    if (specialties.length === 0) {
      Alert.alert('Required', 'Please select at least one specialty.');
      return;
    }
    
    setIsSaving(true);
    try {
      // Pass both education array and specialties array of UUIDs
      const payload = {
        education: validEntries,
        specialties: specialties.map((sp: any) => sp.id || sp.specialty_id),
      };
      await updateEducationAndSpecialties(payload);
      await fetchProfile(true);
      
      if (onSuccess) {
        onSuccess('Education & specialties updated!');
      } else {
        Alert.alert('Success', 'Education & specialties updated!');
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update education.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAwareModal visible={visible} onClose={onClose} title="Edit Education">
      {entries.map((entry, index) => (
        <View key={index} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryLabel}>Qualification {index + 1}</Text>
            {entries.length > 1 && (
              <TouchableOpacity onPress={() => removeEntry(index)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ zIndex: activeInput?.index === index && activeInput?.field === 'degree' ? 20 : 1 }}>
            <AsyncAutocomplete
              value={entry.degree}
              onChangeText={(v) => updateEntry(index, 'degree', v)}
              searchApi={searchDegrees}
              dataKey="name"
              placeholder="Degree (e.g. MBBS, MD)"
              onSelect={(item) => {
                const text = item.name || item.degrees || item.label || (typeof item === 'string' ? item : '');
                updateEntry(index, 'degree', text);
              }}
              onFocus={() => setActiveInput({ index, field: 'degree' })}
              onBlur={() => setTimeout(() => setActiveInput(null), 200)}
            />
          </View>

          <View style={{ zIndex: activeInput?.index === index && activeInput?.field === 'university' ? 20 : 1 }}>
            <AsyncAutocomplete
              value={entry.university}
              onChangeText={(v) => updateEntry(index, 'university', v)}
              searchApi={searchUniversities}
              dataKey="name"
              placeholder="University / Institution"
              onSelect={(item) => {
                const text = item.name || item.label || (typeof item === 'string' ? item : '');
                updateEntry(index, 'university', text);
              }}
              onFocus={() => setActiveInput({ index, field: 'university' })}
              onBlur={() => setTimeout(() => setActiveInput(null), 200)}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Passing Year (e.g. 2015)"
            placeholderTextColor="#94a3b8"
            value={entry.passing_year}
            onChangeText={(v) => updateEntry(index, 'passing_year', v)}
            keyboardType="numeric"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={addEntry}>
        <Ionicons name="add-circle-outline" size={20} color={BRAND} />
        <Text style={styles.addBtnText}>Add Another Qualification</Text>
      </TouchableOpacity>

      {/* Specialties Section */}
      <View style={styles.specialtiesCard}>
        <Text style={styles.entryLabel}>Specialties</Text>
        <Text style={styles.helpText}>Select at least one area of expertise</Text>
        
        <View style={{ zIndex: 30, marginBottom: 12 }}>
          <AsyncAutocomplete
            value={selectedSpecialtyText}
            onChangeText={setSelectedSpecialtyText}
            searchApi={searchSpecialties}
            dataKey="name"
            placeholder="Search specialties (e.g., Cardiologist)"
            icon="medical-outline"
            onSelect={(selectedItem) => {
              // Ensure we don't add duplicates
              if (selectedItem && !specialties.find((s: any) => (s.id || s.specialty_id) === selectedItem.id)) {
                setSpecialties([...specialties, selectedItem]);
              }
              // Slight delay to allow UI to update before clearing
              setTimeout(() => setSelectedSpecialtyText(''), 100);
            }}
          />
        </View>

        {specialties.length > 0 && (
          <View style={styles.chipsContainer}>
            {specialties.map((sp: any, idx: number) => (
              <View key={`sp-${idx}`} style={styles.chip}>
                <Text style={styles.chipText}>{sp.name}</Text>
                <TouchableOpacity 
                  onPress={() => setSpecialties(specialties.filter((_, i) => i !== idx))}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareModal>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 14, gap: 10,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1e293b', backgroundColor: '#ffffff',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 16,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: BRAND },
  footer: {
    flexDirection: 'row', gap: 12, marginTop: 8, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: BRAND, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  specialtiesCard: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', zIndex: 30
  },
  helpText: {
    fontSize: 12, color: '#94a3b8', marginBottom: 12, marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  chipText: {
    fontSize: 13, color: '#334155', fontWeight: '500',
  },
});