import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { updatePersonalDetails } from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';

// INDUSTRY STANDARD: Import the deterministic wrapper
import KeyboardAwareModal from '../ui/KeyboardAwareModal';
import ErrorModal from '../ui/ErrorModal';

const BRAND = '#22ae9e';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  profile: any;
}

export default function PersonalDetailsEditModal({ visible, onClose, onSuccess, profile }: Props) {
  const fetchProfile = useAuthStore((s) => s.fetchProfileStatus);
  const [about, setAbout] = useState(profile?.about || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePersonalDetails({
        about: about,
        profile_photo_url: profile?.profile_photo_url,
      });
      await fetchProfile(true);
      
      if (onSuccess) {
        onSuccess('Details updated successfully!');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage('Failed to update details. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <KeyboardAwareModal visible={visible} onClose={onClose} title="Edit Personal Details">
      {/* About Me / Bio */}
      <Text style={styles.label}>About Me / Bio</Text>
      <TextInput
        style={styles.textArea}
        value={about}
        onChangeText={setAbout}
        placeholder="Write a brief bio about yourself, your experience, and your practice..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        autoCorrect={false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveText}>Save Details</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareModal>
    <ErrorModal
      visible={!!errorMessage}
      message={errorMessage || ''}
      onClose={() => setErrorMessage(null)}
    />
  </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 10 },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#fafafa',
    minHeight: 200,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: BRAND, alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});