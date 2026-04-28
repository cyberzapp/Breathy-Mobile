import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import type { DrugOption } from '../../services/prescriptionService';

// ---------------------------------------------------------------------------
// MedicationRow — Single medication entry with drug autocomplete, strength,
//                  frequency chips, duration chips, and notes.
// ---------------------------------------------------------------------------

interface MedicationData {
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  notes: string;
  generic_name: string;
}

interface Props {
  index: number;
  data: MedicationData;
  onChange: (index: number, field: keyof MedicationData, value: string) => void;
  onRemove: (index: number) => void;
  drugOptions: DrugOption[];
  drugSearchTerm: string;
  onDrugSearchChange: (term: string) => void;
  isSearching: boolean;
}

export default function MedicationRow({
  index,
  data,
  onChange,
  onRemove,
  drugOptions,
  drugSearchTerm,
  onDrugSearchChange,
  isSearching,
}: Props) {
  const c = useColors();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const handleDrugSelect = useCallback(
    (drug: DrugOption) => {
      onChange(index, 'name', drug.brand_name);
      onChange(index, 'strength', drug.strength || '');
      onChange(index, 'generic_name', drug.generic_name || '');
      setShowSuggestions(false);
      Keyboard.dismiss();
    },
    [index, onChange]
  );

  const handleNameChange = useCallback(
    (text: string) => {
      onChange(index, 'name', text);
      onDrugSearchChange(text);
      setShowSuggestions(text.length >= 1);
    },
    [index, onChange, onDrugSearchChange]
  );

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Header: Drug number + remove button */}
      <View style={styles.cardHeader}>
        <View style={[styles.medBadge, { backgroundColor: c.brandBg }]}>
          <Text style={[styles.medBadgeText, { color: c.brand }]}>Rx {index + 1}</Text>
        </View>
        {data.generic_name ? (
          <Text style={[styles.genericLabel, { color: c.textTertiary }]} numberOfLines={1}>
            {data.generic_name}
          </Text>
        ) : null}
        <TouchableOpacity onPress={() => onRemove(index)} style={styles.removeBtn}>
          <Ionicons name="close-circle" size={22} color={c.error} />
        </TouchableOpacity>
      </View>

      {/* Drug name input with autocomplete */}
      <View style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={[
              styles.input,
              styles.nameInput,
              { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text },
            ]}
            value={data.name}
            onChangeText={handleNameChange}
            placeholder="Drug name..."
            placeholderTextColor={c.textTertiary}
            onFocus={() => setShowSuggestions(data.name.length >= 1)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          {/* Autocomplete Dropdown */}
          {showSuggestions && (drugOptions.length > 0 || isSearching) && (
            <View style={[styles.dropdown, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
              {isSearching && (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="small" color={c.brand} />
                  <Text style={[styles.dropdownLoadingText, { color: c.textTertiary }]}>
                    Searching...
                  </Text>
                </View>
              )}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 200 }}
              >
                {drugOptions.slice(0, 8).map((item, i) => (
                  <TouchableOpacity
                    key={`${item.brand_name}-${i}`}
                    style={[styles.dropdownItem, { borderBottomColor: c.border }]}
                    onPress={() => handleDrugSelect(item)}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.dropdownName, { color: c.text }]} numberOfLines={1}>
                      {item.brand_name}
                    </Text>
                    <Text style={[styles.dropdownMeta, { color: c.textTertiary }]} numberOfLines={1}>
                      {item.generic_name}
                      {item.strength ? ` • ${item.strength}` : ''}
                      {item.form ? ` • ${item.form}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Strength */}
        <TextInput
          style={[
            styles.input,
            styles.strengthInput,
            { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text },
          ]}
          value={data.strength}
          onChangeText={(v) => onChange(index, 'strength', v)}
          placeholder="Strength"
          placeholderTextColor={c.textTertiary}
        />
      </View>

      {/* Expand/collapse toggle for details */}
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={showDetails ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={c.textTertiary}
        />
        <Text style={[styles.toggleText, { color: c.textTertiary }]}>
          {showDetails ? 'Hide details' : 'Show details'}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <>
          <View style={styles.freqDurRow}>
            {/* Frequency */}
            <View style={styles.freqDurCol}>
              <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>Frequency</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text, marginBottom: 8 },
                ]}
                value={data.frequency}
                onChangeText={(v) => onChange(index, 'frequency', v)}
                placeholder="e.g. 1-0-1 or type your own"
                placeholderTextColor={c.textTertiary}
              />
              <View style={styles.chipContainer}>
                {['1-0-1', '1-1-1', '1-0-0', '0-0-1', 'SOS', 'Stat'].map((freq) => {
                  const isActive = data.frequency === freq;
                  return (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.quickChip,
                        { backgroundColor: c.cardAlt, borderColor: c.border },
                        isActive && { backgroundColor: c.brandBg, borderColor: c.brand },
                      ]}
                      onPress={() => onChange(index, 'frequency', freq)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          { color: c.textSecondary },
                          isActive && { color: c.brand, fontWeight: '700' },
                        ]}
                      >
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.freqDurCol}>
              <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>Duration</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text, marginBottom: 8 },
                ]}
                value={data.duration}
                onChangeText={(v) => onChange(index, 'duration', v)}
                placeholder="e.g. 5 Days or type your own"
                placeholderTextColor={c.textTertiary}
              />
              <View style={styles.chipContainer}>
                {['3 Days', '5 Days', '1 Week', '2 Weeks', '1 Month', 'Continue'].map((dur) => {
                  const isActive = data.duration === dur;
                  return (
                    <TouchableOpacity
                      key={dur}
                      style={[
                        styles.quickChip,
                        { backgroundColor: c.cardAlt, borderColor: c.border },
                        isActive && { backgroundColor: c.brandBg, borderColor: c.brand },
                      ]}
                      onPress={() => onChange(index, 'duration', dur)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          { color: c.textSecondary },
                          isActive && { color: c.brand, fontWeight: '700' },
                        ]}
                      >
                        {dur}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Notes / Instructions */}
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              { backgroundColor: c.input, borderColor: c.border, color: c.text },
            ]}
            value={data.notes}
            onChangeText={(v) => onChange(index, 'notes', v)}
            placeholder="Instructions (e.g., After meals)"
            placeholderTextColor={c.textTertiary}
            multiline
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  medBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  genericLabel: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  removeBtn: {
    padding: 2,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  nameInput: {
    height: 42,
    flex: 1,
  },
  strengthInput: {
    height: 42,
    width: 90,
  },
  notesInput: {
    minHeight: 40,
    paddingVertical: 10,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 100,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownLoadingText: {
    fontSize: 13,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freqDurRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  freqDurCol: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
