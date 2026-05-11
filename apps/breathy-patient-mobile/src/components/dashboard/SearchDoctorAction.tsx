import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useColors } from '../../hooks/useColors';

export default function SearchDoctorAction({ onPress }: { onPress: () => void }) {
  const c = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.95))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
    >
      <Animated.View style={[styles.container, animatedStyle, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
        <View style={[styles.iconContainer, { backgroundColor: c.brandBg }]}>
          <Search color={c.brand} size={20} />
        </View>
        <Text style={[styles.text, { color: c.textTertiary }]}>Search doctors, specialties...</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});
