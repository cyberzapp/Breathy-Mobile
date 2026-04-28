import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface Patient {
  id: string;
  full_name?: string;
  age?: number | string;
  gender?: string;
}

interface Props {
  visible: boolean;
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  onClose: () => void;
}

export default function PatientSelectModal({ visible, patients, onSelect, onClose }: Props) {
  const c = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: c.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>Select Patient</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={c.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.desc, { color: c.textTertiary }]}>
            Multiple patients found with this phone number.
          </Text>

          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: c.borderMedium }]}
                onPress={() => onSelect(item)}
                activeOpacity={0.6}
              >
                <Text style={[styles.name, { color: c.text }]}>{item.full_name || 'Unknown'}</Text>
                <View style={styles.meta}>
                  {item.age ? <Text style={[styles.metaText, { color: c.textTertiary }]}>{item.age} years</Text> : null}
                  {item.gender ? (
                    <>
                      {item.age ? <Text style={[styles.dot, { color: c.textTertiary }]}>•</Text> : null}
                      <Text style={[styles.metaText, { color: c.textTertiary, textTransform: 'capitalize' }]}>
                        {item.gender}
                      </Text>
                    </>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.borderMedium} style={styles.arrow} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  item: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  dot: {
    fontSize: 13,
  },
  arrow: {
    position: 'absolute',
    right: 0,
    top: 24,
  },
});
