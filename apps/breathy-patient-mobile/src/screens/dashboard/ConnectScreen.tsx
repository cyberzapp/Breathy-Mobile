import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

export default function ConnectScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.borderMedium }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.title, { color: c.text }]}>Connect Hub</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.delay(100)} style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Upcoming Appointments</Text>
          <Text style={{ color: c.textTertiary, marginTop: 8 }}>No upcoming appointments</Text>
        </Animated.View>
        
        <Pressable onPress={() => navigation.navigate('ChatList' as never)}>
          <Animated.View entering={FadeInUp.delay(200)} style={[styles.section, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Active Chats</Text>
            <Text style={{ color: c.textTertiary, marginTop: 8 }}>View your conversations</Text>
          </Animated.View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  section: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  }
});
