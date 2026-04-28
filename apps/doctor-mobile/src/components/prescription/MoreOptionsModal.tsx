import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAISuggest: () => void;
  onSaveTemplate: () => void;
}

export default function MoreOptionsModal({ visible, onClose, onAISuggest, onSaveTemplate }: Props) {
  const c = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: c.card }]}>
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: c.borderMedium }]}
            onPress={() => {
              onClose();
              onAISuggest();
            }}
          >
            <Ionicons name="color-wand-outline" size={22} color={c.brand} />
            <Text style={[styles.optionText, { color: c.text }]}>AI Suggest Medications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onClose();
              onSaveTemplate();
            }}
          >
            <Ionicons name="save-outline" size={22} color={c.text} />
            <Text style={[styles.optionText, { color: c.text }]}>Save as Template</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
