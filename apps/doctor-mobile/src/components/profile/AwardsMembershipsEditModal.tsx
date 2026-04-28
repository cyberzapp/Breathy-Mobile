import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateDoctorProfile } from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';

// INDUSTRY STANDARD: Import the deterministic wrapper
import KeyboardAwareModal from '../ui/KeyboardAwareModal';

const BRAND = '#22ae9e';

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: any;
}

export default function AwardsMembershipsEditModal({ visible, onClose, profile }: Props) {
  const fetchProfile = useAuthStore((s) => s.fetchProfileStatus);

  const [awards, setAwards] = useState<{ award_name: string; year_conferred: string }[]>(
    profile?.awards?.length > 0
      ? profile.awards.map((a: any) => ({
        award_name: a.award_name || '',
        year_conferred: String(a.year_conferred || ''),
      }))
      : [{ award_name: '', year_conferred: '' }]
  );

  const [memberships, setMemberships] = useState<{ association_name: string }[]>(
    profile?.memberships?.length > 0
      ? profile.memberships.map((m: any) => ({
        association_name: m.association_name || '',
      }))
      : [{ association_name: '' }]
  );

  const [isSaving, setIsSaving] = useState(false);

  // Awards CRUD
  const addAward = () => setAwards([...awards, { award_name: '', year_conferred: '' }]);
  const removeAward = (i: number) => { if (awards.length > 1) setAwards(awards.filter((_, idx) => idx !== i)); };
  const updateAward = (i: number, key: string, value: string) => {
    const updated = [...awards];
    (updated[i] as any)[key] = value;
    setAwards(updated);
  };

  // Memberships CRUD
  const addMembership = () => setMemberships([...memberships, { association_name: '' }]);
  const removeMembership = (i: number) => { if (memberships.length > 1) setMemberships(memberships.filter((_, idx) => idx !== i)); };
  const updateMembership = (i: number, value: string) => {
    const updated = [...memberships];
    updated[i] = { association_name: value };
    setMemberships(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validAwards = awards.filter((a) => a.award_name.trim());
      const validMemberships = memberships.filter((m) => m.association_name.trim());

      await updateDoctorProfile({
        awards: validAwards,
        memberships: validMemberships,
      });
      await fetchProfile();
      Alert.alert('Success', 'Awards & memberships updated!');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAwareModal visible={visible} onClose={onClose} title="Awards & Memberships">
      {/* Awards */}
      <Text style={styles.sectionLabel}>Awards</Text>
      {awards.map((award, i) => (
        <View key={`award-${i}`} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryLabel}>Award {i + 1}</Text>
            {awards.length > 1 && (
              <TouchableOpacity onPress={() => removeAward(i)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput style={styles.input} placeholder="Award Name"
            placeholderTextColor="#94a3b8" value={award.award_name}
            onChangeText={(v) => updateAward(i, 'award_name', v)} />
          <TextInput style={styles.input} placeholder="Year (e.g. 2020)"
            placeholderTextColor="#94a3b8" value={award.year_conferred}
            onChangeText={(v) => updateAward(i, 'year_conferred', v)}
            keyboardType="numeric" />
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={addAward}>
        <Ionicons name="add-circle-outline" size={18} color={BRAND} />
        <Text style={styles.addBtnText}>Add Award</Text>
      </TouchableOpacity>

      {/* Memberships */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Memberships</Text>
      {memberships.map((mem, i) => (
        <View key={`mem-${i}`} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryLabel}>Membership {i + 1}</Text>
            {memberships.length > 1 && (
              <TouchableOpacity onPress={() => removeMembership(i)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput style={styles.input} placeholder="Association / Society Name"
            placeholderTextColor="#94a3b8" value={mem.association_name}
            onChangeText={(v) => updateMembership(i, v)} />
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={addMembership}>
        <Ionicons name="add-circle-outline" size={18} color={BRAND} />
        <Text style={styles.addBtnText}>Add Membership</Text>
      </TouchableOpacity>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave} disabled={isSaving}
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
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  entryCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1e293b', backgroundColor: '#ffffff',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: BRAND },
  
  // Footer dynamically flows with the ScrollView now
  footer: {
    flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: BRAND, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});