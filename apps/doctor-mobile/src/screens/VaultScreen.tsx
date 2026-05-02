import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../hooks/useColors';
import {
  fetchDatabaseData,
  fetchPrescriptionById,
  type DataSource,
  type Patient,
  type Prescription,
} from '../services/databaseService';
import {
  cacheVaultPatients,
  getCachedVaultPatients,
  cacheVaultPrescriptions,
  getCachedVaultPrescriptions,
  cachePrescriptionDetail,
  getCachedPrescriptionDetail,
  isOnline,
} from '../services/offlineCacheService';
import WarningModal from '../components/ui/WarningModal';

const BRAND = '#14b8a6';

// ---------------------------------------------------------------------------
// VaultScreen — Patient Database Tab
// ---------------------------------------------------------------------------
// Full native replica of the web's Database.jsx page.
// Features:
//   - Source tabs: Patients | Prescriptions
//   - Search bar with 300ms debounce
//   - Time filter: All Time | 7 Days | 30 Days | 90 Days
//   - FlashList for 60fps virtualized scrolling
//   - Prescription detail modal with medication list
// ---------------------------------------------------------------------------



const DATA_SOURCES: { label: string; key: DataSource }[] = [
  { label: 'Patients', key: 'patients' },
  { label: 'Prescriptions', key: 'prescriptions' },
];

const TIME_FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
];

// ─── Helpers ───

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

const formatId = (id: string) => {
  if (!id) return '';
  if (id.startsWith('RX')) return id;
  if (id.length < 12) return id;
  return `…${id.slice(-6)}`;
};

// ─── Main Component ───

export default function VaultScreen() {
  const navigation = useNavigation<any>();
  const c = useColors();
  const BRAND = c.brand;

  // State
  const [activeSource, setActiveSource] = useState<DataSource>('patients');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

  // Prescription modal
  const [viewingPrescriptionId, setViewingPrescriptionId] = useState<string | null>(null);

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Fetch data — cache-first strategy:
  // 1. Instantly show cached data (no loading spinner)
  // 2. Then try to refresh from API in the background
  // 3. If API fails + no cache → show error
  const loadData = useCallback(async () => {
    setError(null);

    // Step 1: Instantly load from cache (only for default view — no search/filter)
    const isDefaultView = !debouncedSearch && timeFilter === 'all';
    if (isDefaultView) {
      const cached =
        activeSource === 'patients'
          ? await getCachedVaultPatients()
          : await getCachedVaultPrescriptions();
      if (cached && cached.length > 0) {
        setData(cached);
        setIsUsingCache(true);
      }
    }

    // Step 2: Attempt live fetch
    setIsLoading(data.length === 0); // Only show spinner if cache is empty
    const online = await isOnline();
    setIsOffline(!online);

    if (!online) {
      // Offline — keep whatever cache we have
      if (data.length === 0) {
        // No cache either — set error
        const cached =
          activeSource === 'patients'
            ? await getCachedVaultPatients()
            : await getCachedVaultPrescriptions();
        if (cached && cached.length > 0) {
          setData(cached);
          setIsUsingCache(true);
        } else {
          setError('You are offline. Data will appear when you reconnect.');
        }
      }
      setIsLoading(false);
      return;
    }

    try {
      const result = await fetchDatabaseData(activeSource, debouncedSearch, timeFilter);
      const items = Array.isArray(result) ? result : [];
      setData(items);
      setIsUsingCache(false);

      // Cache the default (unfiltered) result for offline use
      if (isDefaultView && items.length > 0) {
        if (activeSource === 'patients') {
          await cacheVaultPatients(items);
        } else {
          await cacheVaultPrescriptions(items);
        }
      }
    } catch (err: any) {
      // API failed but we may still have cached data
      if (data.length === 0) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeSource, debouncedSearch, timeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset search when switching source
  const handleSourceChange = (source: DataSource) => {
    setActiveSource(source);
    setSearchTerm('');
    setDebouncedSearch('');
    setTimeFilter('all');
    Keyboard.dismiss();
  };

  // Stats
  const totalCount = data.length;
  const thisMonthCount = data.filter((item: any) => {
    const dateField = item.last_visit_date || item.created_at || item.issued_date;
    if (!dateField) return false;
    const d = new Date(dateField);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Navigation to patient EMR
  const handlePatientPress = (patient: Patient) => {
    navigation.navigate('PatientEMR', {
      patient,
    });
  };

  // ─── Render Items ───

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: c.card }]}
      activeOpacity={0.7}
      onPress={() => handlePatientPress(item)}
    >
      <View style={[styles.cardAvatar, { backgroundColor: c.brandBg }]}>
        <Text style={[styles.cardAvatarText, { color: c.brand }]}>
          {item.full_name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>
          {item.full_name}
        </Text>
        <Text style={[styles.cardMeta, { color: c.textTertiary }]}>
          {item.age ? `${item.age}y` : ''}{item.gender ? ` • ${item.gender}` : ''}
          {item.last_visit_date ? ` • Last: ${formatDate(item.last_visit_date)}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
    </TouchableOpacity>
  );

  const renderPrescriptionItem = ({ item }: { item: Prescription }) => (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: c.card }]}
      activeOpacity={0.7}
      onPress={() => setViewingPrescriptionId(item.id)}
    >
      <View style={[styles.cardIconBox, { backgroundColor: '#eef2ff' }]}>
        <Ionicons name="document-text-outline" size={20} color="#6366f1" />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>
          {item.patients?.full_name || 'Walk-in Patient'}
        </Text>
        <Text style={[styles.cardMeta, { color: c.textTertiary }]}>
          <Text style={styles.cardId}>{formatId(item.id)}</Text>
          {' • '}{formatDate(item.created_at)}
        </Text>
      </View>
      <View
        style={[
          styles.statusBadge,
          item.is_edited
            ? { backgroundColor: '#dbeafe' }
            : { backgroundColor: '#dcfce7' },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            item.is_edited ? { color: '#2563eb' } : { color: '#16a34a' },
          ]}
        >
          {item.is_edited ? 'Edited' : 'Issued'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => {
    switch (activeSource) {
      case 'patients':
        return renderPatientItem({ item });
      case 'prescriptions':
        return renderPrescriptionItem({ item });
      default:
        return null;
    }
  };

  // ─── Screen ───
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10, backgroundColor: c.bg }]}>
      {/* Source Tabs */}
      <View style={[styles.sourceTabsContainer, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourceTabs}
        >
          {DATA_SOURCES.map((source) => {
            const isActive = activeSource === source.key;
            return (
              <TouchableOpacity
                key={source.key}
                style={[styles.sourceTab, { backgroundColor: c.cardAlt }, isActive && { backgroundColor: c.brand }]}
                activeOpacity={0.7}
                onPress={() => handleSourceChange(source.key)}
              >
                <Text
                  style={[
                    styles.sourceTabText, { color: c.textSecondary },
                    isActive && { color: '#ffffff' },
                  ]}
                >
                  {source.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search + Filter Row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
          <Ionicons name="search-outline" size={18} color={c.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder={`Search in ${activeSource}...`}
            placeholderTextColor={c.textTertiary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton, { backgroundColor: c.card, borderColor: c.borderMedium },
            timeFilter !== 'all' && { backgroundColor: c.brand, borderColor: c.brand },
          ]}
          onPress={() => setShowTimeFilter(!showTimeFilter)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="funnel-outline"
            size={18}
            color={timeFilter !== 'all' ? '#ffffff' : '#64748b'}
          />
        </TouchableOpacity>
      </View>

      {/* Time Filter Chips */}
      {showTimeFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {TIME_FILTERS.map((f) => {
            const isActive = timeFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, { backgroundColor: c.cardAlt }, isActive && { backgroundColor: c.brandBg }]}
                onPress={() => setTimeFilter(f.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText, { color: c.textSecondary },
                    isActive && { color: c.brand },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <Text style={[styles.statValue, { color: c.text }]}>{isLoading ? '…' : totalCount}</Text>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <Text style={[styles.statValue, { color: c.text }]}>{isLoading ? '…' : thisMonthCount}</Text>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>This Month</Text>
        </View>
      </View>

      {/* Data List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={[styles.loadingText, { color: c.textTertiary }]}>Loading {activeSource}...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="file-tray-outline" size={48} color="#cbd5e1" />
          <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>No records found</Text>
          <Text style={[styles.emptySubtitle, { color: c.textTertiary }]}>
            {debouncedSearch
              ? `No ${activeSource} match "${debouncedSearch}"`
              : `Your ${activeSource} will appear here.`}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <FlashList<any>
            data={data}
            renderItem={renderItem}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Prescription Detail Modal */}
      {viewingPrescriptionId && (
        <PrescriptionDetailModal
          prescriptionId={viewingPrescriptionId}
          onClose={() => setViewingPrescriptionId(null)}
        />
      )}
    </View>
  );
}

// ─── Prescription Detail Modal ───

function PrescriptionDetailModal({
  prescriptionId,
  onClose,
}: {
  prescriptionId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const c = useColors();
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Try cache first
      const cached = await getCachedPrescriptionDetail(prescriptionId);
      if (cached) {
        setData(cached);
        setIsLoading(false);
      }

      // Then try live fetch
      const online = await isOnline();
      if (!online) {
        setOffline(true);
        if (!cached) {
          setError('You are offline. Connect to the internet to view this prescription.');
        }
        setIsLoading(false);
        return;
      }

      try {
        const result = await fetchPrescriptionById(prescriptionId);
        setData(result);
        // Cache for offline viewing
        await cachePrescriptionDetail(prescriptionId, result);
      } catch (err: any) {
        if (!cached) {
          setError(err.message || 'Failed to load prescription');
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [prescriptionId]);

  const handleDownload = () => {
    if (data?.download_url) {
      Linking.openURL(data.download_url);
    } else {
      setWarningMessage('PDF download is not available for this prescription.');
    }
  };

  return (
    <>
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: c.card }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Prescription Details</Text>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: c.cardAlt }]}>
              <Ionicons name="close" size={22} color={c.icon} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={BRAND}
                style={{ marginTop: 40 }}
              />
            ) : error ? (
              <View style={styles.centerBox}>
                <Ionicons
                  name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
                  size={48}
                  color={offline ? c.textTertiary : '#ef4444'}
                />
                <Text style={[
                  styles.errorText,
                  offline && { color: c.textSecondary, fontSize: 15, marginTop: 16 },
                ]}>
                  {error}
                </Text>
                {offline && (
                  <Text style={[styles.emptySubtitle, { color: c.textTertiary, marginTop: 8 }]}>
                    Previously viewed prescriptions are available offline.
                  </Text>
                )}
              </View>
            ) : data ? (
              <>
                <DetailRow
                  label="Prescription ID"
                  value={data.id}
                  mono
                />
                <DetailRow
                  label="Patient"
                  value={data.patients?.full_name || 'Walk-in Patient'}
                />
                <DetailRow
                  label="Date Issued"
                  value={formatDate(data.created_at)}
                />

                {/* Medications */}
                {data.medications && data.medications.length > 0 && (
                  <View style={[styles.medsSection, { backgroundColor: c.cardAlt }]}>
                    <Text style={[styles.medsTitle, { color: c.text }]}>Medications</Text>
                    {data.medications.map(
                      (
                        med: {
                          name: string;
                          dosage: string;
                          instructions: string;
                        },
                        i: number
                      ) => (
                        <View key={i} style={styles.medItem}>
                          <View style={styles.medBullet} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.medName, { color: c.text }]}>
                              {med.name}{' '}
                              <Text style={[styles.medDosage, { color: c.textSecondary }]}>
                                ({med.dosage})
                              </Text>
                            </Text>
                            <Text style={[styles.medInstructions, { color: c.textTertiary }]}>
                              {med.instructions}
                            </Text>
                          </View>
                        </View>
                      )
                    )}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          {data && !isLoading && (
            <View style={[styles.modalFooter, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={styles.modalActionSecondary}
                onPress={handleDownload}
                activeOpacity={0.7}
              >
                <Ionicons name="download-outline" size={18} color="#3b82f6" />
                <Text style={styles.modalActionSecondaryText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
    <WarningModal
      visible={!!warningMessage}
      message={warningMessage || ''}
      onClose={() => setWarningMessage(null)}
    />
  </>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.detailRow, { borderBottomColor: c.border }]}>
      <Text style={[styles.detailLabel, { color: c.textTertiary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.text }, mono && { fontFamily: 'monospace' }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Source Tabs
  sourceTabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sourceTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sourceTab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
  },
  sourceTabActive: {
    backgroundColor: BRAND,
  },
  sourceTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  sourceTabTextActive: {
    color: '#ffffff',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 10,
  },
  searchBar: {
    flex: 1,
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },

  // Time filter chips
  filterChips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#e0f2fe',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#0284c7',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // List Cards
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: BRAND,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
  },
  cardMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardId: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#64748b',
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Center states
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  modalActionSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Detail rows
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },

  // Medications
  medsSection: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
  },
  medsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  medBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND,
    marginTop: 7,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  medDosage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748b',
  },
  medInstructions: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});