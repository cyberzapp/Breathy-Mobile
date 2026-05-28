import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  LayoutAnimation
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchFoodDatabase, logFoodItem, getCustomFoods, createCustomFood } from '../../services/patientService';
import dayjs from 'dayjs';

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function FoodDatabaseScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [results, setResults] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'MyFoods'>('All');

  // Custom Food Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: ''
  });

  useEffect(() => {
    handleSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (activeTab === 'MyFoods') {
      fetchCustomFoods();
    }
  }, [activeTab]);

  const fetchCustomFoods = async () => {
    try {
      setLoading(true);
      const res = await getCustomFoods();
      setCustomFoods(res.data || res);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const response = await searchFoodDatabase(query);
      const data = response.data || response;
      setResults((data as any[]) || []);
    } catch (e) {
      console.warn('Error searching foods:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogFood = async (food: any) => {
    try {
      await logFoodItem({
        date: dayjs().format('YYYY-MM-DD'),
        food_name: food.name,
        calories: food.calories,
        protein_g: food.protein || 0,
        carbs_g: food.carbs || 0,
        fats_g: food.fat || 0,
      });
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to log food:', e);
    }
  };

  const handleSaveCustomFood = async () => {
    try {
      const payload = {
        name: customFoodForm.name,
        calories: parseInt(customFoodForm.calories) || 0,
        protein: parseFloat(customFoodForm.protein) || 0,
        carbs: parseFloat(customFoodForm.carbs) || 0,
        fat: parseFloat(customFoodForm.fat) || 0,
      };
      const res = await createCustomFood(payload);
      const newFood = res.data || res;
      setCustomFoods([newFood, ...customFoods]);
      setModalVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      handleLogFood(newFood);
    } catch (e) {
      console.warn(e);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.foodCard}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{item.name}</Text>
        {item.name_hindi || item.name_bn ? (
          <Text style={styles.regionalName}>
            {[item.name_hindi, item.name_bn].filter(Boolean).join(' • ')}
          </Text>
        ) : null}
        <Text style={styles.foodDetails}>
          🔥 {item.calories} cal  ·  {item.serving_size}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleLogFood(item);
        }}
      >
        <Ionicons name="add" size={24} color="#111827" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Database</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Indian foods, meals..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={activeTab === 'All' ? styles.activeTab : null}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('All');
          }}
        >
          <Text style={activeTab === 'All' ? styles.activeTabText : styles.inactiveTab}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={activeTab === 'MyFoods' ? styles.activeTab : null}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('MyFoods');
          }}
        >
          <Text style={activeTab === 'MyFoods' ? styles.activeTabText : styles.inactiveTab}>My foods</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logEmptyBtn}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="pencil" size={16} color="#111827" style={{ marginRight: 8 }} />
        <Text style={styles.logEmptyText}>Log Custom Calories</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{activeTab === 'All' ? 'Suggestions' : 'Your Saved Foods'}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#22ae9e" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={activeTab === 'All' ? results : customFoods}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Custom Food Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Custom Food</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#000" /></TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.inputLabel}>Food Name</Text>
            <TextInput style={styles.inputField} placeholder="e.g. Homemade Salad" value={customFoodForm.name} onChangeText={(t) => setCustomFoodForm({ ...customFoodForm, name: t })} />
            <Text style={styles.inputLabel}>Calories</Text>
            <TextInput style={styles.inputField} placeholder="0" keyboardType="numeric" value={customFoodForm.calories} onChangeText={(t) => setCustomFoodForm({ ...customFoodForm, calories: t })} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput style={styles.inputField} placeholder="0" keyboardType="numeric" value={customFoodForm.protein} onChangeText={(t) => setCustomFoodForm({ ...customFoodForm, protein: t })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput style={styles.inputField} placeholder="0" keyboardType="numeric" value={customFoodForm.carbs} onChangeText={(t) => setCustomFoodForm({ ...customFoodForm, carbs: t })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput style={styles.inputField} placeholder="0" keyboardType="numeric" value={customFoodForm.fat} onChangeText={(t) => setCustomFoodForm({ ...customFoodForm, fat: t })} />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomFood}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save & Log</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    minHeight: 40,
    paddingVertical: 0, // override default padding on android
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 8,
  },
  activeTabText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  inactiveTab: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 15,
  },
  logEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logEmptyText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  regionalName: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  foodDetails: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '600',
    marginTop: 6,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 16
  },
  inputField: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16
  },
  saveBtn: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32
  }
});
