import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function WorkoutSummaryScreen() {
  const navigation = useNavigation<any>();
  const shareViewRef = useRef(null);

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production, we'd use react-native-view-shot to capture shareViewRef and open the OS Share Sheet
    alert("Captured Image & Opening Instagram Stories...");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="close" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Complete</Text>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Milestone Badge */}
        <Animated.View entering={ZoomIn.springify()} style={styles.badgeContainer}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.badgeHexagon}>
            <Ionicons name="trophy" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.badgeTitle}>Level Up!</Text>
          <Text style={styles.badgeSub}>You just completed your 11th workout.</Text>
        </Animated.View>

        {/* Social Share Canvas (What gets exported) */}
        <Animated.View entering={FadeInUp.delay(200).springify()} ref={shareViewRef} style={styles.shareCanvas}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={StyleSheet.absoluteFillObject} />
          
          <View style={styles.canvasHeader}>
            <Ionicons name="fitness" size={24} color="#38bdf8" />
            <Text style={styles.canvasAppName}>Breathy AI</Text>
          </View>
          
          <Text style={styles.canvasWorkoutTitle}>Upper Body Power</Text>
          
          <View style={styles.canvasMetricsRow}>
            <View style={styles.canvasMetric}>
              <Text style={styles.canvasMetricVal}>1h 15m</Text>
              <Text style={styles.canvasMetricLabel}>Time</Text>
            </View>
            <View style={styles.canvasMetric}>
              <Text style={styles.canvasMetricVal}>4,500kg</Text>
              <Text style={styles.canvasMetricLabel}>Volume</Text>
            </View>
            <View style={styles.canvasMetric}>
              <Text style={styles.canvasMetricVal}>3</Text>
              <Text style={styles.canvasMetricLabel}>PRs</Text>
            </View>
          </View>
          
          {/* Gamified Comparison Card */}
          <View style={styles.funFactCard}>
            <View style={styles.funFactIconBox}>
              <Ionicons name="car" size={24} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.funFactTitle}>Fun Fact</Text>
              <Text style={styles.funFactDesc}>You lifted 4,500kg today. That's equivalent to lifting <Text style={{color: '#0284c7', fontWeight: '800'}}>2.5 Sedans!</Text></Text>
            </View>
          </View>
        </Animated.View>

        {/* Call to Actions */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.actionsContainer}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <LinearGradient colors={['#ec4899', '#f43f5e']} style={StyleSheet.absoluteFillObject} />
            <Ionicons name="logo-instagram" size={24} color="#fff" />
            <Text style={styles.shareBtnText}>Share to Stories</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.finishBtn} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.finishBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  scroll: { paddingHorizontal: 20, paddingBottom: 100, alignItems: 'center' },
  
  badgeContainer: { alignItems: 'center', marginVertical: 32 },
  badgeHexagon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }], shadowColor: '#f59e0b', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  badgeTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginTop: 32, letterSpacing: -1 },
  badgeSub: { fontSize: 16, color: '#64748b', fontWeight: '600', marginTop: 8 },

  shareCanvas: { width: width - 40, backgroundColor: '#0f172a', borderRadius: 32, padding: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, elevation: 15, marginBottom: 32 },
  canvasHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  canvasAppName: { color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 8, letterSpacing: 1 },
  canvasWorkoutTitle: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 24, lineHeight: 40 },
  canvasMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  canvasMetric: { alignItems: 'center', flex: 1 },
  canvasMetricVal: { fontSize: 24, fontWeight: '900', color: '#38bdf8' },
  canvasMetricLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 4 },
  
  funFactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20 },
  funFactIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  funFactTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  funFactDesc: { fontSize: 13, color: '#475569', lineHeight: 18, fontWeight: '500' },

  actionsContainer: { width: '100%', gap: 16 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 64, borderRadius: 20, overflow: 'hidden', shadowColor: '#ec4899', shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  shareBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', marginLeft: 12 },
  finishBtn: { height: 64, borderRadius: 20, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  finishBtnText: { color: '#0f172a', fontSize: 18, fontWeight: '800' }
});
