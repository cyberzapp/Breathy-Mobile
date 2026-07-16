import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchExercises, logWorkoutActivity } from '../../services/patientService';
import dayjs from 'dayjs';

export default function WorkoutLogScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, [query]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const res = await searchExercises(query);
      setExercises(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLog = async (exercise: any) => {
    // simplified: fixed duration and calories for demonstration
    try {
      await logWorkoutActivity({
        date: dayjs().format('YYYY-MM-DD'),
        exercise_id: exercise.id,
        duration_minutes: 30,
        calories_burned: 150
      });
      navigation.goBack();
    } catch (e) {
      console.warn('Log failed', e);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.image_url_1 ? (
        <Image source={{ uri: item.image_url_1 }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="barbell-outline" size={32} color="#9ca3af" />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>{item.target_muscle}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => handleLog(item)}>
        <Text style={styles.addText}>Log</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 8, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  image: { width: 60, height: 60, borderRadius: 12, marginRight: 16 },
  imagePlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardInfo: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  addButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0ea5e9', borderRadius: 20 },
  addText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});
