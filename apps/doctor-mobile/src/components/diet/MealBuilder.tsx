import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { Meal, MealItem } from '../../services/dietPlanService';

interface MealBuilderProps {
  meals: Meal[];
  onChange: (meals: Meal[]) => void;
}

export default function MealBuilder({ meals, onChange }: MealBuilderProps) {
  const c = useColors();
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);

  // Temporary state for the item being added/edited
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<MealItem>({
    name: '', quantity: '', calories: '', protein: '', carbs: '', fat: '', notes: ''
  });

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
    setIsItemModalVisible(true);
  };

  const openEditItemModal = (mealIndex: number, itemIndex: number, item: MealItem) => {
    setActiveMealIndex(mealIndex);
    setEditingItemIndex(itemIndex);
    setCurrentItem({ ...item });
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

            <View style={styles.mealFooter}>
              <Text style={[styles.mealTotal, { color: c.textSecondary }]}>Total: {totalCals} kcal</Text>
              <TouchableOpacity style={styles.addItemBtn} onPress={() => openAddItemModal(mIndex)}>
                <Ionicons name="add-circle-outline" size={18} color={c.brand} />
                <Text style={[styles.addItemText, { color: c.brand }]}>Add Food Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Item Modal */}
      <Modal visible={isItemModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>
              {editingItemIndex !== null ? 'Edit Food Item' : 'Add Food Item'}
            </Text>

            <ScrollView style={styles.formScroll}>
              <Text style={[styles.label, { color: c.textSecondary }]}>Food Name *</Text>
              <TextInput
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
                value={currentItem.name}
                onChangeText={(t) => setCurrentItem({ ...currentItem, name: t })}
                placeholder="e.g. Oatmeal"
                placeholderTextColor={c.textTertiary}
              />

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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mealCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  mealTimeInput: {
    width: 80,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    marginRight: 8,
  },
  itemsList: {
    gap: 8,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 13,
    marginBottom: 2,
  },
  itemMacros: {
    fontSize: 12,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0', // Note: using fixed color here, ideally should use c.border via inline style or omit line
    paddingTop: 12,
  },
  mealTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formScroll: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCol: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalSave: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
