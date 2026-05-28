import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Linking,
  Platform,
  Alert
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoSharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import ErrorModal from '../../components/ui/ErrorModal';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getPrescriptionsForPatient } from '../../services/patientService';
import Constants from 'expo-constants';
import dayjs from 'dayjs';

const WEB_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_WEB_URL
  || process.env.EXPO_PUBLIC_WEB_URL
  || 'https://www.breathy.in';

/** Convert "Dr. Prabir Mukherjee" -> "prabir-mukherjee" */
const slugify = (name: string) =>
  (name || '')
    .replace(/^Dr\.?\s*/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function PrescriptionsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const patientId = profile?.id;

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) fetchPrescriptions();
  }, [patientId]);

  const fetchPrescriptions = async (pageNum: number = 0) => {
    if (pageNum === 0) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      if (!patientId) return;
      const res = await getPrescriptionsForPatient(patientId, pageNum);
      const rxList = res.data || res || [];
      const newItems = Array.isArray(rxList) ? rxList : [];
      
      if (pageNum === 0) {
        setPrescriptions(newItems);
      } else {
        setPrescriptions(prev => [...prev, ...newItems]);
      }
      
      setHasMore(newItems.length === 10);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load prescriptions', error);
      if (pageNum === 0) setErrorMessage(`Could not load your prescriptions. Err: ${error?.message || ''}`);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const loadMore = () => {
    if (!isFetchingMore && hasMore) {
      fetchPrescriptions(page + 1);
    }
  };

  /** Build the formal web URL for this prescription */
  const getPrescriptionWebUrl = (item: any) => {
    const doctorName = item.doctors?.full_name || 'doctor';
    const doctorSlug = slugify(doctorName);
    return `${WEB_URL}/prescriptions/${doctorSlug}/${item.id}`;
  };

  /** Get a time-limited signed download URL from Supabase Storage */
  const getSignedPdfUrl = async (storagePath: string): Promise<string | null> => {
    if (!storagePath) return null;
    try {
      const { data, error } = await supabase.storage
        .from('prescriptions')
        .createSignedUrl(storagePath, 60 * 15); // 15 min
      if (error) throw error;
      return data?.signedUrl || null;
    } catch (e) {
      console.error('Failed to get signed URL', e);
      return null;
    }
  };

  const getLocalFileUri = async (url: string, id: string) => {
    if (!url) return null;
    try {
      const fileUri = `${FileSystem.documentDirectory}prescription_${id}.pdf`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) return fileUri;
      
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      return uri;
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  };

  const handleShare = async (item: any) => {
    const url = item.download_url;
    if (!url) {
      setErrorMessage('No document available to share.');
      return;
    }
    
    setIsLoading(true);
    try {
      const localUri = await getLocalFileUri(url, item.id);
      if (localUri) {
        const canShare = await ExpoSharing.isAvailableAsync();
        if (canShare) {
          await ExpoSharing.shareAsync(localUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Prescription',
          });
        } else {
          setErrorMessage('Sharing is not available on this device');
        }
      } else {
        setErrorMessage('Failed to download the prescription for sharing.');
      }
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (item: any) => {
    const url = item.download_url;
    if (!url) {
      setErrorMessage('No document available to download.');
      return;
    }

    setIsLoading(true);
    try {
      const localUri = await getLocalFileUri(url, item.id);
      if (localUri) {
        await ExpoSharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Prescription',
        });
      } else {
        setErrorMessage('Could not download the prescription.');
      }
    } catch (error) {
      setErrorMessage('Could not download the prescription.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPdf = async (item: any) => {
    const url = item.download_url;
    if (!url) {
      setErrorMessage('No document available.');
      return;
    }

    setIsLoading(true);
    try {
      const localUri = await getLocalFileUri(url, item.id);
      if (localUri) {
        if (Platform.OS === 'android') {
          try {
            await FileSystem.getContentUriAsync(localUri).then((cUri: string) => {
              IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: cUri,
                flags: 1,
                type: 'application/pdf',
              });
            });
          } catch (e) {
            // Fallback to sharing if no PDF viewer app is installed
            await ExpoSharing.shareAsync(localUri, { mimeType: 'application/pdf' });
          }
        } else {
          // iOS native preview via share menu (since iOS handles PDFs well natively)
          await ExpoSharing.shareAsync(localUri, { mimeType: 'application/pdf' });
        }
      } else {
        setErrorMessage('Could not load the prescription.');
      }
    } catch (error) {
      setErrorMessage('Could not load the prescription.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isNew = dayjs().diff(dayjs(item.created_at), 'day') < 7;

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={24} color={c.brand} />
          </View>
          <View style={styles.infoContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.title, { color: c.text }]}>
                Dr. {item.doctors?.full_name || item.appointments?.doctors?.full_name || 'Doctor'}
              </Text>
              {isNew && (
                <View style={[styles.newBadge, { backgroundColor: c.brandBg }]}>
                  <Text style={[styles.newBadgeText, { color: c.brand }]}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={[styles.date, { color: c.textSecondary }]}>
              {dayjs(item.created_at).format('MMM D, YYYY')}
            </Text>
            <Text style={[styles.rxId, { color: c.textTertiary }]}>{item.id}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />
        
        <Text style={[styles.diagnosis, { color: c.text }]}>
          <Text style={{ fontWeight: '600' }}>Diagnosis: </Text>
          {item.diagnosis || 'N/A'}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: c.brandBg, flex: 1 }]}
            onPress={() => handleViewPdf(item)}
          >
            <Ionicons name="eye-outline" size={18} color={c.brand} style={{ marginRight: 6 }} />
            <Text style={{ color: c.brand, fontWeight: '600' }}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: c.brandBg, paddingHorizontal: 16 }]}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-social-outline" size={18} color={c.brand} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: c.brandBg, paddingHorizontal: 16 }]}
            onPress={() => handleDownload(item)}
          >
            <Ionicons name="download-outline" size={18} color={c.brand} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Prescriptions</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : prescriptions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={c.textTertiary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Prescriptions</Text>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>You don't have any prescriptions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            ) : null
          }
        />
      )}

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  listContent: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 174, 158, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  rxId: {
    fontSize: 11,
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  diagnosis: {
    fontSize: 14,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
});
