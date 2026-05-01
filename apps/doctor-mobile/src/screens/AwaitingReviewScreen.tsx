// ---------------------------------------------------------------------------
// AwaitingReviewScreen — Shown after profile submission
// ---------------------------------------------------------------------------
// Mirrors web's PendingApprovalPage from App.jsx but with a richer,
// mobile-native experience. Gives the doctor confidence that their
// profile is being reviewed and lets them explore app features.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';

export default function AwaitingReviewScreen() {
  const c = useColors();

  // Subtle pulse animation on the checkmark circle
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous gentle pulse on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleExploreFeatures = () => {
    Linking.openURL('https://www.breathy.in/for-doctors');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.iconCircle,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.iconInner}>
            <Ionicons name="checkmark-done" size={44} color="#fff" />
          </View>
        </Animated.View>

        {/* Main Message */}
        <Text style={[styles.title, { color: c.text }]}>
          Profile Submitted!
        </Text>

        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Your profile has been submitted for verification. Our team will review
          it shortly and approve it.
        </Text>

        {/* Info Cards */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.borderMedium }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: c.text }]}>We'll Notify You</Text>
              <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
                You'll receive a notification as soon as your profile is approved.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: '#ccfbf1' }]}>
              <Ionicons name="time-outline" size={20} color="#14b8a6" />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Quick Review</Text>
              <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
                Most profiles are approved within 24 hours. Your convenience is our first priority.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#f59e0b" />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Verified Badge</Text>
              <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
                Once approved, you'll receive a verified badge on your public profile.
              </Text>
            </View>
          </View>
        </View>

        {/* Explore CTA */}
        <View style={styles.ctaSection}>
          <Text style={[styles.ctaLabel, { color: c.textTertiary }]}>
            In the meantime
          </Text>

          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={handleExploreFeatures}
            activeOpacity={0.85}
          >
            <Ionicons name="rocket-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.exploreBtnText}>Explore App Features</Text>
            <Ionicons name="open-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  iconCircle: {
    marginBottom: 28,
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
