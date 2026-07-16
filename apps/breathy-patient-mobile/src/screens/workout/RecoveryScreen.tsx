import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const RECOVERY_DATA = [
  { id: 'chest', label: 'Chest', percentage: 100, status: 'Fully Recovered', color: '#10b981' },
  { id: 'back', label: 'Back', percentage: 45, status: 'Recovering (24h left)', color: '#f59e0b' },
  { id: 'legs', label: 'Legs', percentage: 15, status: 'Exhausted (48h left)', color: '#ef4444' },
  { id: 'arms', label: 'Arms', percentage: 100, status: 'Fully Recovered', color: '#10b981' },
];

export default function RecoveryScreen() {
  const [injuries, setInjuries] = useState([{ id: '1', muscle: 'Left Shoulder', date: 'Oct 12' }]);

  const markRecovered = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setInjuries(prev => prev.filter(i => i.id !== id));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.headerTitle}>Recovery</Text>
        <TouchableOpacity style={styles.logInjuryBtn}>
          <Ionicons name="medkit" size={18} color="#ef4444" />
          <Text style={styles.logInjuryText}>Log Injury</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Visual Map (Simulated Thermal) */}
        <Animated.View entering={FadeInUp.springify()} style={styles.mapContainer}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayTitle}>System Readiness</Text>
            <Text style={styles.mapOverlayScore}>72%</Text>
          </View>
          <Image 
            source={require('../../../assets/body_anatomy/full_body.png')} 
            style={styles.anatomyImg}
            contentFit="contain"
          />
        </Animated.View>

        {/* Injury Tracker Warning */}
        {injuries.length > 0 && (
          <Animated.View entering={FadeInLeft.springify()} style={styles.injuryCard}>
            <View style={styles.injuryHeaderRow}>
              <Ionicons name="warning" size={24} color="#ef4444" />
              <Text style={styles.injuryTitle}>Active Injuries</Text>
            </View>
            <Text style={styles.injuryDesc}>Your AI plan has been automatically adjusted to avoid these areas.</Text>
            
            {injuries.map(inj => (
              <View key={inj.id} style={styles.injuryRow}>
                <View>
                  <Text style={styles.injuryName}>{inj.muscle}</Text>
                  <Text style={styles.injuryDate}>Logged: {inj.date}</Text>
                </View>
                <TouchableOpacity style={styles.markRecoveredBtn} onPress={() => markRecovered(inj.id)}>
                  <Text style={styles.markRecoveredText}>Mark Recovered</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Muscle Recovery Diagnostics */}
        <Text style={styles.sectionTitle}>Muscle Status</Text>
        {RECOVERY_DATA.map((item, i) => (
          <Animated.View key={item.id} entering={FadeInUp.delay(i * 100).springify()} style={styles.gaugeCard}>
            <View style={styles.gaugeHeader}>
              <Text style={styles.gaugeLabel}>{item.label}</Text>
              <Text style={[styles.gaugeScore, { color: item.color }]}>{item.percentage}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
            </View>
            <Text style={styles.gaugeStatus}>{item.status}</Text>
          </Animated.View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  logInjuryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  logInjuryText: { color: '#ef4444', fontWeight: '800', fontSize: 14, marginLeft: 6 },
  
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  
  mapContainer: { height: 280, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#0ea5e9', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  anatomyImg: { width: '80%', height: '90%', opacity: 0.9 },
  mapOverlay: { position: 'absolute', top: 24, left: 24, zIndex: 10 },
  mapOverlayTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  mapOverlayScore: { color: '#38bdf8', fontSize: 48, fontWeight: '900', letterSpacing: -2 },

  injuryCard: { backgroundColor: '#fef2f2', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#fecaca', marginBottom: 24 },
  injuryHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  injuryTitle: { fontSize: 18, fontWeight: '900', color: '#991b1b', marginLeft: 8 },
  injuryDesc: { fontSize: 14, color: '#b91c1c', marginBottom: 16, lineHeight: 20 },
  injuryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  injuryName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  injuryDate: { fontSize: 13, color: '#64748b', marginTop: 2 },
  markRecoveredBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  markRecoveredText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  gaugeCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gaugeLabel: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  gaugeScore: { fontSize: 18, fontWeight: '900' },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  gaugeStatus: { fontSize: 13, color: '#64748b', fontWeight: '600' }
});
