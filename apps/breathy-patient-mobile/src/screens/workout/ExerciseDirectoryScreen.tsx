import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInRight, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
import apiClient from '../../lib/apiClient';
import { storage } from '../../lib/storage';
import { networkManager } from '../../lib/NetworkManager';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MUSCLE_GROUPS = [
  { id: 'full_body', label: 'All', icon: 'body', keywords: [] },
  { id: 'chest', label: 'Chest', icon: 'fitness', keywords: ['chest', 'pectoral'] },
  { id: 'back', label: 'Back', icon: 'barbell', keywords: ['back', 'lats', 'spine'] },
  { id: 'legs', label: 'Legs', icon: 'walk', keywords: ['leg', 'quad', 'hamstring', 'calf', 'calves', 'glute'] },
  { id: 'arms', label: 'Arms', icon: 'hand-left', keywords: ['arm', 'bicep', 'tricep', 'forearm'] },
  { id: 'core', label: 'Core', icon: 'disc', keywords: ['core', 'waist', 'abs', 'abdominal'] }
];

const CACHE_KEY = 'offline_exercises_cache';

export default function ExerciseDirectoryScreen() {
  const navigation = useNavigation<any>();
  const [activeMuscle, setActiveMuscle] = useState(MUSCLE_GROUPS[0]);
  const [query, setQuery] = useState('');
  
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Scroll Animation Values
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, 200], [280, 0], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 200], [0, -100], Extrapolation.CLAMP);
    
    return {
      height,
      opacity,
      transform: [{ translateY }],
      overflow: 'hidden'
    };
  });

  const searchBarStyle = useAnimatedStyle(() => {
    // Dock the search bar to the top
    const translateY = interpolate(scrollY.value, [0, 200], [0, -20], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }],
      backgroundColor: '#fff',
      zIndex: 100,
    };
  });

  // Fetch Logic
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    const cachedData = storage.getString(CACHE_KEY);
    
    if (cachedData) {
      setExercises(JSON.parse(cachedData));
    }

    if (networkManager.getIsOnline()) {
      await fetchExercises(1, true);
    }
    setLoading(false);
  };

  const fetchExercises = async (pageNum: number, isRefresh: boolean = false) => {
    try {
      const keywordString = activeMuscle.keywords?.join(',') || '';
      const res = await apiClient.get(`/api/fitness/exercises?page=${pageNum}&limit=30&query=${query}&muscle=${keywordString}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      
      if (data.length < 30) setHasMore(false);
      else setHasMore(true);

      if (isRefresh) {
        setExercises(data);
        storage.set(CACHE_KEY, JSON.stringify(data));
      } else {
        setExercises(prev => {
          const newData = [...prev, ...data];
          storage.set(CACHE_KEY, JSON.stringify(newData)); // Update cache with new pages
          return newData;
        });
      }
    } catch (e) {
      console.warn('[Offline] Falling back to cache for pagination', e);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || fetchingMore || !networkManager.getIsOnline()) return;
    setFetchingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchExercises(nextPage).then(() => setFetchingMore(false));
  };

  // Trigger refetch when filters change
  useEffect(() => {
    setPage(1);
    fetchExercises(1, true);
  }, [activeMuscle, query]);

  const renderMuscleChip = ({ item, index }: { item: typeof MUSCLE_GROUPS[0], index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
      <TouchableOpacity
        style={[styles.chip, activeMuscle.id === item.id && styles.chipActive]}
        onPress={() => {
          setActiveMuscle(item);
          // If they switch muscles, we reset the scroll to show the anatomy map again
        }}
      >
        <Ionicons name={item.icon as any} size={16} color={activeMuscle.id === item.id ? '#fff' : '#64748b'} style={{marginRight: 6}} />
        <Text style={[styles.chipText, activeMuscle.id === item.id && styles.chipTextActive]}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderExercise = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.exerciseCard}
      onPress={() => navigation.navigate('ExerciseDetail', { exercise: item })}
    >
      <Image 
        source={{ uri: item.image_url_1 || 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200' }} 
        style={styles.exerciseImg}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.exerciseTarget}>{item.target_muscle || 'Full Body'}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.equipment || 'Bodyweight'}</Text></View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Exercises</Text>
        </View>

        {/* Collapsible Anatomy Map */}
        <Animated.View style={[styles.anatomyContainer, headerAnimatedStyle]}>
          {/* Changed background to white/light gray as requested */}
          <LinearGradient colors={['#ffffff', '#f8fafc']} style={StyleSheet.absoluteFillObject} />
          <Image 
            source={activeMuscle.id === 'full_body' ? require('../../../assets/body_anatomy/full_body.png') : require('../../../assets/body_anatomy/chest.png')} 
            style={styles.anatomyHeroImg}
            contentFit="contain"
          />
          <View style={styles.anatomyOverlay}>
            <Text style={styles.anatomyTargetTitle}>{activeMuscle.label}</Text>
          </View>
        </Animated.View>

        {/* Sticky Slick Search Bar */}
        <Animated.View style={[styles.searchContainerWrapper, searchBarStyle]}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search 1400+ exercises..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
            />
          </View>
          
          <View style={styles.chipsWrapper}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {MUSCLE_GROUPS.map((item, index) => (
                <React.Fragment key={item.id}>
                  {renderMuscleChip({ item, index })}
                </React.Fragment>
              ))}
            </Animated.ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Endless Scroll List */}
      <View style={{ flex: 1 }}>
        {loading && exercises.length === 0 ? (
          <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
        ) : (
          <AnimatedFlashList
            data={exercises}
            keyExtractor={(item: any, index: number) => item.id ? String(item.id) : String(index)}
            renderItem={renderExercise}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            // @ts-expect-error Animated component wrapping trips up TS for estimatedItemSize
            estimatedItemSize={100}
            ListFooterComponent={fetchingMore ? <ActivityIndicator size="small" color="#0ea5e9" style={{ margin: 20 }} /> : null}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerArea: { backgroundColor: '#fff', zIndex: 10 },
  headerRow: { paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  
  anatomyContainer: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  anatomyHeroImg: { width: '80%', height: '100%', opacity: 0.9 },
  anatomyOverlay: { position: 'absolute', bottom: 20, left: 20, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  anatomyTargetTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  anatomyTargetSub: { fontSize: 13, color: '#64748b', fontWeight: '700' },

  searchContainerWrapper: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, height: 44 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  
  chipsWrapper: { marginTop: 16, height: 40 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' },

  list: { padding: 20, paddingTop: 10, paddingBottom: 100 },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, paddingRight: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  exerciseImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#f1f5f9' },
  exerciseInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  exerciseTarget: { fontSize: 12, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  badge: { backgroundColor: '#f0f9ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#0ea5e9', fontSize: 10, fontWeight: '800' }
});
