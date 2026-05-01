import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSchedules, updateSchedules, updateSearchVisibility } from '../../services/settingsService';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../hooks/useColors';
import SuccessModal from '../../components/ui/SuccessModal';
import ErrorModal from '../../components/ui/ErrorModal';

// ---------------------------------------------------------------------------
// Day helpers — mirrors web AvailabilityEditor.jsx exactly
// ---------------------------------------------------------------------------
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_MAP: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
const DAY_TO_NUM: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

type Slot = { from: string; to: string };
type DaySchedule = { day: string; enabled: boolean; slots: Slot[] };

const transformToSlots = (backendData: any[]): DaySchedule[] => {
  const scheduleMap: Record<string, Slot[]> = {};
  backendData.forEach((sched: any) => {
    const dayName = DAY_MAP[sched.day_of_week];
    if (!scheduleMap[dayName]) scheduleMap[dayName] = [];
    scheduleMap[dayName].push({ from: sched.start_time, to: sched.end_time });
  });
  return DAYS_OF_WEEK.map(day => ({
    day,
    enabled: !!(scheduleMap[day] && scheduleMap[day].length > 0),
    slots: scheduleMap[day]?.length > 0 ? scheduleMap[day] : [{ from: '09:00', to: '17:00' }],
  }));
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function AvailabilitySettingsScreen() {
  const navigation = useNavigation();
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const c = useColors();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(profileStatus?.is_visible ?? true);

  // Schedule state — mirrors web exactly
  const [orgSchedules, setOrgSchedules] = useState<Record<string, DaySchedule[]>>({});
  const [videoSchedules, setVideoSchedules] = useState<DaySchedule[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'in-person' | 'video'>('in-person');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // apiClient interceptor strips .data, so result IS the payload directly
      const data: any = await getSchedules();

      if (data?.clinics) {
        const initialOrgSchedules: Record<string, DaySchedule[]> = {};
        data.clinics.forEach((org: any) => {
          initialOrgSchedules[org.id] = transformToSlots(org.schedules || []);
        });
        setOrgSchedules(initialOrgSchedules);
        setClinics(data.clinics);
        if (data.clinics.length > 0) setActiveOrgId(data.clinics[0].id);
      }

      if (data?.videoSchedules) {
        setVideoSchedules(transformToSlots(data.videoSchedules));
      }
    } catch (e) {
      console.error('[AvailabilitySettings] fetchData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Visibility Toggle ---
  const toggleVisibility = async (val: boolean) => {
    setIsVisible(val);
    try {
      await updateSearchVisibility({ is_visible: val });
    } catch (e) {
      setIsVisible(!val);
      console.error(e);
    }
  };

  // --- Schedule Manipulation (mirrors web exactly) ---
  const currentSchedule = activeTab === 'in-person' && activeOrgId
    ? orgSchedules[activeOrgId] || []
    : videoSchedules;

  const updateCurrentSchedule = (dayName: string, updater: (d: DaySchedule) => DaySchedule) => {
    if (activeTab === 'in-person' && activeOrgId) {
      setOrgSchedules(prev => ({
        ...prev,
        [activeOrgId!]: (prev[activeOrgId!] || []).map(d => d.day === dayName ? updater(d) : d),
      }));
    } else {
      setVideoSchedules(prev => prev.map(d => d.day === dayName ? updater(d) : d));
    }
  };

  const toggleDay = (day: string, enabled: boolean) => {
    updateCurrentSchedule(day, d => ({ ...d, enabled }));
  };

  const updateSlotTime = (day: string, idx: number, field: 'from' | 'to', val: string) => {
    updateCurrentSchedule(day, d => {
      const newSlots = [...d.slots];
      newSlots[idx] = { ...newSlots[idx], [field]: val };
      return { ...d, slots: newSlots };
    });
  };

  const addSlot = (day: string) => {
    updateCurrentSchedule(day, d => ({ ...d, slots: [...d.slots, { from: '18:00', to: '21:00' }] }));
  };

  const removeSlot = (day: string, idx: number) => {
    updateCurrentSchedule(day, d => {
      const newSlots = d.slots.filter((_, i) => i !== idx);
      return { ...d, slots: newSlots, enabled: newSlots.length > 0 };
    });
  };

  // --- Save (Flatten → PUT /api/schedules) ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const flattenSchedule = (schedules: DaySchedule[], orgId: string | null = null) =>
        schedules
          .filter(d => d.enabled)
          .flatMap(d => d.slots.map(slot => ({
            organization_id: orgId,
            day_of_week: DAY_TO_NUM[d.day],
            start_time: slot.from,
            end_time: slot.to,
          })));

      const p_organization_schedules = Object.entries(orgSchedules).flatMap(
        ([orgId, sched]) => flattenSchedule(sched, orgId)
      );
      const p_video_schedules = flattenSchedule(videoSchedules);

      await updateSchedules({ p_organization_schedules, p_video_schedules });
      setShowSuccess(true);
    } catch (e: any) {
      setErrorMessage('Failed to save schedules. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Availability</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#14b8a6" /> : (
            <Ionicons name="checkmark-done" size={24} color="#14b8a6" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Visibility Toggle */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Show in Patient Search</Text>
              <Text style={[styles.cardDesc, { color: c.textSecondary }]}>If off, your profile won't appear in any search results.</Text>
            </View>
            <Switch
              value={isVisible}
              onValueChange={toggleVisibility}
              trackColor={{ false: c.switchTrackOff, true: c.switchTrackOn }}
            />
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'in-person' && styles.tabActive]}
            onPress={() => setActiveTab('in-person')}
          >
            <Text style={[styles.tabText, activeTab === 'in-person' && styles.tabTextActive]}>In-Person</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'video' && styles.tabActive]}
            onPress={() => setActiveTab('video')}
          >
            <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>Online Video</Text>
          </TouchableOpacity>
        </View>

        {/* Clinic Selector for In-Person */}
        {activeTab === 'in-person' && clinics.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {clinics.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.clinicChip, activeOrgId === c.id && styles.clinicChipActive]}
                onPress={() => setActiveOrgId(c.id)}
              >
                <Text style={[styles.clinicChipText, activeOrgId === c.id && styles.clinicChipTextActive]}>
                  {c.clinic_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Day Schedule Rows */}
        {currentSchedule.map(ds => (
          <View key={ds.day} style={[styles.dayCard, !ds.enabled && styles.dayCardDisabled]}>
            <View style={styles.dayHeader}>
              <Switch
                value={ds.enabled}
                onValueChange={val => toggleDay(ds.day, val)}
                trackColor={{ false: '#e2e8f0', true: '#14b8a6' }}
              />
              <Text style={[styles.dayName, !ds.enabled && { color: '#94a3b8' }]}>{ds.day}</Text>
            </View>

            {ds.enabled && ds.slots.map((slot, idx) => (
              <View key={idx} style={styles.slotRow}>
                <TextInput
                  style={styles.timeInput}
                  value={slot.from}
                  onChangeText={val => updateSlotTime(ds.day, idx, 'from', val)}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.slotDash}>→</Text>
                <TextInput
                  style={styles.timeInput}
                  value={slot.to}
                  onChangeText={val => updateSlotTime(ds.day, idx, 'to', val)}
                  placeholder="17:00"
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity onPress={() => removeSlot(ds.day, idx)} style={styles.removeSlotBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            {ds.enabled && (
              <TouchableOpacity onPress={() => addSlot(ds.day)} style={styles.addSlotBtn}>
                <Ionicons name="add" size={16} color="#0f766e" />
                <Text style={styles.addSlotText}>Add shift</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
        message="Schedule updated successfully!"
      />
      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 3, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#0f766e' },
  clinicChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8 },
  clinicChipActive: { backgroundColor: '#14b8a6' },
  clinicChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  clinicChipTextActive: { color: '#ffffff' },
  dayCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  dayCardDisabled: { opacity: 0.6, backgroundColor: '#f8fafc' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  dayName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  timeInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '500', color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', textAlign: 'center' },
  slotDash: { fontSize: 16, color: '#94a3b8', fontWeight: '700' },
  removeSlotBtn: { padding: 8 },
  addSlotBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  addSlotText: { fontSize: 13, fontWeight: '600', color: '#0f766e' },
  saveBtn: { backgroundColor: '#14b8a6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 20, shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
