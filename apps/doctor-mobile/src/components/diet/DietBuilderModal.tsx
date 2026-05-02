import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { dietPlanService, DietPlan, Meal } from '../../services/dietPlanService';
import MealBuilder from './MealBuilder';

interface DietBuilderModalProps {
  visible: boolean;
  initialPlan: DietPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DietBuilderModal({ visible, initialPlan, onClose, onSuccess }: DietBuilderModalProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planName, setPlanName] = useState('');
  const [goals, setGoals] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [notes, setNotes] = useState('');
  const [labelsStr, setLabelsStr] = useState('');
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    if (visible) {
      if (initialPlan) {
        setPlanName(initialPlan.plan_name || '');
        setGoals(initialPlan.goals || '');
        setRestrictions(initialPlan.dietary_restrictions?.join(', ') || '');
        setNotes(initialPlan.notes || '');
        setLabelsStr(initialPlan.labels?.join(', ') || '');
        setMeals(initialPlan.meals || []);
      } else {
        resetForm();
      }
    }
  }, [visible, initialPlan]);

  const resetForm = () => {
    setPlanName('');
    setGoals('');
    setRestrictions('');
    setNotes('');
    setLabelsStr('');
    setMeals([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!planName) {
      Alert.alert('Validation Error', 'Plan name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const dietaryRestrictionsArray = restrictions.split(',').map(r => r.trim()).filter(r => r.length > 0);
      const labelsArray = labelsStr.split(',').map(l => l.trim()).filter(l => l.length > 0);

      const payload: Partial<DietPlan> = {
        plan_name: planName,
        goals,
        dietary_restrictions: dietaryRestrictionsArray,
        notes,
        meals,
        labels: labelsArray,
        is_template: true, // Always default to template in this builder
      };

      if (initialPlan) {
        await dietPlanService.updateDietPlan(initialPlan.id, payload);
      } else {
        await dietPlanService.createDietPlan(payload);
      }

      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Failed to save diet plan:', error);
      Alert.alert('Error', 'Failed to save diet plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dailyCalories = meals.reduce((sum, meal) => 
    sum + meal.items.reduce((itemSum, item) => itemSum + (parseInt(item.calories) || 0), 0), 0
  );
  
  const dailyProtein = meals.reduce((sum, meal) => 
    sum + meal.items.reduce((itemSum, item) => itemSum + (parseInt(item.protein) || 0), 0), 0
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={{ color: c.textSecondary, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {initialPlan ? 'Edit Template' : 'New Template'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.headerButton} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={c.brand} />
            ) : (
              <Text style={{ color: c.brand, fontSize: 16, fontWeight: '600' }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.summaryCard, { backgroundColor: c.brandBg }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: c.brand }]}>Daily Cals</Text>
              <Text style={[styles.summaryValue, { color: c.brand }]}>{dailyCalories}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: c.brand }]}>Protein (g)</Text>
              <Text style={[styles.summaryValue, { color: c.brand }]}>{dailyProtein}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Template Name *</Text>
            <TextInput
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
              placeholder="e.g. Keto 1500 Calorie"
              placeholderTextColor={c.textTertiary}
              value={planName}
              onChangeText={setPlanName}
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Labels / Categories</Text>
            <TextInput
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
              placeholder="e.g. Weight Loss, Keto, High Protein"
              placeholderTextColor={c.textTertiary}
              value={labelsStr}
              onChangeText={setLabelsStr}
            />

            <Text style={[styles.label, { color: c.textSecondary }]}>Dietary Restrictions</Text>
            <TextInput
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
              placeholder="e.g. Gluten-free, Vegan, Nut allergy"
              placeholderTextColor={c.textTertiary}
              value={restrictions}
              onChangeText={setRestrictions}
            />
          </View>

          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Primary Goals</Text>
            <TextInput
              style={[styles.textArea, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
              placeholder="What this template aims to achieve..."
              placeholderTextColor={c.textTertiary}
              value={goals}
              onChangeText={setGoals}
              multiline
              textAlignVertical="top"
            />
            
            <Text style={[styles.label, { color: c.textSecondary }]}>Doctor Notes</Text>
            <TextInput
              style={[styles.textArea, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
              placeholder="Additional instructions..."
              placeholderTextColor={c.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          <MealBuilder meals={meals} onChange={setMeals} />

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: { padding: 4, minWidth: 60 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase' },
  summaryValue: { fontSize: 24, fontWeight: 'bold' },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
  },
});
