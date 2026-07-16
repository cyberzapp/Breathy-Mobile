import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

const { width } = Dimensions.get('window');

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const SPLIT_TYPES = ['Hypertrophy', 'Full-Body Split', 'Upper / Lower Split', 'Push / Pull / Legs (PPL)', 'The Arnold Split', 'Bro Split'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Powerlifting'];

export default function RoutinePlannerScreen() {
  const [topTab, setTopTab] = useState('My Planner');
  const [subTab, setSubTab] = useState('Overview');
  
  // Workout Metadata
  const [workoutMeta, setWorkoutMeta] = useState({
    name: 'New Workout',
    level: 'Beginner',
    split: 'Maintaining',
    duration: '4 Days',
    gender: 'female' // or 'male'
  });

  const heroImage = workoutMeta.gender === 'female' 
    ? require('../../../assets/default/female_athlete.png') 
    : require('../../../assets/default/male_athlete.png');

  // Days State
  const [days, setDays] = useState<any[]>([]);
  const [anchorDayIndex, setAnchorDayIndex] = useState(1); // 1 = TUE

  // Modal & Menus
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const contextMenuRef = useRef<BottomSheet>(null);
  const dayMenuRef = useRef<BottomSheet>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />,
    []
  );

  // Auto-Scheduling Logic
  const recalculateDays = (currentDays: any[]) => {
    return currentDays.map((day, index) => ({
      ...day,
      day_of_week: day.manual_override || DAYS_OF_WEEK[(anchorDayIndex + index) % 7],
      sequence_number: index + 1
    }));
  };

  const addDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDay = {
      id: Date.now().toString(),
      title: `Day ${days.length + 1}: Default`,
      exercises_count: 0,
      est_time: '0m',
      log_age: 'New',
      manual_override: null
    };
    setDays(prev => recalculateDays([...prev, newDay]));
  };

  const handleDragEnd = ({ data }: { data: any[] }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDays(recalculateDays(data));
  };

  const renderDayItem = ({ item, drag, isActive }: RenderItemParams<any>) => (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[styles.dayCard, isActive && styles.dayCardActive]}
        activeOpacity={0.9}
      >
        <View style={styles.dragHandle}>
          <Ionicons name="ellipsis-vertical" size={20} color="#cbd5e1" style={{ marginRight: -10 }} />
          <Ionicons name="ellipsis-vertical" size={20} color="#cbd5e1" />
        </View>

        <View style={styles.dayIconBox}>
          <Ionicons name="body" size={24} color="#0ea5e9" />
        </View>

        <View style={styles.dayInfo}>
          <Text style={styles.dayOfWeekText}>{item.day_of_week}</Text>
          <Text style={styles.dayTitleText}>{item.title}</Text>
          <Text style={styles.daySubText}>Est. {item.est_time}, {item.exercises_count} exercises</Text>
        </View>

        <View style={styles.dayRight}>
          <Text style={styles.dayAgeText}>{item.log_age}</Text>
          <TouchableOpacity 
            style={styles.dayMenuBtn} 
            onPress={() => {
              setSelectedDayId(item.id);
              dayMenuRef.current?.expand();
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        {/* Top Segmented Navigation */}
        <View style={styles.topNav}>
          {['Discover', 'My Planner', 'Quick Session'].map(tab => (
            <TouchableOpacity key={tab} onPress={() => setTopTab(tab)}>
              <Text style={[styles.topNavText, topTab === tab && styles.topNavTextActive]}>{tab}</Text>
              {topTab === tab && <View style={styles.topNavIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        {/* Hero Image Header */}
        <View style={styles.heroSection}>
          <Image source={heroImage} style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={['rgba(15,23,42,0.1)', 'rgba(15,23,42,0.9)']} style={StyleSheet.absoluteFillObject} />
          
          <TouchableOpacity style={styles.heroMenuBtn} onPress={() => contextMenuRef.current?.expand()}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{workoutMeta.name}</Text>
            <Text style={styles.heroMeta}>
              {workoutMeta.level.toUpperCase()} • {workoutMeta.split.toUpperCase()} • {days.length || workoutMeta.duration} DAYS
            </Text>
          </View>
        </View>

        {/* Sub Tabs */}
        <View style={styles.subTabsContainer}>
          {['Overview', 'Day Details'].map(tab => (
            <TouchableOpacity key={tab} style={[styles.subTab, subTab === tab && styles.subTabActive]} onPress={() => setSubTab(tab)}>
              {tab === 'Overview' && <Ionicons name="list" size={18} color={subTab === tab ? '#0f172a' : '#94a3b8'} style={{marginRight: 6}} />}
              <Text style={[styles.subTabText, subTab === tab && styles.subTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Draggable Days List */}
        <DraggableFlatList
          style={{ flex: 1 }}
          data={days}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          renderItem={renderDayItem}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            <TouchableOpacity style={styles.addDayBtn} onPress={addDay}>
              <Ionicons name="add" size={24} color="#0ea5e9" />
              <Text style={styles.addDayText}>Add a day</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Day Card Context Menu */}
      <BottomSheet
        ref={dayMenuRef}
        index={-1}
        snapPoints={['35%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.menuContent}>
          <Text style={styles.menuTitle}>Day Options</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => dayMenuRef.current?.close()}>
            <Ionicons name="create-outline" size={22} color="#0f172a" />
            <Text style={styles.menuItemText}>Rename Day</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => dayMenuRef.current?.close()}>
            <Ionicons name="copy-outline" size={22} color="#0f172a" />
            <Text style={styles.menuItemText}>Duplicate Day</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => {
            if (selectedDayId) {
              setDays(prev => recalculateDays(prev.filter(d => d.id !== selectedDayId)));
            }
            dayMenuRef.current?.close();
          }}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete Day</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Hero Header Context Menu */}
      <BottomSheet
        ref={contextMenuRef}
        index={-1}
        snapPoints={['40%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.menuContent}>
          <Text style={styles.menuTitle}>Workout Options</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { contextMenuRef.current?.close(); setIsEditModalVisible(true); }}>
            <Ionicons name="pencil" size={22} color="#0f172a" />
            <Text style={styles.menuItemText}>Edit Workout Info</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => contextMenuRef.current?.close()}>
            <Ionicons name="share-social" size={22} color="#0f172a" />
            <Text style={styles.menuItemText}>Share to Community</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => contextMenuRef.current?.close()}>
            <Ionicons name="copy" size={22} color="#0f172a" />
            <Text style={styles.menuItemText}>Duplicate Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => contextMenuRef.current?.close()}>
            <Ionicons name="trash" size={22} color="#ef4444" />
            <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete Workout</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Edit Workout Info Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Workout</Text>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}><Text style={styles.modalSave}>Save</Text></TouchableOpacity>
          </View>

          <KeyboardAwareScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.fieldLabel}>Workout Name</Text>
            <TextInput 
              style={styles.inputField} 
              value={workoutMeta.name} 
              onChangeText={val => setWorkoutMeta({...workoutMeta, name: val})}
            />

            <Text style={styles.fieldLabel}>Cover Gender</Text>
            <View style={styles.chipRow}>
              {['male', 'female'].map(g => (
                <TouchableOpacity key={g} style={[styles.chip, workoutMeta.gender === g && styles.chipActive]} onPress={() => setWorkoutMeta({...workoutMeta, gender: g})}>
                  <Text style={[styles.chipText, workoutMeta.gender === g && styles.chipTextActive]}>{g.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Experience Level</Text>
            <View style={styles.chipRow}>
              {LEVELS.map(l => (
                <TouchableOpacity key={l} style={[styles.chip, workoutMeta.level === l && styles.chipActive]} onPress={() => setWorkoutMeta({...workoutMeta, level: l})}>
                  <Text style={[styles.chipText, workoutMeta.level === l && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Split Strategy</Text>
            <View style={styles.chipRow}>
              {SPLIT_TYPES.map(s => (
                <TouchableOpacity key={s} style={[styles.chip, workoutMeta.split === s && styles.chipActive]} onPress={() => setWorkoutMeta({...workoutMeta, split: s})}>
                  <Text style={[styles.chipText, workoutMeta.split === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  topNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12 },
  topNavText: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  topNavTextActive: { color: '#0f172a' },
  topNavIndicator: { width: 30, height: 4, backgroundColor: '#0ea5e9', borderRadius: 2, position: 'absolute', bottom: -12, alignSelf: 'center' },

  heroSection: { height: 220, position: 'relative' },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroMenuBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroContent: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 4 },
  heroMeta: { fontSize: 13, fontWeight: '800', color: '#e2e8f0', letterSpacing: 0.5 },

  subTabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  subTabActive: { borderBottomColor: '#0f172a' },
  subTabText: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  subTabTextActive: { color: '#0f172a' },

  listContainer: { padding: 16, paddingBottom: 100 },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', height: 60, borderRadius: 16, borderWidth: 2, borderColor: '#e0f2fe', borderStyle: 'dashed', marginTop: 12 },
  addDayText: { fontSize: 16, fontWeight: '800', color: '#0ea5e9', marginLeft: 8 },

  dayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  dayCardActive: { shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderColor: '#0ea5e9', transform: [{ scale: 1.02 }] },
  dragHandle: { flexDirection: 'row', alignItems: 'center', width: 24, marginLeft: -8 },
  dayIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 },
  dayInfo: { flex: 1 },
  dayOfWeekText: { fontSize: 14, fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: 2 },
  dayTitleText: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  daySubText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  dayRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' },
  dayAgeText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  dayMenuBtn: { padding: 8, marginRight: -8, marginTop: 8 },

  menuContent: { paddingHorizontal: 24, paddingBottom: 24 },
  menuTitle: { fontSize: 18, fontWeight: '800', color: '#64748b', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuItemText: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginLeft: 16 },

  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalCancel: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  modalSave: { fontSize: 16, color: '#0ea5e9', fontWeight: '800' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalScroll: { padding: 20, paddingBottom: 100 },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 24 },
  inputField: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 18, fontWeight: '700', color: '#0f172a', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' }
});
