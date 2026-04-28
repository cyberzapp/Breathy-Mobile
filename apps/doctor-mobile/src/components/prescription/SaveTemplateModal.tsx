import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function SaveTemplateModal({ visible, onClose, onSave }: Props) {
  const c = useColors();
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setIsSaving(true);
    try {
      await onSave(templateName.trim());
      setTemplateName('');
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.container, { backgroundColor: c.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.text }]}>Save as Template</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={c.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.desc, { color: c.textTertiary }]}>
              Save the current diagnosis, medications, investigations, and advice as a reusable template.
            </Text>

            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text },
              ]}
              placeholder="Template Name (e.g. Type 2 Diabetes)"
              placeholderTextColor={c.textTertiary}
              value={templateName}
              onChangeText={setTemplateName}
              autoFocus
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: c.borderMedium }]}
                onPress={onClose}
              >
                <Text style={[styles.btnText, { color: c.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.saveBtn,
                  { backgroundColor: c.brand },
                  (!templateName.trim() || isSaving) && { opacity: 0.6 },
                ]}
                onPress={handleSave}
                disabled={!templateName.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.btnText, { color: '#fff' }]}>Save Template</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    justifyContent: 'center',
  },
  container: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  desc: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {},
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
