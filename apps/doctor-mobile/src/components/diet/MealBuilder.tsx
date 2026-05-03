import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ScrollView, FlatList, ActivityIndicator, Animated, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { Meal, MealItem } from '../../services/dietPlanService';
import { searchFoods, getCommonFoods, FoodData } from '../../services/foodDatabaseService';

interface MealBuilderProps {
  meals: Meal[];
  onChange: (meals: Meal[]) => void;
}

export default function MealBuilder({ meals, onChange }: MealBuilderProps) {
  const c = useColors();
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<MealItem>({
    name: '', quantity: '', calories: '', protein: '', carbs: '', fat: '', notes: ''
  });

  // Food search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodData[]>([]);
  const [commonFoods, setCommonFoods] = useState<FoodData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  useEffect(() => {
    loadCommonFoods();
  }, []);

  const loadCommonFoods = async () => {
    const foods = await getCommonFoods();
    setCommonFoods(foods.slice(0, 12));
  };

  const handleFoodSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setCurrentItem(prev => ({ ...prev, name: query }));

    if (query.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);
    const results = await searchFoods(query);
    setSearchResults(results);
    setIsSearching(false);
  }, []);

  const selectFood = (food: FoodData) => {
    setCurrentItem({
      ...currentItem,
      name: food.name,
      calories: String(Math.round(food.calories)),
      protein: String(Math.round(food.protein)),
      carbs: String(Math.round(food.carbs)),
      fat: String(Math.round(food.fat)),
    });
    setShowSuggestions(false);
    setSearchQuery(food.name);
  };

  const addMeal = () => {
    const newMeal: Meal = { meal_type: 'Breakfast', time: '08:00 AM', items: [] };
    onChange([...meals, newMeal]);
  };

  const removeMeal = (index: number) => {
    const updated = [...meals];
    updated.splice(index, 1);
    onChange(updated);
  };

  const updateMealField = (index: number, field: keyof Meal, value: string) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const openAddItemModal = (mealIndex: number) => {
    setActiveMealIndex(mealIndex);
    setEditingItemIndex(null);
    setCurrentItem({ name: '', quantity: '', calories: '', protein: '', carbs: '', fat: '', notes: '' });
    setSearchQuery('');
    setShowSuggestions(false);
    setIsItemModalVisible(true);
  };

  const openEditItemModal = (mealIndex: number, itemIndex: number, item: MealItem) => {
    setActiveMealIndex(mealIndex);
    setEditingItemIndex(itemIndex);
    setCurrentItem({ ...item });
    setSearchQuery(item.name);
    setShowSuggestions(false);
    setIsItemModalVisible(true);
  };

  const saveItem = () => {
    if (activeMealIndex === null) return;
    const updatedMeals = [...meals];
    const meal = updatedMeals[activeMealIndex];

    if (editingItemIndex !== null) {
      meal.items[editingItemIndex] = currentItem;
    } else {
      meal.items.push(currentItem);
    }

    onChange(updatedMeals);
    setIsItemModalVisible(false);
  };

  const removeItem = (mealIndex: number, itemIndex: number) => {
    const updated = [...meals];
    updated[mealIndex].items.splice(itemIndex, 1);
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Daily Meals</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: c.brandBg }]} onPress={addMeal}>
          <Ionicons name="add" size={16} color={c.brand} />
          <Text style={[styles.addButtonText, { color: c.brand }]}>Add Meal</Text>
        </TouchableOpacity>
      </View>

      {meals.map((meal, mIndex) => {
        const totalCals = meal.items.reduce((acc, it) => acc + (parseInt(it.calories) || 0), 0);
        return (
          <View key={mIndex} style={[styles.mealCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.mealHeader}>
              <TextInput
                style={[styles.mealTypeInput, { color: c.text }]}
                value={meal.meal_type}
                onChangeText={(text) => updateMealField(mIndex, 'meal_type', text)}
                placeholder="e.g. Breakfast"
                placeholderTextColor={c.textTertiary}
              />
              <TextInput
                style={[styles.mealTimeInput, { color: c.textSecondary, backgroundColor: c.bg }]}
                value={meal.time}
                onChangeText={(text) => updateMealField(mIndex, 'time', text)}
                placeholder="Time"
                placeholderTextColor={c.textTertiary}
              />
              <TouchableOpacity onPress={() => removeMeal(mIndex)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={c.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.itemsList}>
              {meal.items.map((item, iIndex) => (
                <View key={iIndex} style={[styles.itemCard, { backgroundColor: c.bg }]}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: c.text }]}>{item.name}</Text>
                    <Text style={[styles.itemDetails, { color: c.textSecondary }]}>
                      {item.quantity} • {item.calories} kcal
                    </Text>
                    <Text style={[styles.itemMacros, { color: c.textTertiary }]}>
                      P: {item.protein || 0}g | C: {item.carbs || 0}g | F: {item.fat || 0}g
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEditItemModal(mIndex, iIndex, item)} style={{ padding: 8 }}>
                      <Ionicons name="pencil" size={16} color={c.brand} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(mIndex, iIndex)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.mealFooter, { borderTopColor: c.border }]}>
              <Text style={[styles.mealTotal, { color: c.textSecondary }]}>Total: {totalCals} kcal</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={() => openAddItemModal(mIndex)}>
                <Ionicons name="add-circle-outline" size={18} color={c.brand} />
                <Text style={[styles.addItemText, { color: c.brand }]}>Add Food Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Item Modal with Food Autocomplete */}
      <Modal visible={isItemModalVisible} transparent animationType="fade">
        <Animated.View style={[styles.modalOverlay, { paddingBottom: keyboardHeight }]}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>
              {editingItemIndex !== null ? 'Edit Food Item' : 'Add Food Item'}
            </Text>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              {/* Quick Pick Chips */}
              {editingItemIndex === null && commonFoods.length > 0 && !showSuggestions && (
                <View style={styles.quickPickSection}>
                  <Text style={[styles.quickPickLabel, { color: c.textTertiary }]}>Quick Pick</Text>
                  <View style={styles.quickPickRow}>
                    {commonFoods.map((food, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.quickPickChip, { backgroundColor: c.brandBg, borderColor: c.border }]}
                        onPress={() => selectFood(food)}
                      >
                        <Text style={[styles.quickPickText, { color: c.brand }]} numberOfLines={1}>
                          {food.name.length > 12 ? food.name.substring(0, 12) + '…' : food.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Food Name with Autocomplete */}
              <Text style={[styles.label, { color: c.textSecondary }]}>Food Name *</Text>
              <View style={{ position: 'relative' }}>
                <View style={[styles.searchInputRow, { borderColor: c.border, backgroundColor: c.bg }]}>
                  <Ionicons name="search" size={16} color={c.textTertiary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: c.text }]}
                    value={searchQuery}
                    onChangeText={handleFoodSearch}
                    placeholder="Search food (e.g. paneer, rice)..."
                    placeholderTextColor={c.textTertiary}
                  />
                  {isSearching && <ActivityIndicator size="small" color={c.brand} />}
                </View>

                {/* Autocomplete Dropdown */}
                {showSuggestions && searchResults.length > 0 && (
                  <View style={[styles.suggestionsBox, { backgroundColor: c.card, borderColor: c.border }]}>
                    {searchResults.slice(0, 6).map((food, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.suggestionItem, { borderBottomColor: c.border }]}
                        onPress={() => selectFood(food)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.suggestionName, { color: c.text }]}>{food.name}</Text>
                          {food.name_hindi && (
                            <Text style={[styles.suggestionHindi, { color: c.textTertiary }]}>{food.name_hindi}</Text>
                          )}
                        </View>
                        <Text style={[styles.suggestionCal, { color: c.brand }]}>{food.calories} kcal</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={[styles.label, { color: c.textSecondary }]}>Quantity/Portion</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                value={currentItem.quantity}
                onChangeText={(t) => setCurrentItem({ ...currentItem, quantity: t })}
                placeholder="e.g. 1 bowl (50g)"
                placeholderTextColor={c.textTertiary}
              />

              <View style={styles.macroRow}>
                <View style={styles.macroCol}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Calories</Text>
                  <TextInput
                    style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                    value={currentItem.calories}
                    onChangeText={(t) => setCurrentItem({ ...currentItem, calories: t.replace(/[^0-9]/g, '') })}
                    keyboardType="numeric"
                    placeholder="kcal"
                    placeholderTextColor={c.textTertiary}
                  />
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Protein (g)</Text>
                  <TextInput
                    style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                    value={currentItem.protein}
                    onChangeText={(t) => setCurrentItem({ ...currentItem, protein: t.replace(/[^0-9]/g, '') })}
                    keyboardType="numeric"
                    placeholder="g"
                    placeholderTextColor={c.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroCol}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Carbs (g)</Text>
                  <TextInput
                    style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                    value={currentItem.carbs}
                    onChangeText={(t) => setCurrentItem({ ...currentItem, carbs: t.replace(/[^0-9]/g, '') })}
                    keyboardType="numeric"
                    placeholder="g"
                    placeholderTextColor={c.textTertiary}
                  />
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.label, { color: c.textSecondary }]}>Fat (g)</Text>
                  <TextInput
                    style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                    value={currentItem.fat}
                    onChangeText={(t) => setCurrentItem({ ...currentItem, fat: t.replace(/[^0-9]/g, '') })}
                    keyboardType="numeric"
                    placeholder="g"
                    placeholderTextColor={c.textTertiary}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsItemModalVisible(false)}>
                <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: c.brand, opacity: currentItem.name ? 1 : 0.5 }]}
                onPress={saveItem}
                disabled={!currentItem.name}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  addButtonText: { fontSize: 14, fontWeight: '500' },
  mealCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealTypeInput: { flex: 1, fontSize: 16, fontWeight: '600', padding: 0 },
  mealTimeInput: { width: 80, fontSize: 14, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, textAlign: 'center', marginRight: 8 },
  itemsList: { gap: 8, marginBottom: 12 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  itemDetails: { fontSize: 13, marginBottom: 2 },
  itemMacros: { fontSize: 12 },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  mealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  mealTotal: { fontSize: 14, fontWeight: '600' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  formScroll: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroCol: { flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalSave: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  // Quick pick
  quickPickSection: { marginBottom: 8 },
  quickPickLabel: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  quickPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickPickChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  quickPickText: { fontSize: 12, fontWeight: '500' },
  // Search input
  searchInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  // Suggestions
  suggestionsBox: { borderWidth: 1, borderRadius: 8, marginTop: 4, maxHeight: 200, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5 },
  suggestionName: { fontSize: 14, fontWeight: '500' },
  suggestionHindi: { fontSize: 12, marginTop: 2 },
  suggestionCal: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
});
