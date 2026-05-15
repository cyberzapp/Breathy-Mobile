import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getPrescriptionsForPatient } from '../../services/patientService';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';

export default function PrescriptionsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const data = await getPrescriptionsForPatient(session.user.id);
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load prescriptions', error, { source: 'PrescriptionsScreen' });
      Alert.alert('Error', 'Could not load your prescriptions.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="medical" size={24} color={c.brand} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: c.text }]}>
            Dr. {item.doctors?.full_name || 'Doctor'}
          </Text>
          <Text style={[styles.date, { color: c.textSecondary }]}>
            {dayjs(item.created_at).format('MMM D, YYYY')}
          </Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: c.border }]} />
      <Text style={[styles.diagnosis, { color: c.text }]}>
        <Text style={{ fontWeight: '600' }}>Diagnosis: </Text>
        {item.diagnosis || 'N/A'}
      </Text>
      <TouchableOpacity 
        style={[styles.downloadBtn, { backgroundColor: c.brandBg }]}
        onPress={() => {
          Alert.alert('Download', 'Native PDF download/viewing goes here.');
        }}
      >
        <Ionicons name="download-outline" size={18} color={c.brand} style={{ marginRight: 6 }} />
        <Text style={{ color: c.brand, fontWeight: '600' }}>Download PDF</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Ionicons name="document-text-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No prescriptions found.</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
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
  divider: {
    height: 1,
    marginVertical: 12,
  },
  diagnosis: {
    fontSize: 14,
    marginBottom: 16,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
});
