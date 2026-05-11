import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function BookingSuccessScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();

  const { appointmentId, date, time, doctorName } = route.params || {};

  // Prevent going back to the booking flow
  useEffect(() => {
    const onBackPress = () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleViewAppointments = () => {
    navigation.reset({
      index: 0,
      routes: [
        { 
          name: 'MainTabs', 
          state: {
            routes: [{ name: 'Appointments' }]
          }
        }
      ],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.iconContainer}>
          <View style={[styles.circle, { backgroundColor: 'rgba(34, 174, 158, 0.1)' }]}>
            <Ionicons name="checkmark-circle" size={100} color={c.brand} />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(400)} style={[styles.title, { color: c.text }]}>
          Booking Confirmed!
        </Animated.Text>
        
        <Animated.Text entering={FadeInDown.delay(500)} style={[styles.subtitle, { color: c.textSecondary }]}>
          Your appointment has been successfully scheduled.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(600)} style={[styles.detailsCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Doctor</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>Dr. {doctorName || 'Doctor'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>{date || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color={c.textTertiary} style={styles.detailIcon} />
            <View>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Time</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>{time || 'N/A'}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(800)} style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: c.brand }]}
          onPress={handleViewAppointments}
        >
          <Text style={styles.primaryButtonText}>View My Appointments</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: c.border }]}
          onPress={handleDone}
        >
          <Text style={[styles.secondaryButtonText, { color: c.text }]}>Back to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 32,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  footer: {
    padding: 24,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
