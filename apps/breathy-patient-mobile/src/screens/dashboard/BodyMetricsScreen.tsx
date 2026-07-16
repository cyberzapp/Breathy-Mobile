import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getBodyMetrics, logBodyMetric } from '../../services/patientService';
import dayjs from 'dayjs';

export default function BodyMetricsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await getBodyMetrics();
      setMetrics(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!weight) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('date', dayjs().format('YYYY-MM-DD'));
      formData.append('weight_kg', weight);
      if (bodyFat) formData.append('body_fat_percentage', bodyFat);
      
      // In a real app we'd add image picking logic here:
      // formData.append('photo', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' });
      
      await logBodyMetric(formData);
      setWeight('');
      setBodyFat('');
      fetchMetrics();
    } catch (e) {
      console.warn('Log failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Metrics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log Today</Text>
          
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 70.5"
            value={weight}
            onChangeText={setWeight}
          />

          <Text style={styles.label}>Body Fat % (optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 15.2"
            value={bodyFat}
            onChangeText={setBodyFat}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Progress</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>History</Text>
        {metrics.map((m, idx) => (
          <View key={idx} style={styles.historyCard}>
            <View>
              <Text style={styles.historyDate}>{dayjs(m.date).format('MMM D, YYYY')}</Text>
              <Text style={styles.historyWeight}>{m.weight_kg} kg</Text>
              {m.body_fat_percentage && <Text style={styles.historyFat}>{m.body_fat_percentage}% Body Fat</Text>}
            </View>
            {m.photo_url && (
              <Image source={{ uri: m.photo_url }} style={styles.historyImage} />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 8, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8 },
  input: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12, fontSize: 16, marginBottom: 16 },
  saveButton: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  historyDate: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  historyWeight: { fontSize: 18, fontWeight: '700', color: '#111827' },
  historyFat: { fontSize: 14, color: '#0ea5e9', marginTop: 4 },
  historyImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#f3f4f6' }
});
