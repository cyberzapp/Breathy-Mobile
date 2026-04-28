import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, TextInput } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { COMMON_FREQUENCIES } from '../../services/prescriptionService';

// ---------------------------------------------------------------------------
// FrequencyChips — Horizontally scrollable chips for medication frequency
// ---------------------------------------------------------------------------

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function FrequencyChips({ value, onChange }: Props) {
  const c = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {COMMON_FREQUENCIES.map((freq) => {
        const isActive = value === freq;
        return (
          <TouchableOpacity
            key={freq}
            style={[
              styles.chip,
              { backgroundColor: c.cardAlt, borderColor: c.border },
              isActive && { backgroundColor: c.brandBg, borderColor: c.brand },
            ]}
            activeOpacity={0.7}
            onPress={() => onChange(freq)}
          >
            <Text
              style={[
                styles.chipText,
                { color: c.textSecondary },
                isActive && { color: c.brand, fontWeight: '700' },
              ]}
            >
              {freq}
            </Text>
          </TouchableOpacity>
        );
      })}
      <TextInput
        style={[
          styles.customInput,
          { backgroundColor: c.input, borderColor: c.border, color: c.text },
        ]}
        placeholder="Custom..."
        placeholderTextColor={c.textTertiary}
        value={COMMON_FREQUENCIES.includes(value) ? '' : value}
        onChangeText={onChange}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customInput: {
    height: 32,
    minWidth: 80,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 16,
  },
});
