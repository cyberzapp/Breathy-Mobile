import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, ScrollView, Image, Animated,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { getHealthProgress, updateProfile } from '../../services/patientService';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

const generateSmoothCurve = (points: { x: number, y: number }[]) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const xMid = (points[i].x + points[i + 1].x) / 2;
    path += ` Q ${xMid} ${points[i].y} ${xMid} ${(points[i].y + points[i + 1].y) / 2}`;
    path += ` T ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return path;
};

export default function ProgressScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [daysLogged, setDaysLogged] = useState(0);
  const [filter, setFilter] = useState('All');

  const profile = useAuthStore((state) => state.profile);
  const fetchAuthProfile = useAuthStore((state) => state.fetchProfile);

  const fadeAnim = useState(new Animated.Value(0))[0];

  const [modalVisible, setModalVisible] = useState(false);
  const [obHeight, setObHeight] = useState('');
  const [obWeight, setObWeight] = useState('');
  const [obGender, setObGender] = useState('Male');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProgress();
    if (profile && (!profile.height_cm || !profile.weight_kg)) {
      setModalVisible(true);
    }
  }, [profile]);

  const handleOpenEditModal = () => {
    setObHeight(profile?.height_cm ? String(profile.height_cm) : '');
    setObWeight(profile?.weight_kg ? String(profile.weight_kg) : '');
    setObGender(profile?.gender || 'Male');
    setModalVisible(true);
  };

  const handleSaveMetrics = async () => {
    if (!obHeight || !obWeight) return;
    setIsSubmitting(true);
    try {
      await updateProfile({
        height_cm: parseFloat(obHeight),
        weight_kg: parseFloat(obWeight),
        gender: obGender
      });
      await fetchAuthProfile();
      setModalVisible(false);
      fetchProgress();
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await getHealthProgress();
      const data: any = res.data || res;
      setHistory(data.history || []);
      setDaysLogged(data.daysLogged || 0);

      Animated.timing(fadeAnim, {
        toValue: 1, duration: 800, useNativeDriver: true,
      }).start();
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const currentWeight = profile?.weight_kg || (history.length > 0 ? history[history.length - 1].weight_kg : null);
  const currentHeight = profile?.height_cm || null;
  const healthScore = Math.min(Math.max(Math.round((daysLogged / 30) * 100), 10), 98);

  let bmi = 0;
  let bmiCategory = "N/A";
  let bmiColor = "#9ca3af";
  if (currentWeight && currentHeight) {
    const heightM = currentHeight / 100;
    bmi = currentWeight / (heightM * heightM);
    if (bmi < 18.5) { bmiCategory = "Underweight"; bmiColor = "#3b82f6"; }
    else if (bmi < 25) { bmiCategory = "Normal"; bmiColor = "#22ae9e"; }
    else if (bmi < 30) { bmiCategory = "Overweight"; bmiColor = "#f59e0b"; }
    else { bmiCategory = "Obese"; bmiColor = "#ef4444"; }
  }

  const renderChart = () => {
    if (history.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="stats-chart" size={48} color="#e5e7eb" />
          <Text style={styles.emptyChartText}>No data available yet.</Text>
          <Text style={styles.emptyChartSub}>Log your weight to see your journey.</Text>
        </View>
      );
    }

    const chartWidth = width - 88;
    const chartHeight = 180;
    const weights = history.map(h => parseFloat(h.weight_kg) || 70);
    const plotWeights = weights.length === 1 ? [weights[0], weights[0]] : weights;
    const minWeight = Math.min(...plotWeights) - 2;
    const maxWeight = Math.max(...plotWeights) + 2;
    const range = maxWeight - minWeight || 1;

    const points = plotWeights.map((w, index) => ({
      x: (index / (plotWeights.length - 1)) * chartWidth,
      y: chartHeight - ((w - minWeight) / range) * chartHeight
    }));

    const pathD = generateSmoothCurve(points);
    const fillPathD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgLinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#22ae9e" stopOpacity="0.3" />
              <Stop offset="1" stopColor="#22ae9e" stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>
          <Path d={fillPathD} fill="url(#gradient)" />
          <Path d={pathD} stroke="#22ae9e" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 6 : 4} fill="#ffffff" stroke="#22ae9e" strokeWidth={2} />
          ))}
        </Svg>
        <View style={styles.chartLabels}>
          <Text style={styles.axisLabel}>Start</Text>
          <Text style={styles.axisLabel}>Today</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#22ae9e" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>

          {/* BMI / Body Profile Card */}
          <View style={styles.bmiCard}>
            <View style={styles.bmiHeader}>
              <Text style={styles.bmiTitle}>Body Profile</Text>
              <TouchableOpacity onPress={handleOpenEditModal} style={styles.editBtn}>
                <Ionicons name="pencil" size={16} color="#6b7280" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bmiRow}>
              <View style={styles.bmiStat}>
                <Text style={styles.bmiLabel}>Weight</Text>
                <Text style={styles.bmiValue}>{currentWeight ? `${currentWeight} kg` : '--'}</Text>
              </View>
              <View style={styles.bmiStatDivider} />
              <View style={styles.bmiStat}>
                <Text style={styles.bmiLabel}>Height</Text>
                <Text style={styles.bmiValue}>{currentHeight ? `${currentHeight} cm` : '--'}</Text>
              </View>
              <View style={styles.bmiStatDivider} />
              <View style={styles.bmiStat}>
                <Text style={styles.bmiLabel}>BMI</Text>
                <Text style={[styles.bmiValue, { color: bmiColor }]}>{bmi ? bmi.toFixed(1) : '--'}</Text>
              </View>
            </View>

            {bmi > 0 && (
              <View style={styles.bmiScaleContainer}>
                <View style={styles.bmiScaleBar}>
                  <View style={[styles.bmiScaleSegment, { flex: 18.5, backgroundColor: '#3b82f6' }]} />
                  <View style={[styles.bmiScaleSegment, { flex: 6.5, backgroundColor: '#22ae9e' }]} />
                  <View style={[styles.bmiScaleSegment, { flex: 5, backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.bmiScaleSegment, { flex: 10, backgroundColor: '#ef4444' }]} />
                  {/* Indicator Marker */}
                  <View style={[styles.bmiMarker, { left: `${Math.min(Math.max((bmi / 40) * 100, 0), 100)}%` }]} />
                </View>
                <Text style={[styles.bmiCategoryText, { color: bmiColor }]}>{bmiCategory}</Text>
              </View>
            )}
          </View>

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="flame-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{daysLogged} <Text style={styles.statUnit}>days</Text></Text>
            </View>
            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: '#f0fdfa' }]}>
                <Ionicons name="star-outline" size={20} color="#22ae9e" />
              </View>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{healthScore} <Text style={styles.statUnit}>/ 100</Text></Text>
            </View>
          </View>

          {/* Chart Section */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Progress</Text>
              <View style={styles.filtersContainer}>
                {['1W', '1M', '3M', 'All'].map(f => (
                  <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {renderChart()}
          </View>

          {/* AI Insights Card */}
          <LinearGradient colors={['#111827', '#1f2937']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>✨ AI Analysis</Text>
            </View>
            <Text style={styles.aiText}>
              Based on your recent logs, you are maintaining a stable trajectory. Your consistency over the last {daysLogged} days shows excellent dedication.
            </Text>
          </LinearGradient>

        </Animated.View>
      </ScrollView>

      {/* Metrics Onboarding/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="body-outline" size={32} color="#22ae9e" />
            </View>
            <Text style={styles.modalTitle}>Your Body Profile</Text>
            <Text style={styles.modalSub}>Update your metrics for accurate BMI and health insights.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" placeholder="e.g. 175" value={obHeight} onChangeText={setObHeight} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput style={styles.textInput} keyboardType="numeric" placeholder="e.g. 70" value={obWeight} onChangeText={setObWeight} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMetrics} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  content: { padding: 20, paddingBottom: 40 },

  bmiCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 5 },
  bmiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bmiTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editBtnText: { marginLeft: 4, fontSize: 13, fontWeight: '600', color: '#6b7280' },
  bmiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bmiStat: { flex: 1, alignItems: 'center' },
  bmiStatDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb' },
  bmiLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  bmiValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  bmiScaleContainer: { marginTop: 24 },
  bmiScaleBar: { height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'visible', backgroundColor: '#e5e7eb' },
  bmiScaleSegment: { height: '100%' },
  bmiMarker: { position: 'absolute', top: -6, width: 4, height: 20, backgroundColor: '#111827', borderRadius: 2, transform: [{ translateX: -2 }] },
  bmiCategoryText: { marginTop: 12, textAlign: 'center', fontSize: 15, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statUnit: { fontSize: 14, color: '#9CA3AF' },

  chartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 5 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  filtersContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 2 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  filterBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#111827' },
  chartContainer: { alignItems: 'center' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12, paddingHorizontal: 8 },
  axisLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  emptyChart: { height: 180, alignItems: 'center', justifyContent: 'center' },
  emptyChartText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#4B5563' },
  emptyChartSub: { marginTop: 4, fontSize: 14, color: '#9CA3AF' },

  aiCard: { borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginLeft: 8 },
  aiText: { fontSize: 15, color: '#D1D5DB', lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalHeaderIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: '600', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { color: '#4B5563', fontWeight: '700', fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#22ae9e', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
