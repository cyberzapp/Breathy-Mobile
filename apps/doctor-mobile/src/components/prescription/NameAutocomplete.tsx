import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TextInputProps,
} from 'react-native';
import { useColors } from '../../hooks/useColors';

interface Props extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  searchApi: (term: string) => Promise<{ name?: string; surname?: string }[]>;
  dataKey: 'name' | 'surname';
  placeholder?: string;
  style?: any;
}

export default function NameAutocomplete({
  value,
  onChangeText,
  searchApi,
  dataKey,
  placeholder,
  style,
  ...rest
}: Props) {
  const c = useColors();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce API calls
  useEffect(() => {
    if (value.length < 2) {
      setOptions([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchApi(value);
        if (!controller.signal.aborted && Array.isArray(results)) {
          const names = results.map((r) => r[dataKey] || '').filter(Boolean);
          setOptions(names);
        }
      } catch (err) {
        if (!controller.signal.aborted) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, searchApi, dataKey]);

  const handleSelect = useCallback(
    (selected: string) => {
      onChangeText(selected);
      setShowSuggestions(false);
      Keyboard.dismiss();
    },
    [onChangeText]
  );

  return (
    <View style={[{ zIndex: showSuggestions ? 10 : 1 }, style]}>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text },
        ]}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setShowSuggestions(text.length >= 2);
        }}
        onFocus={() => setShowSuggestions(value.length >= 2)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        {...rest}
      />

      {showSuggestions && (options.length > 0 || isSearching) && (
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
            {options.slice(0, 5).map((item, i) => (
              <TouchableOpacity
                key={`${item}-${i}`}
                style={[styles.dropdownItem, { borderBottomColor: c.border }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.6}
              >
                <Text style={[styles.dropdownName, { color: c.text }]} numberOfLines={1}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
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
    fontSize: 15,
  },
});
