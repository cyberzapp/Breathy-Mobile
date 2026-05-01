import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBillingHistory,
  getConsultationFee,
  updateConsultationFee,
} from '../../services/billingService';
import { getOrganizations } from '../../services/organizationService';
import { useColors } from '../../hooks/useColors';
import SuccessModal from '../../components/ui/SuccessModal';

// ---------------------------------------------------------------------------
// BillingScreen — Fee Settings + Transaction History (Phase 2C)
// ---------------------------------------------------------------------------
// Native replica of the web's Billing.jsx.
// Features:
//   - Video Consultation Fee editor
//   - Transaction history grouped by date
//   - Transaction detail modal
// ---------------------------------------------------------------------------

const BRAND = '#22ae9e';

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;

const isToday = (d: string) => {
  const date = new Date(d);
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

const isYesterday = (d: string) => {
  const date = new Date(d);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

const formatDateGroup = (dateStr: string) => {
  if (isToday(dateStr)) return 'Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function BillingScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: c.text }]}>Billing</Text>
      <Text style={[styles.pageSubtitle, { color: c.textTertiary }]}>
        Manage your earnings and payouts.
      </Text>

      <FeeSettings />
      <ClinicSettings />

      <Text style={[styles.sectionTitle, { color: c.text }]}>Transaction History</Text>
      <BillingHistory />
    </ScrollView>
  );
}

// ─── Fee Settings ───

function FeeSettings() {
  const c = useColors();
  const [fee, setFee] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getConsultationFee();
        setFee(String((data as any)?.video_consultation_fee ?? ''));
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const numericFee = parseFloat(fee);
    if (isNaN(numericFee) || numericFee < 0) {
      Alert.alert('Invalid', 'Please enter a valid, non-negative number.');
      return;
    }
    setIsSaving(true);
    try {
      await updateConsultationFee(numericFee);
      setSuccessMessage('Consultation fee updated!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update fee.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.sectionCard, { backgroundColor: c.card }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>Video Consultation Fee</Text>
      <Text style={[styles.cardSubtitle, { color: c.textTertiary }]}>
        Set the fee you charge for video consultations. By default, this is the
        same as your in-person fee.
      </Text>
      <View style={styles.feeRow}>
        <View style={styles.feeInputContainer}>
          <Text style={styles.rupeePrefix}>₹</Text>
          <TextInput
            style={styles.feeInput}
            value={fee}
            onChangeText={setFee}
            placeholder="e.g., 500"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            editable={!isLoading && !isSaving}
          />
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <SuccessModal
        visible={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        message={successMessage || ''}
      />
    </View>
  );
}

// ─── Clinic Settings ───

function ClinicSettings() {
  const c = useColors();
  const navigation = useNavigation<any>();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrganizations();
        setOrganizations(Array.isArray(data) ? data : []);
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.sectionCard, { backgroundColor: c.card, alignItems: 'center', paddingVertical: 32 }]}>
        <ActivityIndicator color={BRAND} size="small" />
      </View>
    );
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: c.card }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>Clinic Locations & Fees</Text>
      <Text style={[styles.cardSubtitle, { color: c.textTertiary, marginBottom: 16 }]}>
        Manage the services and fees for your linked physical clinics.
      </Text>

      {organizations.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>No clinics linked yet.</Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => navigation.navigate('BreathyDesk')}
          >
            <Text style={styles.setupBtnText}>Setup a Clinic</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {organizations.map((org) => (
            <View key={org.id} style={styles.orgRow}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                <Ionicons name="location-outline" size={20} color="#94a3b8" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orgName, { color: c.text }]}>{org.name}</Text>
                  <Text style={[styles.orgAddress, { color: c.textTertiary }]}>{org.address}, {org.city}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => navigation.navigate('BreathyDesk', { orgId: org.id })}
              >
                <Ionicons name="pencil" size={14} color={BRAND} />
                <Text style={styles.manageBtnText}>Manage Fees</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.viewAllBtn}
        onPress={() => navigation.navigate('BreathyDesk')}
      >
        <Text style={styles.viewAllBtnText}>View All in Breathy Desk</Text>
        <Ionicons name="arrow-forward" size={14} color={BRAND} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Billing History ───

function BillingHistory() {
  const c = useColors();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBillingHistory();
        setHistory(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Could not load billing history.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    if (!history.length) return {};
    return history.reduce((acc: Record<string, any[]>, tx) => {
      const dateKey = new Date(tx.created_at).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(tx);
      return acc;
    }, {});
  }, [history]);

  if (isLoading) {
    return (
      <ActivityIndicator
        color={BRAND}
        size="large"
        style={{ marginTop: 24 }}
      />
    );
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (history.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
        <Text style={styles.emptyText}>No transactions yet.</Text>
      </View>
    );
  }

  return (
    <>
      {Object.keys(grouped).map((dateKey) => (
        <View key={dateKey} style={{ marginBottom: 20 }}>
          <Text style={styles.dateGroupLabel}>{formatDateGroup(dateKey)}</Text>
          <View style={[styles.txGroupCard, { backgroundColor: c.card }]}>
            {grouped[dateKey].map((tx: any, idx: number) => {
              const isIncome = tx.type === 'income';
              return (
                <TouchableOpacity
                  key={tx.id || idx}
                  style={[
                    styles.txRow,
                    idx < grouped[dateKey].length - 1 && styles.txRowBorder,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTx(tx)}
                >
                  <View
                    style={[
                      styles.txIcon,
                      isIncome
                        ? { backgroundColor: '#dcfce7' }
                        : { backgroundColor: '#fee2e2' },
                    ]}
                  >
                    <Ionicons
                      name={isIncome ? 'cash-outline' : 'arrow-forward-outline'}
                      size={20}
                      color={isIncome ? '#16a34a' : '#dc2626'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>
                      {isIncome ? 'Patient Payment' : 'Payout to Bank'}
                    </Text>
                    <Text style={styles.txTime}>
                      {formatTime(tx.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      isIncome ? { color: '#16a34a' } : { color: '#dc2626' },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </>
  );
}

// ─── Transaction Detail Modal ───

function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: any;
  onClose: () => void;
}) {
  const c = useColors();
  const isIncome = transaction.type === 'income';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: c.card }]}>
          {/* Amount Header */}
          <View style={styles.modalAmountSection}>
            <Text style={styles.modalSubLabel}>
              {isIncome ? 'Payment from Patient' : 'Payout to Bank'}
            </Text>
            <Text
              style={[
                styles.modalAmountText,
                isIncome ? { color: '#16a34a' } : { color: '#dc2626' },
              ]}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.modalDetails}>
            <ModalRow label="Transaction ID" value={transaction.transaction_id || 'N/A'} />
            {isIncome && transaction.patient_name && (
              <ModalRow label="Patient Name" value={transaction.patient_name} />
            )}
            <ModalRow label="Date" value={formatDate(transaction.created_at)} />
            <ModalRow label="Time" value={formatTime(transaction.created_at)} />
            <View style={styles.modalRowSpec}>
              <Text style={styles.modalLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  transaction.status === 'paid' || transaction.status === 'processed'
                    ? { backgroundColor: '#dcfce7' }
                    : { backgroundColor: '#fef3c7' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    transaction.status === 'paid' || transaction.status === 'processed'
                      ? { color: '#16a34a' }
                      : { color: '#d97706' },
                  ]}
                >
                  {transaction.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modalRowSpec}>
      <Text style={styles.modalLabel}>{label}</Text>
      <Text style={styles.modalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  pageSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 20 },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 16, marginTop: 8 },

  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  cardSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 19 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  feeInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14,
  },
  rupeePrefix: { fontSize: 16, color: '#64748b', marginRight: 4 },
  feeInput: { flex: 1, fontSize: 16, color: '#1e293b', paddingVertical: 12 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginTop: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 10 },

  dateGroupLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 8 },
  txGroupCard: {
    backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  txTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden' },
  modalAmountSection: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalSubLabel: { fontSize: 13, color: '#94a3b8' },
  modalAmountText: { fontSize: 36, fontWeight: '800', marginTop: 6 },
  modalDetails: { padding: 20, gap: 14 },
  modalRowSpec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalLabel: { fontSize: 13, color: '#94a3b8' },
  modalValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  modalCloseBtn: { padding: 16, alignItems: 'center', backgroundColor: '#f8fafc' },
  modalCloseBtnText: { fontSize: 15, fontWeight: '700', color: '#64748b' },

  // Clinic Settings
  setupBtn: { backgroundColor: '#f0fdf9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  setupBtnText: { color: BRAND, fontWeight: '600', fontSize: 14 },
  orgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  orgName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  orgAddress: { fontSize: 12 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  manageBtnText: { fontSize: 13, fontWeight: '600', color: BRAND },
  viewAllBtn: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 16 },
  viewAllBtnText: { fontSize: 13, fontWeight: '600', color: BRAND },
});
