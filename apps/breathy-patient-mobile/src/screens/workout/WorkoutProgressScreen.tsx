import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Generate 30 days of mock heatmap data
const heatmapData = Array.from({ length: 35 }).map((_, i) => ({
  id: i.toString(),
  active: Math.random() > 0.6,
  intensity: Math.floor(Math.random() * 3) + 1 // 1=light, 2=med, 3=heavy
}));

export default function WorkoutProgressScreen() {
  const [activeTab, setActiveTab] = useState('Analytics');

  const renderHeatmapCell = (cell: any, index: number) => {
    let bg = '#f1f5f9';
    if (cell.active) {
      if (cell.intensity === 1) bg = '#bae6fd';
      else if (cell.intensity === 2) bg = '#38bdf8';
      else bg = '#0284c7';
    }
    return (
      <View key={cell.id} style={[styles.heatmapCell, { backgroundColor: bg }]} />
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={styles.ironPointsBadge}>
          <Ionicons name="flame" size={16} color="#f59e0b" />
          <Text style={styles.ironPointsText}>302 Iron Points</Text>
        </View>
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['Analytics', 'Photos'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTab === 'Analytics' ? (
          <Animated.View entering={FadeInUp.springify()}>
            {/* Session Diagnostics */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Week's Effort</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Total Time</Text>
                  <Text style={styles.metricValue}>3h 45m</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Volume</Text>
                  <Text style={styles.metricValue}>12.4K <Text style={styles.metricUnit}>kg</Text></Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Workouts</Text>
                  <Text style={styles.metricValue}>4</Text>
                </View>
              </View>
            </View>

            {/* Consistency Heatmap */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Consistency</Text>
                <Text style={styles.streakText}>🔥 4 Week Streak</Text>
              </View>
              <View style={styles.heatmapGrid}>
                {heatmapData.map(renderHeatmapCell)}
              </View>
              <View style={styles.heatmapLegend}>
                <Text style={styles.legendText}>Less</Text>
                <View style={[styles.heatmapCell, { backgroundColor: '#f1f5f9', width: 12, height: 12 }]} />
                <View style={[styles.heatmapCell, { backgroundColor: '#bae6fd', width: 12, height: 12 }]} />
                <View style={[styles.heatmapCell, { backgroundColor: '#38bdf8', width: 12, height: 12 }]} />
                <View style={[styles.heatmapCell, { backgroundColor: '#0284c7', width: 12, height: 12 }]} />
                <Text style={styles.legendText}>More</Text>
              </View>
            </View>

            {/* Activity Feed */}
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {[1,2,3].map((i) => (
              <Animated.View key={i} entering={FadeInDown.delay(i * 100).springify()}>
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityIconBox}><Ionicons name="barbell" size={20} color="#fff" /></View>
                    <View style={{flex:1, marginLeft: 12}}>
                      <Text style={styles.activityTitle}>Upper Body Power</Text>
                      <Text style={styles.activityTime}>Yesterday at 5:30 PM</Text>
                    </View>
                  </View>
                  <View style={styles.activityStats}>
                    <Text style={styles.activityStatText}>💪 24 Sets</Text>
                    <Text style={styles.activityStatText}>⏱️ 1h 15m</Text>
                    <Text style={styles.activityStatText}>🏋️‍♂️ 4500 kg</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        ) : (
          /* Photo Vault */
          <Animated.View entering={FadeInUp.springify()}>
            <TouchableOpacity style={styles.addPhotoBtn}>
              <LinearGradient colors={['#38bdf8', '#0284c7']} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.addPhotoText}>Log Progress Photo</Text>
            </TouchableOpacity>

            <View style={styles.photoGrid}>
              {[1,2,3,4].map((i) => (
                <View key={i} style={styles.photoWrapper}>
                  <Image 
                    source={{uri: `https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=300&auto=format&fit=crop&sig=${i}`}}
                    style={styles.photoImg}
                    contentFit="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoDate}>Oct {15 - i}</Text>
                    <Text style={styles.photoWeight}>75.{i} kg</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  ironPointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  ironPointsText: { fontSize: 13, fontWeight: '800', color: '#b45309', marginLeft: 4 },
  
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#0f172a' },
  tabText: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0f172a' },

  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  streakText: { fontSize: 14, fontWeight: '800', color: '#ef4444' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBox: { alignItems: 'center' },
  metricLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  metricUnit: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },

  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatmapCell: { width: (width - 40 - 48 - (6 * 6)) / 7, aspectRatio: 1, borderRadius: 6 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, justifyContent: 'flex-end' },
  legendText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16, marginTop: 8 },
  activityCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activityIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  activityTime: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  activityStats: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  activityStatText: { fontSize: 14, fontWeight: '700', color: '#475569' },

  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 64, borderRadius: 20, marginBottom: 20, overflow: 'hidden', shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  addPhotoText: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoWrapper: { width: '48%', aspectRatio: 3/4, borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  photoDate: { color: '#fff', fontSize: 12, fontWeight: '600' },
  photoWeight: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
