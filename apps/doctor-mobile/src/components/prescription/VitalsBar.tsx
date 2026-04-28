import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

// ---------------------------------------------------------------------------
// VitalsBar — Compact horizontal vitals input strip
// ---------------------------------------------------------------------------

interface VitalsData {
  bp: string;
  pulse: string;
  spo2: string;
  temp: string;
  weight: string;
}

interface Props {
  vitals: VitalsData;
  onChange: (field: keyof VitalsData, value: string) => void;
}

const VITAL_FIELDS: {
  key: keyof VitalsData;
  label: string;
  placeholder: string;
  unit: string;
  icon: string;
  width: number;
}[] = [
  { key: 'bp', label: 'BP', placeholder: '120/80', unit: 'mmHg', icon: 'heart', width: 90 },
  { key: 'pulse', label: 'Pulse', placeholder: '80', unit: 'bpm', icon: 'pulse', width: 70 },
  { key: 'spo2', label: 'SpO₂', placeholder: '98', unit: '%', icon: 'water', width: 65 },
  { key: 'temp', label: 'Temp', placeholder: '98.6', unit: '°F', icon: 'thermometer', width: 70 },
  { key: 'weight', label: 'Weight', placeholder: '70', unit: 'kg', icon: 'fitness', width: 65 },
];

export default function VitalsBar({ vitals, onChange }: Props) {
  const c = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pulse-outline" size={16} color={c.brand} />
        <Text style={[styles.headerText, { color: c.text }]}>Vitals</Text>
      </View>
      <View style={styles.fieldsRow}>
        {VITAL_FIELDS.map((field) => (
          <View key={field.key} style={[styles.fieldWrap, { width: field.width }]}>
            <Text style={[styles.fieldLabel, { color: c.textTertiary }]}>
              {field.label}
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  backgroundColor: c.input,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
              value={vitals[field.key]}
              onChangeText={(v) => onChange(field.key, v)}
              placeholder={field.placeholder}
              placeholderTextColor={c.textTertiary}
              keyboardType={field.key === 'bp' ? 'default' : 'numeric'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldWrap: {},
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
  },
});
