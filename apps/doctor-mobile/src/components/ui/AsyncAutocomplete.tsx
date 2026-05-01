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
  Dimensions,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (item: any) => void; // <--- NEW: Allows parent to catch the full object/ID
  searchApi: (term: string) => Promise<any>;
  dataKey: string;
  placeholder?: string;
  style?: any;
  icon?: keyof typeof Ionicons.glyphMap;
  dropdownDirection?: 'up' | 'down';
}

export default function AsyncAutocomplete({
  value,
  onChangeText,
  onSelect, // <--- Destructure new prop
  searchApi,
  dataKey,
  placeholder,
  style,
  icon,
  dropdownDirection = 'down',
  ...rest
}: Props) {
  const c = useColors();
  const [showSuggestions, setShowSuggestions] = useState(false);
  // <--- CHANGED: Store objects instead of flat strings --->
  const [options, setOptions] = useState<any[]>([]); 
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const viewRef = useRef<View>(null);
  const [dynamicDirection, setDynamicDirection] = useState<'up' | 'down'>(dropdownDirection);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const measureAndSetDirection = () => {
    if (dropdownDirection) {
      setDynamicDirection(dropdownDirection);
    }
    viewRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const windowHeight = Dimensions.get('window').height;
      const spaceBelow = windowHeight - pageY - height - keyboardHeight;
      const spaceAbove = pageY;

      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setDynamicDirection('up');
      } else {
        setDynamicDirection('down');
      }
    });
  };

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
        const response: any = await searchApi(value);
        const results = response?.data || response || [];

        if (!controller.signal.aborted && Array.isArray(results)) {
          // <--- CHANGED: Retain the ID and the raw object --->
          let items = results.map((r: any) => {
            if (typeof r === 'string') return { id: r, name: r, raw: r };
            
            const name = r[dataKey] || r.name || r.specialty || r.degrees || r.council_name || r.title || 'Unknown';
            const id = r.id || r.value || name; // Safely grab the UUID
            
            return { id, name, raw: r };
          }).filter((item: any) => item.name && item.name !== 'Unknown');

          setOptions(items);
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

  // <--- CHANGED: Handle full object selection --->
  const handleSelect = useCallback(
    (selectedItem: any) => {
      onChangeText(selectedItem.name); // Keep UI showing the friendly name
      if (onSelect) {
        onSelect(selectedItem); // Pass the full object (with ID) to the parent
      }
      setShowSuggestions(false);
      Keyboard.dismiss();
    },
    [onChangeText, onSelect]
  );

  return (
    <View
      ref={viewRef}
      style={[{ zIndex: showSuggestions ? 100 : 1, position: 'relative' }, style]}
    >
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
          onFocus={() => {
            setShowSuggestions(value.length >= 2);
            measureAndSetDirection();
          }}
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
        <View style={[
          styles.dropdown,
          { backgroundColor: c.card, borderColor: c.borderMedium },
          dynamicDirection === 'up' ? styles.dropdownUp : styles.dropdownDown
        ]}>
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
                key={`${item.id}-${i}`}
                style={[styles.dropdownItem, { borderBottomColor: c.border }]}
                onPress={() => handleSelect(item)} // <--- Passes the object
                activeOpacity={0.6}
              >
                <Text style={[styles.dropdownName, { color: c.text }]} numberOfLines={1}>
                  {item.name}
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
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownDown: {
    marginTop: 8,
  },
  dropdownUp: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    marginBottom: 8,
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