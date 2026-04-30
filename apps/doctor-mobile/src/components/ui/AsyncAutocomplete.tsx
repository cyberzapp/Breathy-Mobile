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
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  searchApi: (term: string) => Promise<any>;
  dataKey: string;
  placeholder?: string;
  style?: any;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function AsyncAutocomplete({
  value,
  onChangeText,
  searchApi,
  dataKey,
  placeholder,
  style,
  icon,
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
        // the API might return { data: [...] } or just [...]
        const response: any = await searchApi(value);
        const results = response?.data || response || [];
        
        if (!controller.signal.aborted && Array.isArray(results)) {
          // fuzzy search endpoints usually return { name: '...' }
          const items = results.map((r: any) => r[dataKey] || r.name || r).filter(Boolean);
          // deduplicate
          setOptions(Array.from(new Set(items)));
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
    <View style={[{ zIndex: showSuggestions ? 10 : 1, position: 'relative' }, style]}>
      <View style={[styles.inputWrapper, { backgroundColor: c.input, borderColor: value ? c.brand : c.borderMedium }]}>
        {icon && (
          <Ionicons name={icon} size={20} color={value ? c.brand : c.textTertiary} style={styles.icon} />
        )}
        <TextInput
          style={[
            styles.input,
            { color: c.text },
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
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={c.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

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
            {options.slice(0, 10).map((item, i) => (
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  dropdownName: {
    fontSize: 15,
  },
});
