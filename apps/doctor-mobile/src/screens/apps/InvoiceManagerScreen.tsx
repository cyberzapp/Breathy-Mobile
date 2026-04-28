import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getInvoices, type InvoiceItem } from '../../services/billingService';
import { useColors } from '../../hooks/useColors';

// ---------------------------------------------------------------------------
// InvoiceManagerScreen — Invoice list with analytics (Phase 2B)
// ---------------------------------------------------------------------------
// Native replica of the web's InvoiceManager.jsx.
// Features:
//   - Analytics cards (Total Billed, Pending, Overdue)
//   - Search + status filter chips
//   - Invoice list with FlashList
//   - FAB for creating new invoices (opens WebView)
// ---------------------------------------------------------------------------

const BRAND = '#22ae9e';

const STATUS_FILTERS = ['all', 'paid', 'sent', 'draft'] as const;

const formatCurrency = (amount?: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function InvoiceManagerScreen() {
  const navigation = useNavigation<any>();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const c = useColors();

  useEffect(() => {
    (async () => {
      try {
        const response = await getInvoices();
        setInvoices(response?.data || (Array.isArray(response) ? response : []));
      } catch (err: any) {
        setError(err.message || 'Failed to load invoices');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Analytics
  const analytics = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        const total = parseFloat(String(inv.grand_total || inv.total_amount || 0));
        const balance = parseFloat(String(inv.balance_due || 0));

        acc.total += total;
        if (inv.status === 'sent' || inv.status === 'pending') {
          acc.pending += balance;
        }
        if (inv.due_date && new Date(inv.due_date) < new Date() && balance > 0) {
          acc.overdue += balance;
        }
        return acc;
      },
      { total: 0, pending: 0, overdue: 0 }
    );
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const term = searchTerm.toLowerCase();
      const invoiceNo = (inv.invoice_number || '').toLowerCase();
      const patientName = (inv.patients?.full_name || '').toLowerCase();
      const matchesSearch = invoiceNo.includes(term) || patientName.includes(term);
      const matchesStatus =
        statusFilter === 'all' || inv.status?.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const getStatusStyle = (status?: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'paid':
        return { bg: '#dcfce7', text: '#16a34a' };
      case 'sent':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'overdue':
        return { bg: '#fee2e2', text: '#dc2626' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const renderInvoice = ({ item }: { item: InvoiceItem }) => {
    const s = getStatusStyle(item.status);
    return (
      <TouchableOpacity
        style={[styles.invoiceCard, { backgroundColor: c.card }]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('SectionWebView', {
            title: `Invoice ${item.invoice_number}`,
            path: `/apps/billing/view/${item.id}`,
          })
        }
      >
        <View style={styles.invoiceTop}>
          <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.text }]}>
              {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.invoiceMiddle}>
          <Text style={styles.invoicePatient} numberOfLines={1}>
            {item.patients?.full_name || 'Unknown Patient'}
          </Text>
          {item.patients?.phone_no ? (
            <Text style={styles.invoicePhone}>{item.patients.phone_no}</Text>
          ) : null}
        </View>
        <View style={styles.invoiceBottom}>
          <Text style={styles.invoiceDate}>{formatDate(item.issued_date)}</Text>
          <Text style={styles.invoiceAmount}>
            {formatCurrency(item.grand_total || item.total_amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={[styles.pageTitle, { color: c.text }]}>Invoices</Text>
          <Text style={[styles.pageSubtitle, { color: c.textTertiary }]}>
            Manage billing, payments, and reporting.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() =>
              navigation.navigate('SectionWebView', {
                title: 'Invoice Settings',
                path: '/apps/billing/settings',
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newInvoiceBtn}
            onPress={() =>
              navigation.navigate('SectionWebView', {
                title: 'Create Invoice',
                path: '/apps/billing/create',
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.newInvoiceBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.analyticsRow}
      >
        <AnalyticsCard
          label="Total Billed"
          value={formatCurrency(analytics.total)}
          icon="trending-up-outline"
          color="#22c55e"
          bgColor="#f0fdf4"
        />
        <AnalyticsCard
          label="Pending"
          value={formatCurrency(analytics.pending)}
          icon="document-text-outline"
          color="#3b82f6"
          bgColor="#eff6ff"
        />
        <AnalyticsCard
          label="Overdue"
          value={formatCurrency(analytics.overdue)}
          icon="alert-circle-outline"
          color="#ef4444"
          bgColor="#fef2f2"
        />
      </ScrollView>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice # or patient..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Invoice List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredInvoices.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No invoices found</Text>
        </View>
      ) : (
        <FlashList
          data={filteredInvoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function AnalyticsCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.analyticsCard}>
      <View style={[styles.analyticsIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.analyticsLabel}>{label}</Text>
      <Text style={styles.analyticsValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: { marginTop: 12, fontSize: 14, color: '#ef4444', textAlign: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#475569', marginTop: 14 },

  // Header
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  pageSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  newInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newInvoiceBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  // Analytics
  analyticsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  analyticsCard: {
    width: 150,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  analyticsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  analyticsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },

  // Search
  searchRow: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', padding: 0 },

  // Filters
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#ffffff' },

  // Invoice Cards
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: { fontSize: 14, fontWeight: '700', color: BRAND },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  invoiceMiddle: { marginBottom: 10 },
  invoicePatient: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  invoicePhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  invoiceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 10,
  },
  invoiceDate: { fontSize: 12, color: '#94a3b8' },
  invoiceAmount: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
});
