import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { emrService } from '../../services/emrService';

interface TreatmentPlanCreatorModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TreatmentPlanCreatorModal({
  visible,
  patientId,
  onClose,
  onSuccess,
}: TreatmentPlanCreatorModalProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [title, setTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [goals, setGoals] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !diagnosis.trim()) {
      Alert.alert('Required Fields', 'Title and Diagnosis are required.');
      return;
    }

    setIsSaving(true);
    try {
      await emrService.createTreatmentPlan({
        patient_id: patientId,
        title,
        diagnosis,
        goals,
      });
      onSuccess();
      setTitle('');
      setDiagnosis('');
      setGoals('');
      onClose();
    } catch (error: any) {
      console.error('Error creating treatment plan:', error);
      Alert.alert('Save Failed', error.message || 'Could not create the plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Create Treatment Plan</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.iconButton}>
            {isSaving ? (
              <ActivityIndicator size="small" color={c.brand} />
            ) : (
              <Ionicons name="checkmark" size={24} color={c.brand} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Plan Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Asthma Management Protocol"
              placeholderTextColor={c.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Diagnosis *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="e.g. Severe persistent asthma"
              placeholderTextColor={c.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Goals</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border, minHeight: 100, textAlignVertical: 'top' }]}
              multiline
              value={goals}
              onChangeText={setGoals}
              placeholder="e.g. Reduce inhaler usage by 50% in 2 months"
              placeholderTextColor={c.textTertiary}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
});
