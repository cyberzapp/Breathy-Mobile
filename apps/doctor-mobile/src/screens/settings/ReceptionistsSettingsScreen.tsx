import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, Modal, Share, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabaseClient';
import { createReceptionist } from '../../services/settingsService';
import { useColors } from '../../hooks/useColors';

// INDUSTRY STANDARD: Import our deterministic Keyboard wrapper
import KeyboardAwareModal from '../../components/ui/KeyboardAwareModal';
import SuccessModal from '../../components/ui/SuccessModal';
import ErrorModal from '../../components/ui/ErrorModal';
import WarningModal from '../../components/ui/WarningModal';

export default function ReceptionistsSettingsScreen() {
  const navigation = useNavigation();
  const c = useColors();
  const [loading, setLoading] = useState(true);
  const [receptionists, setReceptionists] = useState<any[]>([]);
  const [subscription, setSubscription] = useState({
    maxStaff: 0, planName: 'Free', isUnlimited: false,
  });

  // Self Check-in
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Create Form
  const [formData, setFormData] = useState({ name: '', username: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // REPLACED BOTTOM SHEET REF WITH STANDARD MODAL STATE
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Subscription
      const { data: subData } = await supabase
        .from('doctor_subscriptions')
        .select(`tier_key, custom_limits, plan:subscription_plans ( max_staff_count, display_name )`)
        .eq('doctor_id', user.id)
        .single();

      // 2. Receptionists
      const { data: staffData } = await supabase
        .from('receptionists')
        .select('*')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });

      if (staffData) setReceptionists(staffData);

      if (subData) {
        const plan: any = Array.isArray(subData.plan) ? subData.plan[0] : subData.plan;
        const planMax = plan?.max_staff_count || 0;
        const customMax = (subData as any).custom_limits?.max_staff_count;
        const finalMax = customMax !== undefined ? customMax : planMax;

        setSubscription({
          maxStaff: finalMax,
          planName: plan?.display_name || 'Free',
          isUnlimited: finalMax === -1,
        });
      }

      // 3. Clinics (for QR)
      const { data: clinicData } = await supabase
        .from('doctor_organizations')
        .select(`organization_id, organizations ( id, name, city )`)
        .eq('doctor_id', user.id);

      if (clinicData && clinicData.length > 0) {
        const formatted = clinicData.map((item: any) => item.organizations);
        setClinics(formatted);
        setSelectedClinicId(formatted[0]?.id || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setReceptionists(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    const { error } = await supabase.from('receptionists').update({ is_active: !currentStatus }).eq('id', id);
    if (error) {
      setReceptionists(prev => prev.map(s => s.id === id ? { ...s, is_active: currentStatus } : s));
      setErrorMessage('Failed to update status.');
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      setWarningMessage('Please fill in all fields.');
      return;
    }
    if (formData.password.length < 4) {
      setWarningMessage('Password must be at least 4 characters.');
      return;
    }
    setCreating(true);
    try {
      await createReceptionist(formData);
      setSuccessMessage(`${formData.name} has been added as staff!`);
      setFormData({ name: '', username: '', password: '' });
      setShowAddStaffModal(false);
      fetchData();
    } catch (e: any) {
      const backendError = e.response?.data?.error || e.response?.data?.message;
      setErrorMessage(backendError || 'Unable to create the staff account right now. Please try again later.');
    } finally {
      setCreating(false);
    }
  };

  const selectedClinicName = clinics.find(c => c?.id === selectedClinicId)?.name || 'My Clinic';
  const checkInUrl = selectedClinicId ? `https://www.breathy.in/check-in/${selectedClinicId}` : '';
  const qrCodeImgUrl = checkInUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}` : '';

  const handleShareQr = async () => {
    try {
      await Share.share({
        message: `Join the queue at ${selectedClinicName} by scanning this link:\n${checkInUrl}`,
        url: checkInUrl,
        title: 'Clinic Check-in Link',
      });
    } catch (e) { console.error(e); }
  };

  const usedCount = receptionists.length;
  const { maxStaff, isUnlimited, planName } = subscription;
  const isLimitReached = !isUnlimited && usedCount >= maxStaff;
  const progressPercent = isUnlimited ? 100 : Math.min(100, (usedCount / (maxStaff || 1)) * 100);

  const getProgressColor = () => {
    if (isLimitReached) return '#ef4444';
    if (progressPercent > 75) return '#f59e0b';
    return '#14b8a6';
  };

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
        <Text style={[styles.headerTitle, { color: c.text }]}>Front Desk Access</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* SECTION 1: Usage & Limits */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={20} color="#14b8a6" />
              <Text style={styles.cardTitle}>Staff Accounts</Text>
            </View>
            <View style={styles.planBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#475569" />
              <Text style={styles.planText}>{planName}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Account Usage</Text>
              <Text style={[styles.progressCount, isLimitReached && { color: '#ef4444' }]}>
                {usedCount} / {isUnlimited ? '∞' : maxStaff} Staff
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${isUnlimited ? 100 : progressPercent}%`, backgroundColor: getProgressColor(), opacity: isUnlimited ? 0.2 : 1 }
              ]} />
            </View>
          </View>

          {isLimitReached && (
            <View style={styles.limitBanner}>
              <Ionicons name="lock-closed" size={16} color="#ef4444" />
              <Text style={styles.limitBannerText}>
                Limit Reached. Upgrade to {planName === 'Starter' ? 'Classy' : 'Premium'} to add more staff.
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 2: Add New Staff Button */}
        <TouchableOpacity
          style={[styles.addStaffBtn, isLimitReached && styles.addStaffBtnDisabled]}
          disabled={isLimitReached}
          onPress={() => setShowAddStaffModal(true)}
        >
          <Ionicons name="person-add-outline" size={20} color={isLimitReached ? '#94a3b8' : '#fff'} />
          <Text style={[styles.addStaffBtnText, isLimitReached && { color: '#94a3b8' }]}>
            {isLimitReached ? 'Staff Limit Reached' : 'Add New Staff'}
          </Text>
          {isLimitReached && <Ionicons name="lock-closed" size={14} color="#94a3b8" />}
        </TouchableOpacity>

        {/* SECTION 3: Staff List */}
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>Active Staff ({usedCount})</Text>
        </View>

        {receptionists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No receptionists found</Text>
            <Text style={styles.emptyDesc}>Add your first staff member to get started.</Text>
          </View>
        ) : (
          receptionists.map((staff) => (
            <View key={staff.id} style={styles.staffCard}>
              <View style={[styles.avatar, { backgroundColor: staff.is_active ? '#ccfbf1' : '#fee2e2' }]}>
                <Text style={[styles.avatarText, { color: staff.is_active ? '#0f766e' : '#dc2626' }]}>
                  {staff.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>

              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{staff.name}</Text>
                <View style={styles.usernameBadge}>
                  <Ionicons name="at-outline" size={12} color="#64748b" />
                  <Text style={styles.usernameText}>{staff.username}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={[styles.statusDot, { backgroundColor: staff.is_active ? '#22c55e' : '#ef4444' }]} />
                  <Text style={[styles.statusText, { color: staff.is_active ? '#16a34a' : '#dc2626' }]}>
                    {staff.is_active ? 'Active' : 'Revoked'}
                  </Text>
                  <Text style={styles.lastLoginText}>
                    · {staff.last_login ? `Last login ${new Date(staff.last_login).toLocaleDateString()}` : 'Never logged in'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.toggleBtn, staff.is_active ? styles.revokeBtn : styles.enableBtn]}
                onPress={() => toggleStatus(staff.id, staff.is_active)}
              >
                <Ionicons name={staff.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color={staff.is_active ? '#dc2626' : '#16a34a'} />
                <Text style={[styles.toggleBtnText, { color: staff.is_active ? '#dc2626' : '#16a34a' }]}>
                  {staff.is_active ? 'Revoke' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* SECTION 4: Patient Self Check-in */}
        <View style={[styles.card, { marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="qr-code-outline" size={20} color="#14b8a6" />
            <Text style={styles.cardTitle}>Patient Self Check-in</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Allow patients to join the queue by scanning a QR code at your clinic.
          </Text>

          {clinics.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {clinics.map(clinic => (
                <TouchableOpacity
                  key={clinic?.id}
                  style={[styles.clinicChip, selectedClinicId === clinic?.id && styles.clinicChipActive]}
                  onPress={() => setSelectedClinicId(clinic?.id)}
                >
                  <Text style={[styles.clinicChipText, selectedClinicId === clinic?.id && styles.clinicChipTextActive]}>
                    {clinic?.name} {clinic?.city ? `(${clinic.city})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.generateQrBtn}
            onPress={() => setShowQrModal(true)}
            disabled={!selectedClinicId}
          >
            <Ionicons name="print-outline" size={18} color="#fff" />
            <Text style={styles.generateQrText}>Generate QR Code</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* QR Code Modal (Kept as standard Modal since it doesn't need keyboard support) */}
      <Modal visible={showQrModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowQrModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>

            <Ionicons name="qr-code" size={40} color="#14b8a6" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Clinic QR Code</Text>
            <Text style={styles.modalSubtitle}>
              Print this and place it at your reception. Patients can scan it to self check-in.
            </Text>

            <View style={styles.qrContainer}>
              {qrCodeImgUrl ? (
                <Image source={{ uri: qrCodeImgUrl }} style={styles.qrImage} resizeMode="contain" />
              ) : (
                <Text style={{ color: '#94a3b8' }}>No clinic selected</Text>
              )}
            </View>

            <Text style={styles.clinicLabel}>{selectedClinicName}</Text>
            <Text style={styles.checkInUrlText}>{checkInUrl}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareQr}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>Share Link</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.poweredBy}>Powered by Breathy</Text>
          </View>
        </View>
      </Modal>

      {/* INDUSTRY STANDARD MODAL: Create Staff */}
      <KeyboardAwareModal
        visible={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        title="Add New Staff"
      >
        <Text style={styles.sheetDesc}>Create login credentials for your front desk receptionist.</Text>

        <View style={{ gap: 14, marginTop: 8 }}>
          <View>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.formInput}
              value={formData.name}
              onChangeText={v => setFormData(p => ({ ...p, name: v }))}
              placeholder="e.g. Priya Sharma"
            />
          </View>
          <View>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.formInput}
              value={formData.username}
              onChangeText={v => setFormData(p => ({ ...p, username: v.toLowerCase().replace(/\s/g, '') }))}
              placeholder="e.g. desk1"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={formData.password}
                onChangeText={v => setFormData(p => ({ ...p, password: v }))}
                placeholder="Min. 4 characters"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create Credentials</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareModal>

      <SuccessModal
        visible={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        message={successMessage || ''}
      />
      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <WarningModal
        visible={!!warningMessage}
        message={warningMessage || ''}
        onClose={() => setWarningMessage(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  cardSubtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 14, lineHeight: 18 },

  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  planText: { fontSize: 12, color: '#475569', fontWeight: '600' },

  progressSection: { marginTop: 12 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  progressCount: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  progressTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },

  limitBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', padding: 14, borderRadius: 10, marginTop: 14, borderWidth: 1, borderColor: '#fecaca' },
  limitBannerText: { flex: 1, color: '#dc2626', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  addStaffBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#14b8a6', paddingVertical: 16, borderRadius: 14, marginBottom: 24, shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addStaffBtnDisabled: { backgroundColor: '#f1f5f9', shadowOpacity: 0, elevation: 0 },
  addStaffBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },

  emptyContainer: { alignItems: 'center', paddingVertical: 36, backgroundColor: '#fff', borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  staffCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800' },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  usernameBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  usernameText: { fontSize: 12, color: '#64748b', fontFamily: 'monospace' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  lastLoginText: { fontSize: 11, color: '#94a3b8' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  revokeBtn: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  enableBtn: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  toggleBtnText: { fontSize: 12, fontWeight: '700' },

  clinicChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8 },
  clinicChipActive: { backgroundColor: '#14b8a6' },
  clinicChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  clinicChipTextActive: { color: '#fff' },
  generateQrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#14b8a6', paddingVertical: 14, borderRadius: 10 },
  generateQrText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center' },
  modalClose: { position: 'absolute', top: 16, right: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  qrContainer: { borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 16, padding: 16, marginBottom: 16 },
  qrImage: { width: 200, height: 200 },
  clinicLabel: { fontSize: 16, fontWeight: '700', color: '#0f766e', marginBottom: 4 },
  checkInUrlText: { fontSize: 11, color: '#94a3b8', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#14b8a6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  poweredBy: { marginTop: 20, fontSize: 12, color: '#cbd5e1' },

  sheetDesc: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10, backgroundColor: '#f1f5f9', borderRadius: 10 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#14b8a6', paddingVertical: 16, borderRadius: 14, marginTop: 8, shadowColor: '#14b8a6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});