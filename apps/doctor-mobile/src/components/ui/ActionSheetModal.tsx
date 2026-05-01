import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useColors } from '../../hooks/useColors';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onCancel: () => void;
  cancelText?: string;
}

export default function ActionSheetModal({
  visible,
  title,
  message,
  options,
  onCancel,
  cancelText = 'Cancel',
}: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            styles.sheetContainer,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 },
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.mainGroup, { backgroundColor: c.card }]}>
            {(title || message) && (
              <View style={[styles.header, { borderBottomColor: c.border }]}>
                {title && <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>}
                {message && <Text style={[styles.message, { color: c.textTertiary }]}>{message}</Text>}
              </View>
            )}
            
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionBtn,
                  index < options.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: c.border }
                ]}
                onPress={() => {
                  onCancel(); // Close first
                  setTimeout(option.onPress, 10); // Then trigger action
                }}
              >
                <Text style={[
                  styles.optionText, 
                  option.isDestructive ? { color: '#ef4444' } : { color: '#3b82f6' }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.cancelBtn, { backgroundColor: c.card }]} 
            onPress={onCancel}
          >
            <Text style={[styles.cancelText, { color: '#3b82f6' }]}>{cancelText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  sheetContainer: {
    paddingHorizontal: 16,
    width: '100%',
  },
  mainGroup: {
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
  },
  optionBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '400',
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
