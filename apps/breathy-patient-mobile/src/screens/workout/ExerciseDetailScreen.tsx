import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type TabType = 'Details' | 'History' | 'Records';

export default function ExerciseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { exercise } = route.params || {};

  const [activeTab, setActiveTab] = useState<TabType>('Details');

  if (!exercise) return null;

  // Mock Data for the History Tab
  const mockHistory = [
    { date: 'Today, 8:30 AM', sets: [{ reps: 10, weight: 135 }, { reps: 8, weight: 135 }, { reps: 6, weight: 140 }] },
    { date: 'Oct 12, 2026', sets: [{ reps: 12, weight: 125 }, { reps: 10, weight: 125 }, { reps: 10, weight: 125 }] },
    { date: 'Oct 05, 2026', sets: [{ reps: 10, weight: 115 }, { reps: 10, weight: 115 }, { reps: 8, weight: 120 }] },
  ];

  const renderDetailsTab = () => (
    <Animated.ScrollView entering={FadeInUp.duration(300)} contentContainerStyle={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Primary Muscle</Text>
            <Text style={styles.infoValue}>{exercise.target_muscle || 'Full Body'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Body Part</Text>
            <Text style={styles.infoValue}>{exercise.body_part || 'Core'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Equipment</Text>
            <Text style={styles.infoValue}>{exercise.equipment || 'None'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {exercise.instructions ? (
          Array.isArray(exercise.instructions) ? (
            exercise.instructions.map((step: string, idx: number) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{idx + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.paragraphText}>{exercise.instructions}</Text>
          )
        ) : (
          <Text style={styles.paragraphText}>Focus on strict form and a full range of motion. Lower the weight slowly and contract forcefully.</Text>
        )}
      </View>
    </Animated.ScrollView>
  );

  const renderHistoryTab = () => (
    <Animated.ScrollView entering={FadeInUp.duration(300)} contentContainerStyle={styles.tabContent}>
      {mockHistory.map((session, idx) => (
        <View key={idx} style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.historyDate}>{session.date}</Text>
          </View>
          <View style={styles.historySets}>
            {session.sets.map((set, sIdx) => (
              <View key={sIdx} style={styles.historySetRow}>
                <Text style={styles.historySetNumber}>Set {sIdx + 1}</Text>
                <Text style={styles.historySetData}>{set.weight} lbs  ×  {set.reps} reps</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Animated.ScrollView>
  );

  const renderRecordsTab = () => (
    <Animated.ScrollView entering={FadeInUp.duration(300)} contentContainerStyle={styles.tabContent}>
      <View style={styles.prGrid}>
        <View style={styles.prCard}>
          <Ionicons name="trophy" size={24} color="#f59e0b" />
          <Text style={styles.prValue}>185 <Text style={styles.prUnit}>lbs</Text></Text>
          <Text style={styles.prLabel}>Est. 1RM</Text>
        </View>
        <View style={styles.prCard}>
          <Ionicons name="barbell" size={24} color="#0ea5e9" />
          <Text style={styles.prValue}>160 <Text style={styles.prUnit}>lbs</Text></Text>
          <Text style={styles.prLabel}>Max Weight</Text>
        </View>
        <View style={styles.prCard}>
          <Ionicons name="analytics" size={24} color="#10b981" />
          <Text style={styles.prValue}>4,500 <Text style={styles.prUnit}>lbs</Text></Text>
          <Text style={styles.prLabel}>Max Volume</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Lifetime Stats</Text>
      <View style={styles.statsList}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Sets Completed</Text>
          <Text style={styles.statValue}>142</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Reps</Text>
          <Text style={styles.statValue}>1,240</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Volume</Text>
          <Text style={styles.statValue}>185k lbs</Text>
        </View>
      </View>
    </Animated.ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: exercise.image_url_1 || 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800' }} 
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <LinearGradient 
          colors={['rgba(0,0,0,0.5)', 'transparent', '#f8fafc']} 
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject} 
        />
        
        <SafeAreaView edges={['top']} style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.favBtn}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroContent}>
          <Text style={styles.heroTitle}>{exercise.name}</Text>
          <Text style={styles.heroTarget}>{exercise.target_muscle?.toUpperCase() || 'FULL BODY'}</Text>
        </Animated.View>
      </View>

      {/* Custom Tabs */}
      <View style={styles.tabsContainer}>
        {(['Details', 'History', 'Records'] as TabType[]).map((tab) => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'Details' && renderDetailsTab()}
        {activeTab === 'History' && renderHistoryTab()}
        {activeTab === 'Records' && renderRecordsTab()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  heroContainer: { height: 350, width: '100%', position: 'relative' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  favBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  
  heroContent: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginBottom: 4 },
  heroTarget: { fontSize: 14, fontWeight: '800', color: '#0ea5e9', letterSpacing: 1 },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#0ea5e9' },
  tabText: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: '#0ea5e9' },

  contentArea: { flex: 1 },
  tabContent: { padding: 20, paddingBottom: 100 },

  // Details Tab
  sectionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { alignItems: 'flex-start' },
  infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  
  stepRow: { flexDirection: 'row', marginBottom: 16, paddingRight: 20 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  stepBadgeText: { color: '#0ea5e9', fontSize: 12, fontWeight: '800' },
  stepText: { fontSize: 15, color: '#334155', lineHeight: 24, flex: 1 },
  paragraphText: { fontSize: 15, color: '#334155', lineHeight: 24 },

  // History Tab
  historyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#64748b', marginLeft: 8 },
  historySets: { gap: 8 },
  historySetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 },
  historySetNumber: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  historySetData: { fontSize: 15, fontWeight: '800', color: '#0ea5e9' },

  // Records Tab
  prGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  prCard: { width: (width - 50) / 2, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  prValue: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 12, marginBottom: 4 },
  prUnit: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  prLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },

  statsList: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  statLabel: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  statValue: { fontSize: 16, color: '#0f172a', fontWeight: '800' }
});
