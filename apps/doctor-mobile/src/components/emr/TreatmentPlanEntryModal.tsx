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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { emrService } from '../../services/emrService';

interface TreatmentPlanEntryModalProps {
  visible: boolean;
  planId: string;
  planTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TreatmentPlanEntryModal({
  visible,
  planId,
  planTitle,
  onClose,
  onSuccess,
}: TreatmentPlanEntryModalProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!notes.trim()) {
      Alert.alert('Empty Entry', 'Please enter some progress notes.');
      return;
    }

    setIsSaving(true);
    try {
      await emrService.addTreatmentPlanEntry(planId, notes);
      onSuccess();
      setNotes('');
      onClose();
    } catch (error: any) {
      console.error('Error adding treatment plan entry:', error);
      Alert.alert('Save Failed', error.message || 'Could not add the entry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Add Progress Note</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.iconButton}>
            {isSaving ? (
              <ActivityIndicator size="small" color={c.brand} />
            ) : (
              <Ionicons name="checkmark" size={24} color={c.brand} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.planTitle, { color: c.textSecondary }]}>Plan: {planTitle}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
            multiline
            autoFocus
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe the patient's progress..."
            placeholderTextColor={c.textTertiary}
          />
        </View>
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
    flex: 1,
    padding: 16,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
