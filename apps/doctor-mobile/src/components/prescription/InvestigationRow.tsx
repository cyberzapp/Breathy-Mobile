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
import type { TestOption } from '../../services/prescriptionService';

// ---------------------------------------------------------------------------
// InvestigationRow — Single investigation entry with test autocomplete
// ---------------------------------------------------------------------------

interface Props {
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  testOptions: TestOption[];
  testSearchTerm: string;
  onTestSearchChange: (term: string) => void;
  isSearching: boolean;
}

export default function InvestigationRow({
  index,
  value,
  onChange,
  onRemove,
  testOptions,
  testSearchTerm,
  onTestSearchChange,
  isSearching,
}: Props) {
  const c = useColors();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleTestSelect = useCallback(
    (test: TestOption) => {
      onChange(index, test.test_name);
      setShowSuggestions(false);
      Keyboard.dismiss();
    },
    [index, onChange]
  );

  const handleNameChange = useCallback(
    (text: string) => {
      onChange(index, text);
      onTestSearchChange(text);
      setShowSuggestions(text.length >= 1);
    },
    [index, onChange, onTestSearchChange]
  );

  return (
    <View style={[styles.container, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flex: 1 }}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text },
          ]}
          value={value}
          onChangeText={handleNameChange}
          placeholder="Test name (e.g., CBC, HbA1c)"
          placeholderTextColor={c.textTertiary}
          onFocus={() => setShowSuggestions(value.length >= 1)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />

        {/* Autocomplete Dropdown */}
        {showSuggestions && (testOptions.length > 0 || isSearching) && (
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
              {testOptions.slice(0, 8).map((item, i) => (
                <TouchableOpacity
                  key={`${item.test_name}-${i}`}
                  style={[styles.dropdownItem, { borderBottomColor: c.border }]}
                  onPress={() => handleTestSelect(item)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.dropdownName, { color: c.text }]} numberOfLines={1}>
                    {item.test_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={() => onRemove(index)} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={22} color={c.error} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 46,
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
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
  },
});
