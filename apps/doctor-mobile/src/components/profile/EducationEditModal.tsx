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
import { updateEducationAndSpecialties, getDegrees, getUniversities } from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';

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
  profile: any;
}

export default function EducationEditModal({ visible, onClose, profile }: Props) {
  const fetchProfile = useAuthStore((s) => s.fetchProfileStatus);
  const [entries, setEntries] = useState<EducationEntry[]>(
    profile?.education?.length > 0
      ? profile.education.map((e: any) => ({
        degree: e.degree || '',
        university: e.university || '',
        passing_year: String(e.passing_year || ''),
      }))
      : [{ degree: '', university: '', passing_year: '' }]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [degreesList, setDegreesList] = useState<any[]>([]);
  const [universitiesList, setUniversitiesList] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<{ index: number, field: string } | null>(null);

  React.useEffect(() => {
    getDegrees().then((res: any) => setDegreesList(res?.data || res || [])).catch(() => { });
    getUniversities().then((res: any) => setUniversitiesList(res?.data || res || [])).catch(() => { });
  }, []);

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
      Alert.alert('Required', 'Please add at least one degree.');
      return;
    }
    setIsSaving(true);
    try {
      await updateEducationAndSpecialties({ education: validEntries });
      await fetchProfile();
      Alert.alert('Success', 'Education updated!');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update education.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSuggestions = (index: number, field: 'degree' | 'university', query: string) => {
    if (activeInput?.index !== index || activeInput?.field !== field || !query || query.length < 2) return null;

    const sourceList = field === 'degree' ? degreesList : universitiesList;
    const filtered = sourceList.filter((item: any) =>
      (item.name || item).toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    if (filtered.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        {filtered.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.suggestionItem}
            activeOpacity={0.7}
            onPress={() => {
              updateEntry(index, field, item.name || item);
              setActiveInput(null);
            }}
          >
            <Text style={styles.suggestionText}>{item.name || item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
            <TextInput
              style={styles.input}
              placeholder="Degree (e.g. MBBS, MD)"
              placeholderTextColor="#94a3b8"
              value={entry.degree}
              onChangeText={(v) => updateEntry(index, 'degree', v)}
              onFocus={() => setActiveInput({ index, field: 'degree' })}
              onBlur={() => setTimeout(() => setActiveInput(null), 200)}
            />
            {renderSuggestions(index, 'degree', entry.degree)}
          </View>

          <View style={{ zIndex: activeInput?.index === index && activeInput?.field === 'university' ? 20 : 1 }}>
            <TextInput
              style={styles.input}
              placeholder="University / Institution"
              placeholderTextColor="#94a3b8"
              value={entry.university}
              onChangeText={(v) => updateEntry(index, 'university', v)}
              onFocus={() => setActiveInput({ index, field: 'university' })}
              onBlur={() => setTimeout(() => setActiveInput(null), 200)}
            />
            {renderSuggestions(index, 'university', entry.university)}
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
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    marginTop: 4, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    maxHeight: 150, overflow: 'hidden'
  },
  suggestionItem: {
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  suggestionText: {
    fontSize: 14, color: '#475569'
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
});