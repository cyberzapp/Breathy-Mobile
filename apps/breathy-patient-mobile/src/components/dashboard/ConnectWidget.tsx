import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MessageCircle, CalendarClock, ChevronRight } from 'lucide-react-native';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function ConnectWidget({ onPress }: { onPress: () => void }) {
  const c = useColors();

  return (
    <Animated.View entering={FadeInUp.delay(200)}>
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          styles.card, 
          { backgroundColor: c.card, borderColor: c.borderMedium },
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: c.text }]}>Connect Hub</Text>
            <ChevronRight color={c.textTertiary} size={20} />
          </View>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Manage appointments & chat with your doctors
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: c.bg }]}>
            <CalendarClock color={c.brand} size={20} />
            <Text style={[styles.statText, { color: c.textSecondary }]}>Appointments</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.bg }]}>
            <MessageCircle color={c.brand} size={20} />
            <Text style={[styles.statText, { color: c.textSecondary }]}>Chats</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  }
});
