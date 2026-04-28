import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, TextInput } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { COMMON_DURATIONS } from '../../services/prescriptionService';

// ---------------------------------------------------------------------------
// DurationChips — Horizontally scrollable chips for medication duration
// ---------------------------------------------------------------------------

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function DurationChips({ value, onChange }: Props) {
  const c = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {COMMON_DURATIONS.map((dur) => {
        const isActive = value === dur;
        return (
          <TouchableOpacity
            key={dur}
            style={[
              styles.chip,
              { backgroundColor: c.cardAlt, borderColor: c.border },
              isActive && { backgroundColor: c.brandBg, borderColor: c.brand },
            ]}
            activeOpacity={0.7}
            onPress={() => onChange(dur)}
          >
            <Text
              style={[
                styles.chipText,
                { color: c.textSecondary },
                isActive && { color: c.brand, fontWeight: '700' },
              ]}
            >
              {dur}
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
        value={COMMON_DURATIONS.includes(value) ? '' : value}
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
