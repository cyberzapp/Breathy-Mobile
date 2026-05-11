import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FileText, ChevronRight } from 'lucide-react-native';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function AiReportWidget({ onPress }: { onPress: () => void }) {
  const c = useColors();

  return (
    <Animated.View entering={FadeInUp.delay(100)} style={[styles.card, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: c.brandBg }]}>
          <FileText color={c.brand} size={24} />
        </View>
        <View style={styles.textBox}>
          <Text style={[styles.title, { color: c.text }]}>AI Report Analyzer</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>Understand your lab results instantly</Text>
        </View>
      </View>
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          styles.btn, 
          { backgroundColor: c.bg, borderColor: c.borderMedium },
          pressed && { opacity: 0.7 }
        ]}
      >
        <Text style={[styles.btnText, { color: c.brandDark }]}>Upload New Report</Text>
        <ChevronRight color={c.brandDark} size={16} />
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    padding: 12,
    borderRadius: 16,
    marginRight: 16,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  }
});
