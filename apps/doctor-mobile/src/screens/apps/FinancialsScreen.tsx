import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getWalletBalance,
  getWalletHistory,
  getPayoutDetails,
  updatePayoutDetails,
  requestPayout,
  getPayoutHistory,
} from '../../services/billingService';
import { useColors } from '../../hooks/useColors';

// ---------------------------------------------------------------------------
// FinancialsScreen — Wallet, Payouts & KYC (Phase 2C)
// ---------------------------------------------------------------------------
// Native replica of the web's FinancialsPage.jsx.
// ---------------------------------------------------------------------------

const BRAND = '#22ae9e';

export default function FinancialsScreen() {
  const insets = useSafeAreaInsets();
  // Balance
  const [balance, setBalance] = useState<number>(0);
  const c = useColors();
  const [isLoadingBalance, setLoadingBalance] = useState(true);

  // Payout details
  const [payoutDetails, setPayoutDetails] = useState<any>(null);
  const [isLoadingDetails, setLoadingDetails] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    payout_method: 'bank_transfer',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    upi_vpa: '',
    pan_number: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Payout request
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Wallet history
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [isLoadingHistory, setLoadingHistory] = useState(true);

  // Payout history
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [isLoadingPayoutHistory, setLoadingPayoutHistory] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    // Balance
    try {
      const data = await getWalletBalance();
      setBalance((data as any)?.balance ?? 0);
    } catch {} finally { setLoadingBalance(false); }

    // Payout details
    try {
      const data = await getPayoutDetails();
      setPayoutDetails((data as any)?.details ?? null);
      if ((data as any)?.details) {
        setEditForm((prev) => ({
          ...prev,
          payout_method: (data as any).details.payout_method || 'bank_transfer',
          pan_number: (data as any).details.masked_pan_number || '',
        }));
      }
    } catch {} finally { setLoadingDetails(false); }

    // Wallet history
    try {
      const data = await getWalletHistory();
      setWalletHistory((data as any)?.transactions ?? []);
    } catch {} finally { setLoadingHistory(false); }

    // Payout history
    try {
      const data = await getPayoutHistory();
      setPayoutHistory((data as any)?.requests ?? []);
    } catch {} finally { setLoadingPayoutHistory(false); }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid', 'Please enter a valid amount.');
      return;
    }
    if (amount > balance) {
      Alert.alert('Insufficient', 'Amount exceeds your available balance.');
      return;
    }
    setIsRequesting(true);
    try {
      await requestPayout(amount);
      Alert.alert('Success', 'Payout request submitted!');
      setPayoutAmount('');
      loadAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit payout request.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!editForm.pan_number) {
      Alert.alert('Required', 'PAN Number is required.');
      return;
    }
    if (editForm.payout_method === 'bank_transfer' &&
        (!editForm.account_holder_name || !editForm.account_number || !editForm.ifsc_code)) {
      Alert.alert('Required', 'Account Name, Number, and IFSC are required.');
      return;
    }
    if (editForm.payout_method === 'upi' && !editForm.upi_vpa) {
      Alert.alert('Required', 'UPI ID is required.');
      return;
    }
    setIsSaving(true);
    try {
      await updatePayoutDetails(editForm);
      Alert.alert('Success', 'Payout details updated!');
      setIsEditing(false);
      loadAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update details.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return 'N/A'; }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: c.text }]}>Your Financials</Text>

      {/* Balance + Payout Request */}
      <View style={styles.topRow}>
        <View style={[styles.balanceCard, { backgroundColor: c.card }]}>
          <Text style={styles.cardLabel}>Available Balance</Text>
          {isLoadingBalance ? (
            <ActivityIndicator color={BRAND} />
          ) : (
            <Text style={styles.balanceAmount}>
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          )}
        </View>
        <View style={[styles.payoutRequestCard, { backgroundColor: c.card }]}>
          <Text style={styles.cardLabel}>Request Payout</Text>
          {isLoadingDetails ? (
            <Text style={styles.loadingSmall}>Loading...</Text>
          ) : !payoutDetails ? (
            <Text style={styles.warningSmall}>Set up payout details first.</Text>
          ) : payoutDetails.kyc_status !== 'verified' ? (
            <Text style={styles.warningSmall}>
              KYC: {payoutDetails.kyc_status}. Payouts disabled.
            </Text>
          ) : (
            <View style={styles.payoutForm}>
              <View style={styles.amountInputRow}>
                <Text style={styles.rupeePrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={[styles.requestBtn, isRequesting && { opacity: 0.6 }]}
                onPress={handleRequestPayout}
                disabled={isRequesting}
                activeOpacity={0.7}
              >
                <Text style={styles.requestBtnText}>
                  {isRequesting ? 'Submitting...' : 'Request'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Payout Details */}
      <View style={[styles.sectionCard, { backgroundColor: c.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Payout Details & KYC</Text>
          {!isEditing && payoutDetails && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editBtn}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {isLoadingDetails ? (
          <ActivityIndicator color={BRAND} />
        ) : !isEditing && payoutDetails ? (
          <View style={styles.detailsList}>
            <DetailItem label="Method" value={payoutDetails.payout_method === 'upi' ? 'UPI' : 'Bank Transfer'} />
            {payoutDetails.payout_method === 'bank_transfer' && (
              <>
                <DetailItem label="Account Holder" value={payoutDetails.account_holder_name} />
                <DetailItem label="Account No." value={payoutDetails.masked_account_number} />
                <DetailItem label="IFSC" value={payoutDetails.ifsc_code} />
              </>
            )}
            {payoutDetails.payout_method === 'upi' && (
              <DetailItem label="UPI ID" value={payoutDetails.masked_upi_vpa} />
            )}
            <DetailItem label="PAN" value={payoutDetails.masked_pan_number} />
            <DetailItem
              label="KYC Status"
              value={payoutDetails.kyc_status}
              valueColor={payoutDetails.kyc_status === 'verified' ? '#16a34a' : '#d97706'}
            />
          </View>
        ) : (
          /* Edit Form */
          <View style={styles.editFormContainer}>
            <FormField label="PAN Number *" value={editForm.pan_number}
              onChangeText={(v: string) => setEditForm({ ...editForm, pan_number: v })}
              placeholder="ABCDE1234F" />

            <Text style={styles.formLabel}>Payout Method</Text>
            <View style={styles.methodRow}>
              {(['bank_transfer', 'upi'] as const).map((m) => (
                <TouchableOpacity key={m}
                  style={[styles.methodBtn, editForm.payout_method === m && styles.methodBtnActive]}
                  onPress={() => setEditForm({ ...editForm, payout_method: m })}
                >
                  <Text style={[styles.methodBtnText, editForm.payout_method === m && styles.methodBtnTextActive]}>
                    {m === 'bank_transfer' ? 'Bank Transfer' : 'UPI'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editForm.payout_method === 'bank_transfer' && (
              <>
                <FormField label="Account Holder *" value={editForm.account_holder_name}
                  onChangeText={(v: string) => setEditForm({ ...editForm, account_holder_name: v })} />
                <FormField label="Account Number *" value={editForm.account_number}
                  onChangeText={(v: string) => setEditForm({ ...editForm, account_number: v })} keyboardType="numeric" />
                <FormField label="IFSC Code *" value={editForm.ifsc_code}
                  onChangeText={(v: string) => setEditForm({ ...editForm, ifsc_code: v })} />
              </>
            )}
            {editForm.payout_method === 'upi' && (
              <FormField label="UPI ID (VPA) *" value={editForm.upi_vpa}
                onChangeText={(v: string) => setEditForm({ ...editForm, upi_vpa: v })} placeholder="yourname@bank" />
            )}

            <View style={styles.formActions}>
              {isEditing && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveDetails}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Details'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Wallet History */}
      <View style={[styles.sectionCard, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Wallet History</Text>
        {isLoadingHistory ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 16 }} />
        ) : walletHistory.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : (
          walletHistory.slice(0, 20).map((tx: any) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txInfo}>
                <Text style={styles.txType}>
                  {tx.type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Text>
                <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
              </View>
              <Text style={[styles.txAmount, tx.amount >= 0 ? styles.green : styles.red]}>
                {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Payout History */}
      <View style={[styles.sectionCard, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Payout History</Text>
        {isLoadingPayoutHistory ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 16 }} />
        ) : payoutHistory.length === 0 ? (
          <Text style={styles.emptyText}>No payout requests yet.</Text>
        ) : (
          payoutHistory.slice(0, 20).map((req: any, idx: number) => {
            const statusColor =
              req.status === 'completed' ? '#16a34a' :
              req.status === 'failed' || req.status === 'rejected' ? '#dc2626' :
              req.status === 'processing' ? '#2563eb' : '#d97706';
            return (
              <View key={req.id || idx} style={styles.txRow}>
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>₹{req.amount?.toLocaleString('en-IN')}</Text>
                  <Text style={styles.txDate}>{formatDate(req.requested_at)}</Text>
                </View>
                <View style={[styles.payoutStatusBadge, { backgroundColor: `${statusColor}18` }]}>
                  <Text style={[styles.payoutStatusText, { color: statusColor }]}>
                    {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function DetailItem({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor, fontWeight: '700' } : {}]}>
        {value || '-'}
      </Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 20 },

  topRow: { gap: 12, marginBottom: 20 },
  balanceCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#1e293b' },
  payoutRequestCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  loadingSmall: { fontSize: 13, color: '#94a3b8' },
  warningSmall: { fontSize: 13, color: '#d97706' },
  payoutForm: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  amountInputRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12,
  },
  rupeePrefix: { fontSize: 16, color: '#64748b', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 16, color: '#1e293b', paddingVertical: 10 },
  requestBtn: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  requestBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  editBtn: { fontSize: 14, fontWeight: '600', color: BRAND },

  detailsList: { gap: 10 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },

  editFormContainer: { gap: 12, marginTop: 4 },
  formField: { gap: 4 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  formInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1e293b',
  },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  methodBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  methodBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  methodBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  methodBtnTextActive: { color: '#ffffff' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },

  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  txInfo: { flex: 1 },
  txType: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  txDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  green: { color: '#16a34a' },
  red: { color: '#dc2626' },

  payoutStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  payoutStatusText: { fontSize: 12, fontWeight: '600' },
});
