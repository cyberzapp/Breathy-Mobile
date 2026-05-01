import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useBreathySounds } from '../../hooks/useBreathySounds';
import { checkPrescriptionSetupStatus } from '../../services/settingsService';
import DigitalPrescriptionForm from './DigitalPrescriptionForm';

// ---------------------------------------------------------------------------
// PrescriptionScreen — Mode toggle wrapper (Digital | Freehand)
// ---------------------------------------------------------------------------
// Includes a signature gate: if the doctor hasn't uploaded a signature,
// they're prompted to go to Prescription Settings first.
// ---------------------------------------------------------------------------

type Mode = 'digital' | 'freehand';

export default function PrescriptionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { playPop } = useBreathySounds();
  const [mode, setMode] = useState<Mode>('digital');

  // --- Setup Gate State ---
  const [isCheckingSettings, setIsCheckingSettings] = useState(true);
  const [hasSignature, setHasSignature] = useState(false);
  const [hasLocations, setHasLocations] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { hasSignature, hasLocations } = await checkPrescriptionSetupStatus();
        setHasSignature(hasSignature);
        setHasLocations(hasLocations);
      } catch {
        // If check fails (offline, etc.), allow access
        setHasSignature(true);
        setHasLocations(true);
      } finally {
        setIsCheckingSettings(false);
      }
    })();
  }, []);

  const handleFreehandPress = () => {
    playPop();
    navigation.navigate('FreehandCanvas');
  };

  const handleModeToggle = (newMode: Mode) => {
    if (newMode === mode) return;
    playPop();
    setMode(newMode);
    if (newMode === 'freehand') {
      handleFreehandPress();
    }
  };

  // --- Loading State ---
  if (isCheckingSettings) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.brand} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>
            Checking settings...
          </Text>
        </View>
      </View>
    );
  }

  // --- Setup Gate ---
  if (!hasSignature || !hasLocations) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>New Prescription</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Signature Required CTA */}
        <View style={styles.centerBox}>
          <View style={[styles.signatureGateCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.signatureIconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="warning-outline" size={40} color="#f59e0b" />
            </View>
            <Text style={[styles.signatureGateTitle, { color: c.text }]}>
              Setup Required
            </Text>
            <Text style={[styles.signatureGateDesc, { color: c.textSecondary }]}>
              {!hasSignature && !hasLocations 
                ? 'Please set up your digital signature and add at least one clinic location to generate prescriptions.' 
                : !hasSignature 
                  ? 'Your digital signature appears on all prescriptions. Please set it up before creating your first prescription.'
                  : 'Please add at least one clinic location to generate prescriptions.'}
            </Text>
            <TouchableOpacity
              style={[styles.signatureGateBtn, { backgroundColor: c.brand }]}
              activeOpacity={0.8}
              onPress={() => {
                playPop();
                navigation.navigate('PrescriptionSettings');
              }}
            >
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={styles.signatureGateBtnText}>Go to Prescription Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, padding: 8 }}
              onPress={() => navigation.goBack()}
            >
              <Text style={{ color: c.textTertiary, fontSize: 14, fontWeight: '500' }}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- Normal Prescription Screen ---
  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>New Prescription</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Mode Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={[styles.toggleBar, { backgroundColor: c.cardAlt }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === 'digital' && { backgroundColor: c.brand },
            ]}
            onPress={() => handleModeToggle('digital')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={mode === 'digital' ? '#fff' : c.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: c.textSecondary },
                mode === 'digital' && { color: '#fff' },
              ]}
            >
              Digital Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === 'freehand' && { backgroundColor: c.brand },
            ]}
            onPress={() => handleModeToggle('freehand')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color={mode === 'freehand' ? '#fff' : c.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: c.textSecondary },
                mode === 'freehand' && { color: '#fff' },
              ]}
            >
              Freehand
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <DigitalPrescriptionForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toggleBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // --- Loading & Signature Gate ---
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  signatureGateCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  signatureIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signatureGateTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  signatureGateDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  signatureGateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    borderRadius: 14,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signatureGateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
