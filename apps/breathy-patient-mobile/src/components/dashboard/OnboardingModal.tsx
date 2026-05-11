import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';

/**
 * OnboardingModal — Replicates web's OnboardingModal component.
 * 
 * Shown to new users (or users whose full_name is missing/equals their phone).
 * Asks for full name, then calls authStore.completeOnboarding() which
 * hits the backend's POST /api/patient-data/profile/claim endpoint.
 */
export default function OnboardingModal() {
  const c = useColors();
  const { completeOnboarding } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await completeOnboarding(trimmed);
    } catch (err: any) {
      console.error('[Onboarding] Failed:', err.message);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.card, { backgroundColor: c.card }]}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: c.brandBg }]}>
            <Ionicons name="person-add" size={28} color={c.brand} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: c.text }]}>
            Welcome to Breathy!
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Let's get your profile started.{'\n'}What's your full name?
          </Text>

          {/* Error */}
          {error !== '' && (
            <View style={[styles.errorBanner, { backgroundColor: c.errorBg }]}>
              <Ionicons name="alert-circle" size={16} color={c.error} />
              <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
            </View>
          )}

          {/* Input */}
          <TextInput
            style={[styles.input, {
              color: c.text,
              borderColor: c.border,
              backgroundColor: c.input,
            }]}
            placeholder="Enter your full name"
            placeholderTextColor={c.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: c.brand },
              (isSaving || !fullName.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSaving || !fullName.trim()}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save and Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    width: '100%',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
