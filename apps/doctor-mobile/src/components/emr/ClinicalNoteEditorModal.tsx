import React, { useState, useEffect } from 'react';
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

interface ClinicalNoteEditorModalProps {
  visible: boolean;
  patientId: string;
  appointmentId?: string | null;
  existingNote?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClinicalNoteEditorModal({
  visible,
  patientId,
  appointmentId,
  existingNote,
  onClose,
  onSuccess,
}: ClinicalNoteEditorModalProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [s, setS] = useState('');
  const [o, setO] = useState('');
  const [a, setA] = useState('');
  const [p, setP] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && existingNote) {
      const content = existingNote.note_content || {};
      setS(content.s || '');
      setO(content.o || '');
      setA(content.a || '');
      setP(content.p || '');
    } else if (visible) {
      setS('');
      setO('');
      setA('');
      setP('');
    }
  }, [visible, existingNote]);

  const handleSave = async () => {
    if (!s && !o && !a && !p) {
      Alert.alert('Empty Note', 'Please enter some content before saving.');
      return;
    }

    if (!existingNote && !appointmentId) {
      Alert.alert('Error', 'Cannot create a note without a valid appointment.');
      return;
    }

    setIsSaving(true);
    try {
      const noteContent = { s, o, a, p };
      if (existingNote) {
        await emrService.updateClinicalNote(existingNote.id, { note_content: noteContent });
      } else {
        await emrService.createClinicalNote({
          appointment_id: appointmentId!,
          patient_id: patientId,
          note_content: noteContent,
        });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving clinical note:', error);
      Alert.alert('Save Failed', error.message || 'Could not save the note.');
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
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {existingNote ? 'Edit Clinical Note' : 'Add Clinical Note'}
          </Text>
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
            <Text style={[styles.label, { color: c.textSecondary }]}>S - Subjective (Patient's complaints)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              multiline
              value={s}
              onChangeText={setS}
              placeholder="e.g. Patient complains of headache..."
              placeholderTextColor={c.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>O - Objective (Physical findings)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              multiline
              value={o}
              onChangeText={setO}
              placeholder="e.g. BP 120/80, temp normal..."
              placeholderTextColor={c.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>A - Assessment (Diagnosis)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              multiline
              value={a}
              onChangeText={setA}
              placeholder="e.g. Migraine..."
              placeholderTextColor={c.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>P - Plan (Treatment & Follow up)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              multiline
              value={p}
              onChangeText={setP}
              placeholder="e.g. Prescribed meds, review in 7 days..."
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
    minHeight: 100,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
