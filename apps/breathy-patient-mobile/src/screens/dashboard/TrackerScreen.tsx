import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, StatusBar, ActivityIndicator, Image, Modal,
  TextInput, LayoutAnimation, Platform, UIManager, FlatList,
  KeyboardAvoidingView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
  useAnimatedProps
} from 'react-native-reanimated';
import Svg, { Circle, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Activity, Droplets, Moon, Plus, ChevronRight, Flame } from 'lucide-react-native';

import { useAuthStore } from '../../store/authStore';
import { getDailyHealthMetrics, updateDailyHealthMetrics, deleteFoodLog, getWorkoutHistory, getFastingHistory, startFasting } from '../../services/patientService';

const { width } = Dimensions.get('window');
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CircularRing = ({
  size, strokeWidth, progress, color, backgroundColor = '#f3f4f6', title, value, unit, icon
}: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 1), {
      duration: 1500, easing: Easing.out(Easing.cubic)
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: circumference - (circumference * animatedProgress.value)
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={backgroundColor} strokeWidth={strokeWidth} fill="none"
          />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </Svg>
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          {icon}
          <Text style={{ fontSize: size * 0.18, fontWeight: '800', color: '#111827', marginTop: 2 }}>{value}</Text>
          <Text style={{ fontSize: size * 0.12, color: '#6b7280', fontWeight: '600' }}>{unit}</Text>
        </View>
      </View>
      {title && <Text style={{ marginTop: 8, fontSize: 13, fontWeight: '700', color: '#4b5563' }}>{title}</Text>}
    </View>
  );
};

const AnimatedProgressBar = ({ progress, color }: any) => {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(progress, {
      duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [progress]);

  const style = useAnimatedStyle(() => {
    return {
      width: `${Math.min(animatedWidth.value, 1) * 100}%`,
      height: '100%',
      backgroundColor: color,
      borderRadius: 10,
    };
  });

  return (
    <View style={{ height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
      <Animated.View style={style} />
    </View>
  );
};

export default function TrackerScreen() {
  const navigation = useNavigation<any>();
  const profile = useAuthStore(s => s.profile);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [stepsInput, setStepsInput] = useState('');
  const [sleepInput, setSleepInput] = useState('');

  const calendarDates = Array.from({ length: 30 }, (_, i) => {
    const d = dayjs().subtract(14, 'day').add(i, 'day');
    return {
      dateString: d.format('YYYY-MM-DD'),
      dayLetter: d.format('ddd').substring(0, 1),
      dayNumber: d.format('D'),
      isSelected: d.format('YYYY-MM-DD') === selectedDate
    };
  });

  useFocusEffect(useCallback(() => { fetchMetrics(); }, [selectedDate]));

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await getDailyHealthMetrics(selectedDate);
      const workoutsRes = await getWorkoutHistory(selectedDate);
      const fastingRes = await getFastingHistory('active');
      
      const baseData = res.data || res;
      setHealthData({ 
        ...baseData, 
        workouts: Array.isArray(workoutsRes) ? workoutsRes : (workoutsRes?.data || []), 
        fastingLogs: Array.isArray(fastingRes) ? fastingRes : (fastingRes?.data || []) 
      });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!healthData?.metrics) return;
    try {
      const currentWater = healthData.metrics.water_ml || 0;
      const newWater = currentWater + 250;
      setHealthData((prev: any) => ({ ...prev, metrics: { ...prev.metrics, water_ml: newWater } }));
      await updateDailyHealthMetrics(selectedDate, { water_ml: newWater });
    } catch (e) {
      fetchMetrics();
    }
  };

  const handleUpdateSteps = async () => {
    if (!stepsInput) return;
    try {
      const currentSteps = healthData?.metrics?.steps_count || 0;
      const newSteps = currentSteps + parseInt(stepsInput);
      setHealthData((prev: any) => ({ ...prev, metrics: { ...prev.metrics, steps_count: newSteps } }));
      await updateDailyHealthMetrics(selectedDate, { steps_count: newSteps });
      setStepsModalVisible(false);
      setStepsInput('');
    } catch (e) {}
  };

  const handleUpdateSleep = async () => {
    if (!sleepInput) return;
    try {
      const currentSleep = healthData?.metrics?.sleep_minutes || 0;
      const newSleepMins = currentSleep + (parseFloat(sleepInput) * 60);
      setHealthData((prev: any) => ({ ...prev, metrics: { ...prev.metrics, sleep_minutes: newSleepMins } }));
      await updateDailyHealthMetrics(selectedDate, { sleep_minutes: newSleepMins });
      setSleepModalVisible(false);
      setSleepInput('');
    } catch (e) {}
  };

  const handleDeleteFood = async (id: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await deleteFoodLog(id);
      fetchMetrics();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleStartFast = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      await startFasting({ 
        start_time: dayjs().toISOString(),
        goal_hours: 16
      });
      fetchMetrics();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  };

  const metrics = healthData?.metrics || {};
  const logs = healthData?.foodLogs || [];
  
  const totalCal = logs.reduce((sum: number, log: any) => sum + (log.calories || 0), 0);
  const totalPro = logs.reduce((sum: number, log: any) => sum + (log.protein_g || 0), 0);
  const totalCarb = logs.reduce((sum: number, log: any) => sum + (log.carbs_g || 0), 0);
  const totalFat = logs.reduce((sum: number, log: any) => sum + (log.fats_g || 0), 0);

  const workouts = healthData?.workouts || [];
  const activeCalories = workouts.reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);
  const calGoal = (metrics.calories_goal || 2200) + activeCalories;
  const proGoal = 150; const carbGoal = 250; const fatGoal = 70;
  
  const steps = metrics.steps_count || 0;
  const stepsGoal = metrics.steps_goal || 10000;
  const water = metrics.water_ml || 0;
  const waterGoal = metrics.water_goal_ml || 2500;
  const sleepHrs = (metrics.sleep_minutes || 0) / 60;
  const sleepGoalHrs = (metrics.sleep_goal_minutes || 480) / 60;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {dayjs(selectedDate).isSame(dayjs(), 'day') ? 'Today' : dayjs(selectedDate).format('MMMM D')}
          </Text>
          <Text style={styles.headerSubtitle}>Ready to smash your goals?</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Community')}>
            <Ionicons name="people" size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.statsBtn} onPress={() => navigation.navigate('Progress')}>
            <Ionicons name="stats-chart" size={20} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('More')}>
            {profile?.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.profileImg} />
            ) : (
              <Text style={styles.profileLetter}>{(profile?.full_name || 'U')[0]}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar */}
      <View style={{ marginBottom: 20 }}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={calendarDates}
          keyExtractor={i => i.dateString}
          initialScrollIndex={11}
          getItemLayout={(data, index) => ({ length: 54, offset: 54 * index, index })}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.calDay, item.isSelected && styles.calDayActive]}
              onPress={() => { Haptics.selectionAsync(); setSelectedDate(item.dateString); }}
            >
              <Text style={[styles.calDayText, item.isSelected && styles.calTextActive]}>{item.dayLetter}</Text>
              <Text style={[styles.calDateText, item.isSelected && styles.calTextActive]}>{item.dayNumber}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Main Dashboard Card */}
        <View style={styles.dashboardCard}>
          <Text style={styles.sectionTitle}>Daily Summary</Text>
          <View style={styles.mainRings}>
            <CircularRing 
              size={140} strokeWidth={14} 
              progress={totalCal / calGoal} 
              color="#22ae9e" 
              title="Calories" value={totalCal} unit={`/ ${calGoal}`} 
              icon={<Flame size={20} color="#22ae9e" />} 
            />
            <View style={styles.macroCol}>
              <CircularRing size={70} strokeWidth={8} progress={totalPro / proGoal} color="#F43F5E" title="Protein" value={`${totalPro}g`} />
              <CircularRing size={70} strokeWidth={8} progress={totalCarb / carbGoal} color="#3B82F6" title="Carbs" value={`${totalCarb}g`} />
              <CircularRing size={70} strokeWidth={8} progress={totalFat / fatGoal} color="#F59E0B" title="Fats" value={`${totalFat}g`} />
            </View>
          </View>
        </View>

        {/* Apple-Style 2x2 Action Grid */}
        <View style={styles.actionGrid}>
          <View style={styles.actionGridRow}>
            <TouchableOpacity style={styles.gridActionCard} onPress={() => navigation.navigate('FoodScanner')}>
              <LinearGradient colors={['#22ae9e', '#1b8c7f']} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="scan" size={28} color="#fff" />
              <Text style={styles.gridActionTextPrimary}>Scan Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridActionCard} onPress={() => navigation.navigate('WorkoutTabs')}>
              <View style={[styles.actionIconWrapper, { backgroundColor: '#f3f4f6' }]}>
                <Ionicons name="barbell" size={24} color="#111827" />
              </View>
              <Text style={styles.gridActionText}>Workout</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionGridRow}>
            <TouchableOpacity style={styles.gridActionCard} onPress={() => navigation.navigate('BodyMetrics')}>
              <View style={[styles.actionIconWrapper, { backgroundColor: '#f0fdfa' }]}>
                <Ionicons name="body" size={24} color="#0d9488" />
              </View>
              <Text style={styles.gridActionText}>Body Metrics</Text>
            </TouchableOpacity>
            {healthData?.fastingLogs?.length === 0 ? (
              <TouchableOpacity style={styles.gridActionCard} onPress={handleStartFast}>
                <View style={[styles.actionIconWrapper, { backgroundColor: '#fdf4ff' }]}>
                  <Ionicons name="time" size={24} color="#c026d3" />
                </View>
                <Text style={styles.gridActionText}>Fast 16h</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.gridActionCard} onPress={() => navigation.navigate('FoodDatabase')}>
                <View style={[styles.actionIconWrapper, { backgroundColor: '#f8fafc' }]}>
                  <Ionicons name="search" size={24} color="#475569" />
                </View>
                <Text style={styles.gridActionText}>Search Food</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Re-integrated 2-Column Grid */}
        <View style={styles.grid}>
          {/* Steps */}
          <View style={styles.gridCard}>
            <View style={styles.gridTop}>
              <Activity size={18} color="#3b82f6" />
              <Text style={styles.gridLabel}>STEPS</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={styles.gridValue}>{steps.toLocaleString()}</Text>
              <Text style={styles.gridSub}>/ {stepsGoal.toLocaleString()}</Text>
            </View>
            <AnimatedProgressBar progress={steps / stepsGoal} color="#3b82f6" />
            <TouchableOpacity style={styles.quickAddBtn} onPress={() => setStepsModalVisible(true)}>
              <Plus size={12} color="#3b82f6" />
              <Text style={[styles.quickAddText, { color: '#3b82f6' }]}>Add Steps</Text>
            </TouchableOpacity>
          </View>

          {/* Water */}
          <View style={styles.gridCard}>
            <View style={styles.gridTop}>
              <Droplets size={18} color="#0ea5e9" />
              <Text style={styles.gridLabel}>WATER</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={styles.gridValue}>{water}</Text>
              <Text style={styles.gridSub}>/ {waterGoal} ml</Text>
            </View>
            <AnimatedProgressBar progress={water / waterGoal} color="#0ea5e9" />
            <TouchableOpacity style={styles.quickAddBtn} onPress={handleAddWater}>
              <Plus size={12} color="#0ea5e9" />
              <Text style={[styles.quickAddText, { color: '#0ea5e9' }]}>Add 250ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Width Card (Sleep) */}
        <View style={styles.fullCard}>
          <View style={styles.fullCardLeft}>
            <View style={[styles.heroIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Moon size={20} color="#8b5cf6" />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.fullCardLabel}>SLEEP</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.fullCardValue}>{Math.round(sleepHrs * 10) / 10}</Text>
                <Text style={styles.fullCardUnit}>h / {sleepGoalHrs}h</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.chevronBtn} onPress={() => setSleepModalVisible(true)}>
            <Plus size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Premium Interactive Fasting Widget */}
        {healthData?.fastingLogs?.length > 0 && (
          <View style={styles.fastingWidget}>
            <LinearGradient colors={['#fdf4ff', '#f5d0fe']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.fastingWidgetHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="time" size={20} color="#a21caf" />
                <Text style={styles.fastingWidgetTitle}>Active Fast</Text>
              </View>
              <TouchableOpacity style={styles.endFastBtn} onPress={() => {/* End fast logic */}}>
                <Text style={styles.endFastText}>End Fast</Text>
              </TouchableOpacity>
            </View>
            
            {healthData.fastingLogs.map((f: any) => {
              const elapsedHours = dayjs().diff(dayjs(f.start_time), 'hour', true);
              const progress = Math.min(elapsedHours / f.goal_hours, 1);
              return (
                <View key={f.id} style={styles.fastingContent}>
                  <View style={styles.fastingTextGroup}>
                    <Text style={styles.fastingTimeElapsed}>{elapsedHours.toFixed(1)}h</Text>
                    <Text style={styles.fastingTimeGoal}>/ {f.goal_hours}h Goal</Text>
                  </View>
                  <View style={styles.fastingBarContainer}>
                    <AnimatedProgressBar progress={progress} color="#c026d3" />
                  </View>
                  <Text style={styles.fastingHint}>
                    {progress >= 1 ? 'Goal Reached! Amazing job. 🌟' : 'You are currently in the fat-burning zone. Keep going!'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Feed */}
        <View style={styles.feedHeader}>
          <Text style={styles.sectionTitle}>Today's Log</Text>
          <Text style={styles.feedCount}>{logs.length} items</Text>
        </View>
        
        {loading ? <ActivityIndicator color="#22ae9e" style={{ marginTop: 20 }} /> : null}
        
        {['breakfast', 'lunch', 'dinner', 'snack'].map(category => {
          const categoryLogs = logs.filter((l: any) => l.meal_type === category || (!l.meal_type && category === 'snack'));
          if (categoryLogs.length === 0) return null;
          return (
            <View key={category} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#4b5563', textTransform: 'capitalize', marginBottom: 8 }}>{category}</Text>
              {categoryLogs.map((log: any) => (
                <View key={log.id} style={styles.logCard}>
                  {log.image_url ? (
                    <Image source={{ uri: log.image_url }} style={styles.logImg} />
                  ) : (
                    <View style={styles.logImgPlaceholder}>
                      <Ionicons name="restaurant" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.logInfo}>
                    <Text style={styles.logName}>{log.food_name}</Text>
                    <Text style={styles.logMacros}>{log.calories} kcal • {log.protein_g}g P • {log.carbs_g}g C • {log.fats_g}g F</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteFood(log.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
        {logs.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No meals logged today</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Steps Modal */}
      <Modal visible={stepsModalVisible} animationType="fade" transparent={true} onRequestClose={() => setStepsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Steps</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="e.g. 5000" value={stepsInput} onChangeText={setStepsInput} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStepsModalVisible(false); }} style={styles.modalBtn}>
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleUpdateSteps(); }} style={styles.modalBtnPrimary}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sleep Modal */}
      <Modal visible={sleepModalVisible} animationType="fade" transparent={true} onRequestClose={() => setSleepModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Sleep (Hours)</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="e.g. 1.5" value={sleepInput} onChangeText={setSleepInput} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSleepModalVisible(false); }} style={styles.modalBtn}>
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleUpdateSleep(); }} style={styles.modalBtnPrimary}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 15, color: '#6B7280', marginTop: 2 },
  statsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  profileImg: { width: '100%', height: '100%' },
  profileLetter: { color: '#fff', fontSize: 20, fontWeight: '700' },
  calDay: { width: 42, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  calDayActive: { backgroundColor: '#111827' },
  calDayText: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  calDateText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  calTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 20 },
  dashboardCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 5, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  mainRings: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroCol: { gap: 16 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  
  rolloverBadge: { marginTop: 20, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0' },
  rolloverTitle: { fontSize: 12, fontWeight: '800', color: '#047857', marginLeft: 6, textTransform: 'uppercase' },
  rolloverText: { fontSize: 14, fontWeight: '700', color: '#065f46', marginTop: 4 },
  actionGrid: { gap: 12, marginBottom: 24 },
  actionGridRow: { flexDirection: 'row', gap: 12 },
  gridActionCard: { flex: 1, height: 110, backgroundColor: '#fff', borderRadius: 20, padding: 16, justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 3, overflow: 'hidden' },
  actionIconWrapper: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gridActionText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  gridActionTextPrimary: { fontSize: 16, fontWeight: '700', color: '#fff' },

  fastingWidget: { borderRadius: 24, padding: 20, overflow: 'hidden', shadowColor: '#c026d3', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8, marginBottom: 24 },
  fastingWidgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  fastingWidgetTitle: { fontSize: 16, fontWeight: '800', color: '#86198f', marginLeft: 8 },
  endFastBtn: { backgroundColor: '#fdf4ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#f5d0fe' },
  endFastText: { color: '#a21caf', fontWeight: '700', fontSize: 12 },
  fastingContent: { alignItems: 'center' },
  fastingTextGroup: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  fastingTimeElapsed: { fontSize: 42, fontWeight: '900', color: '#701a75' },
  fastingTimeGoal: { fontSize: 16, fontWeight: '700', color: '#a21caf', marginLeft: 4 },
  fastingBarContainer: { width: '100%', height: 12, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  fastingHint: { fontSize: 13, color: '#86198f', fontWeight: '600', textAlign: 'center' },
  
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  gridTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  gridLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  gridValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  gridSub: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginLeft: 4 },
  quickAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', paddingVertical: 8, borderRadius: 8, marginTop: 16 },
  quickAddText: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  
  fullCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  fullCardLeft: { flexDirection: 'row', alignItems: 'center' },
  heroIconWrapper: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fullCardLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 2 },
  fullCardValue: { fontSize: 24, fontWeight: '800', color: '#111827' },
  fullCardUnit: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', marginLeft: 4 },
  chevronBtn: { padding: 8, backgroundColor: '#f9fafb', borderRadius: 12 },
  
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  feedCount: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  logImg: { width: 50, height: 50, borderRadius: 12 },
  logImgPlaceholder: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1, marginLeft: 12 },
  logName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  logMacros: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 20, marginTop: 10 },
  emptyStateText: { marginTop: 12, fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalBtnPrimary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#22ae9e' },
});
