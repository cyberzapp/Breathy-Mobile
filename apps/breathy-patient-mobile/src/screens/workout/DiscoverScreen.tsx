import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getPublicRoutines } from '../../services/patientService';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CATEGORIES = ['All', 'Muscle Gain', 'Fat Loss', 'Push/Pull', 'Abs', 'Cardio'];

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const res = await getPublicRoutines();
      setRoutines(Array.isArray(res) ? res : res.data || []);
    } catch (e) {
      console.warn('Failed to fetch routines', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutines = activeCategory === 'All' 
    ? routines 
    : routines.filter(r => r.target_goal === activeCategory);

  const renderCategory = ({ item, index }: { item: string, index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
      <TouchableOpacity
        style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
        onPress={() => setActiveCategory(item)}
      >
        {activeCategory === item && (
          <LinearGradient colors={['#3b82f6', '#0ea5e9']} style={StyleSheet.absoluteFillObject} />
        )}
        <Text style={[styles.categoryText, activeCategory === item && styles.categoryTextActive]}>
          {item}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRoutineCard = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 150).springify()} style={styles.cardContainer}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => {/* Navigate to Routine Detail */}}>
        <Image 
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000' }} 
          style={styles.cardImage}
          contentFit="cover"
        />
        
        <View style={styles.cardOverlay}>
          <LinearGradient 
            colors={['transparent', 'rgba(0,0,0,0.8)']} 
            style={StyleSheet.absoluteFillObject} 
          />
          
          <View style={styles.cardTopLeft}>
            {item.is_elite && (
              <BlurView intensity={80} tint="dark" style={styles.eliteBadge}>
                <Ionicons name="lock-closed" size={12} color="#fbbf24" />
                <Text style={styles.eliteText}>ELITE</Text>
              </BlurView>
            )}
          </View>
          
          <View style={styles.cardBottom}>
            <View style={styles.badgesRow}>
              <BlurView intensity={40} tint="light" style={styles.glassBadge}>
                <Text style={styles.glassBadgeText}>{item.difficulty_level}</Text>
              </BlurView>
              <BlurView intensity={40} tint="light" style={styles.glassBadge}>
                <Text style={styles.glassBadgeText}>{item.active_days_per_week} Days/Week</Text>
              </BlurView>
            </View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.cardFooter}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="people" size={14} color="#9ca3af" />
                <Text style={styles.footerText}>{(item.active_users || 1245).toLocaleString()} active users</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity style={styles.searchBtn}>
            <Ionicons name="search" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Find your next challenge</Text>
      </SafeAreaView>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={item => item}
          renderItem={renderCategory}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 60 }} />
      ) : (
        <Animated.FlatList
          data={filteredRoutines}
          keyExtractor={(item) => item.id}
          renderItem={renderRoutineCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, backgroundColor: '#f8fafc' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 36, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  headerSubtitle: { fontSize: 16, color: '#64748b', fontWeight: '500', marginTop: 4 },
  searchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  categoriesContainer: { paddingBottom: 16 },
  categoryChip: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  categoryChipActive: { borderWidth: 0 },
  categoryText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  categoryTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: { marginBottom: 24, borderRadius: 28, overflow: 'hidden', backgroundColor: '#0f172a', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 8, height: 320 },
  cardImage: { width: '100%', height: '100%', opacity: 0.8 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  cardTopLeft: { padding: 20 },
  eliteBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', overflow: 'hidden' },
  eliteText: { color: '#fbbf24', fontWeight: '800', fontSize: 10, marginLeft: 4, letterSpacing: 1 },
  cardBottom: { padding: 20 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  glassBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  glassBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  cardTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  cardDesc: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 22, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
  footerText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginLeft: 6 }
});
