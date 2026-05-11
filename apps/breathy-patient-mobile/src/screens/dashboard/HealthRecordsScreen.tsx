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
import { getHealthRecords, deleteHealthRecord } from '../../services/patientService';
import dayjs from 'dayjs';

export default function HealthRecordsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getHealthRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load health records', error, { source: 'HealthRecordsScreen' });
      Alert.alert('Error', 'Could not load your medical records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHealthRecord(id);
            setRecords(prev => prev.filter(r => r.id !== id));
          } catch (e) {
            console.error('Failed to delete record', e, { source: 'HealthRecordsScreen' });
            Alert.alert('Error', 'Could not delete the record.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={item.record_type === 'lab_result' ? 'flask' : 'document-text'} 
            size={24} 
            color={c.brand} 
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: c.text }]}>{item.title || 'Untitled Document'}</Text>
          <Text style={[styles.date, { color: c.textSecondary }]}>
            {dayjs(item.record_date || item.created_at).format('MMM D, YYYY')} • {item.record_type?.replace('_', ' ')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={c.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Medical Records</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No medical records found.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB for uploading new record */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: c.brand, bottom: insets.bottom + 20 }]}
        onPress={() => {
          Alert.alert('Upload', 'Native document picker integration goes here.');
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
