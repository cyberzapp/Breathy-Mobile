import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface Props {
  open: boolean;
  patientName?: string;
}

const { width } = Dimensions.get('window');
const PAPER_WIDTH = Math.min(width * 0.8, 320);
const PAPER_HEIGHT = 450;

export default function PrescriptionBuildingLoader({ open, patientName = "Patient" }: Props) {
  const c = useColors();

  // Animation values
  const revealAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (open) {
      // Reset
      revealAnim.setValue(0);
      pulseAnim.setValue(0.5);

      // Reveal down animation (0 to 1 over 2.5s)
      Animated.timing(revealAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: false, // height animation requires false
      }).start();

      // Pulse animation for skeletons
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [open, revealAnim, pulseAnim]);

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.wrapper}>
          
          {/* Paper Container */}
          <View style={[styles.paperContainer, { borderColor: 'rgba(255,255,255,0.2)' }]}>
            
            {/* The Revealed Paper */}
            <Animated.View
              style={[
                styles.revealedPaper,
                {
                  height: revealAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, PAPER_HEIGHT],
                  }),
                  borderBottomColor: 'rgba(20, 184, 166, 0.4)',
                  borderBottomWidth: 2,
                },
              ]}
            >
              {/* Content Inside Paper */}
              <View style={styles.paperContent}>
                
                {/* Header Skeleton */}
                <View style={styles.headerRow}>
                  <Animated.View style={[styles.skeletonCircle, { opacity: pulseAnim }]} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Animated.View style={[styles.skeletonLine, { width: '60%', opacity: pulseAnim }]} />
                    <Animated.View style={[styles.skeletonLine, { width: '40%', height: 8, opacity: pulseAnim }]} />
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Patient Info */}
                <View style={styles.patientInfoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Patient</Text>
                    <Text style={styles.patientName}>{patientName || "Unknown"}</Text>
                    <Animated.View style={[styles.skeletonLine, { width: '80%', height: 6, opacity: pulseAnim }]} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Date</Text>
                    <Animated.View style={[styles.skeletonLine, { width: '60%', height: 6, marginTop: 4, opacity: pulseAnim }]} />
                  </View>
                </View>

                {/* Rx Symbol */}
                <Text style={styles.rxSymbol}>Rx</Text>

                {/* Medications Skeleton */}
                {[1, 2].map((_, idx) => (
                  <View key={idx} style={styles.medRow}>
                    <Animated.View style={[styles.skeletonDot, { opacity: pulseAnim }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Animated.View style={[styles.skeletonLine, { width: '70%', opacity: pulseAnim }]} />
                      <Animated.View style={[styles.skeletonLine, { width: '40%', height: 8, opacity: pulseAnim }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Scanner Line */}
            <Animated.View
              style={[
                styles.scannerLine,
                {
                  top: revealAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, PAPER_HEIGHT],
                  }),
                  opacity: revealAnim.interpolate({
                    inputRange: [0, 0.95, 1],
                    outputRange: [1, 1, 0],
                  }),
                },
              ]}
            />
          </View>

          {/* Text Below */}
          <Text style={styles.titleText}>Building Prescription...</Text>
          <Text style={styles.subText}>Generating secure PDF and notifying patient</Text>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: {
    alignItems: 'center',
    gap: 24,
  },
  paperContainer: {
    width: PAPER_WIDTH,
    height: PAPER_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  revealedPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  scannerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(20, 184, 166, 0.8)',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  paperContent: {
    padding: 24,
    width: PAPER_WIDTH,
    height: PAPER_HEIGHT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  divider: {
    height: 2,
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  patientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  rxSymbol: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  medRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  skeletonDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e2e8f0',
    marginTop: 2,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  subText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
