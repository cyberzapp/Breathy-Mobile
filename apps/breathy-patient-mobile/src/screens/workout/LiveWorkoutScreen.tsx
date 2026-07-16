import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, FadeInUp } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Simulated Exercise Data
const EXERCISE = {
  id: '1',
  name: 'Barbell Bench Press',
  target_muscle: 'Chest',
  image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000', 
  target_sets: 4,
};

const SetRow = ({ set, index, onComplete, onUpdate }: any) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = () => (
    <View style={styles.swipeCompleteAction}>
      <Ionicons name="checkmark-done" size={28} color="#fff" />
      <Text style={styles.swipeText}>Complete</Text>
    </View>
  );

  const handleSwipe = () => {
    onComplete(set.id);
    swipeableRef.current?.close();
  };

  return (
    <Swipeable 
      ref={swipeableRef}
      renderLeftActions={renderLeftActions} 
      onSwipeableLeftOpen={handleSwipe}
      friction={2}
    >
      <View style={[styles.tableRow, set.completed && styles.tableRowCompleted]}>
        <Text style={styles.tdIndex}>{index + 1}</Text>
        
        <TextInput 
          style={[styles.tdInput, set.completed && styles.tdInputCompleted]}
          value={set.weight}
          keyboardType="numeric"
          onChangeText={(val) => onUpdate(set.id, 'weight', val)}
          editable={!set.completed}
          placeholder="kg"
        />
        
        <TextInput 
          style={[styles.tdInput, set.completed && styles.tdInputCompleted]}
          value={set.reps}
          keyboardType="numeric"
          onChangeText={(val) => onUpdate(set.id, 'reps', val)}
          editable={!set.completed}
          placeholder="reps"
        />
        
        <TouchableOpacity 
          style={[styles.checkBtn, set.completed && styles.checkBtnActive]}
          onPress={() => onComplete(set.id)}
        >
          <Ionicons name="checkmark" size={20} color={set.completed ? '#fff' : '#cbd5e1'} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};

export default function LiveWorkoutScreen() {
  const navigation = useNavigation();
  const [sets, setSets] = useState([
    { id: '1', weight: '60', reps: '10', completed: true },
    { id: '2', weight: '65', reps: '8', completed: false },
    { id: '3', weight: '65', reps: '8', completed: false },
  ]);
  const [restTimer, setRestTimer] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // 1RM Animation
  const oneRmScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    let interval: any;
    if (restTimer > 0) {
      interval = setInterval(() => setRestTimer(r => r - 1), 1000);
      if (restTimer === 3 && audioEnabled) {
        Speech.speak("3, 2, 1. Back to work.");
      }
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  useEffect(() => {
    const completedCount = sets.filter(s => s.completed).length;
    progressWidth.value = withTiming((completedCount / sets.length) * width, { duration: 500 });
  }, [sets]);

  const toggleSetCompletion = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSets(prev => prev.map(s => {
      if (s.id === id) {
        const isNowCompleted = !s.completed;
        if (isNowCompleted) {
          setRestTimer(60);
          if (audioEnabled) {
            Speech.speak("Great set. Rest for 60 seconds.");
          }
          // Animate 1RM jump
          oneRmScale.value = withSequence(withSpring(1.2), withSpring(1));
        } else {
          setRestTimer(0);
          Speech.stop();
        }
        return { ...s, completed: isNowCompleted };
      }
      return s;
    }));
  };

  const updateSet = (id: string, field: string, value: string) => {
    setSets(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addSet = () => {
    setSets(prev => [...prev, { id: Date.now().toString(), weight: '', reps: '', completed: false }]);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const calculate1RM = () => {
    // Find the max 1RM across all completed sets
    let maxRm = 0;
    sets.filter(s => s.completed).forEach(s => {
      const w = parseFloat(s.weight);
      const r = parseInt(s.reps);
      if (w && r) {
        const rm = Math.round(w * (1 + r / 30));
        if (rm > maxRm) maxRm = rm;
      }
    });
    return maxRm || '--';
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
    height: 4,
    backgroundColor: '#38bdf8',
    position: 'absolute',
    top: 0, left: 0
  }));

  const oneRmStyle = useAnimatedStyle(() => ({
    transform: [{ scale: oneRmScale.value }]
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Progress Bar */}
      <Animated.View style={progressStyle} />

      {/* Quick-Action Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{restTimer > 0 ? 'Resting' : 'Active Set'}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setAudioEnabled(!audioEnabled)}>
          <Ionicons name={audioEnabled ? "volume-high" : "volume-mute"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          
          {/* Autoplay Hands-Free Media Player */}
          <View style={styles.mediaContainer}>
            <Image 
              source={{ uri: EXERCISE.image_url }} 
              style={styles.mediaImage}
              contentFit="cover"
              transition={300}
              cachePolicy="memory-disk"
            />
            <LinearGradient colors={['transparent', '#0f172a']} style={StyleSheet.absoluteFillObject} />
            
            {restTimer > 0 && (
              <Animated.View entering={FadeInUp} style={styles.timerOverlay}>
                <Text style={styles.timerText}>{formatTime(restTimer)}</Text>
                <TouchableOpacity 
                  style={styles.skipBtn} 
                  onPress={() => { setRestTimer(0); Speech.stop(); }}
                >
                  <Text style={styles.skipText}>Skip Rest</Text>
                  <Ionicons name="play-forward" size={16} color="#0f172a" style={{marginLeft: 4}}/>
                </TouchableOpacity>
              </Animated.View>
            )}

            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{EXERCISE.name}</Text>
              <TouchableOpacity style={styles.swapBtn}>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chronological Set Registry Table */}
          <View style={styles.tableContainer}>
            <Text style={styles.hintText}>💡 Swipe a set to the right to mark it completed.</Text>
            
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>Set</Text>
              <Text style={[styles.th, { flex: 1 }]}>Kg</Text>
              <Text style={[styles.th, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.th, { width: 50, textAlign: 'center' }]}>Done</Text>
            </View>

            {sets.map((set, index) => (
              <SetRow 
                key={set.id} 
                set={set} 
                index={index} 
                onComplete={toggleSetCompletion} 
                onUpdate={updateSet} 
              />
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
              <Ionicons name="add-circle" size={20} color="#38bdf8" />
              <Text style={styles.addSetText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating 1RM & Next Exercise Footer */}
      <View style={styles.footer}>
        <View style={styles.oneRmBox}>
          <Text style={styles.oneRmLabel}>Est. 1RM</Text>
          <Animated.Text style={[styles.oneRmValue, oneRmStyle]}>
            {calculate1RM()} <Text style={styles.oneRmUnit}>kg</Text>
          </Animated.Text>
        </View>
        <TouchableOpacity style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#0f172a" style={{marginLeft: 8}}/>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  
  mediaContainer: { height: 350, backgroundColor: '#1e293b', justifyContent: 'flex-end', position: 'relative' },
  mediaImage: { ...StyleSheet.absoluteFillObject, opacity: 0.8 },
  timerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  timerText: { fontSize: 96, fontWeight: '900', color: '#38bdf8', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  skipBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#38bdf8', borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
  skipText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, zIndex: 5 },
  exerciseName: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, flex: 1 },
  swapBtn: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  
  tableContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 24, minHeight: 400 },
  hintText: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 8 },
  th: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  
  swipeCompleteAction: { backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 24, flex: 1, borderRadius: 16, marginBottom: 8 },
  swipeText: { color: '#fff', fontWeight: '800', marginTop: 4 },
  
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, backgroundColor: '#f8fafc', borderRadius: 16, marginBottom: 8, paddingHorizontal: 12 },
  tableRowCompleted: { backgroundColor: '#ecfdf5' },
  tdIndex: { width: 40, fontSize: 18, fontWeight: '900', color: '#64748b' },
  tdInput: { flex: 1, backgroundColor: '#fff', marginHorizontal: 8, borderRadius: 12, padding: 14, fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  tdInputCompleted: { backgroundColor: 'transparent', color: '#059669', shadowOpacity: 0, elevation: 0 },
  checkBtn: { width: 50, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e2e8f0' },
  checkBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  
  addSetBtn: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: '#f0f9ff', borderRadius: 16 },
  addSetText: { color: '#0284c7', fontSize: 16, fontWeight: '800', marginLeft: 8 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 24, paddingBottom: 40, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 10 },
  oneRmBox: { flex: 1 },
  oneRmLabel: { fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  oneRmValue: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  oneRmUnit: { fontSize: 16, color: '#94a3b8', fontWeight: '700' },
  nextBtn: { backgroundColor: '#38bdf8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, borderRadius: 20, shadowColor: '#38bdf8', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  nextBtnText: { color: '#0f172a', fontSize: 18, fontWeight: '900' }
});
