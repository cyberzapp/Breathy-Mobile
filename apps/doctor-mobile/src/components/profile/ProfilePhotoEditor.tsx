import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { updatePersonalDetails, removeProfilePhoto } from '../../services/profileService';
import { supabase } from '../../lib/supabaseClient';
import { decode } from 'base64-arraybuffer';

// INDUSTRY STANDARD: Import the deterministic wrapper
import KeyboardAwareModal from '../ui/KeyboardAwareModal';
import WarningModal from '../ui/WarningModal';
import ErrorModal from '../ui/ErrorModal';
import ConfirmationModal from '../ui/ConfirmationModal';

const BRAND = '#22ae9e';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  currentPhoto?: string;
}

export default function ProfilePhotoEditor({ visible, onClose, onSuccess, currentPhoto }: Props) {
  const fetchProfile = useAuthStore((s) => s.fetchProfileStatus);
  const [previewUri, setPreviewUri] = useState<string | null>(currentPhoto || null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const pickImage = async (source: 'gallery' | 'camera') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      // 1. FIX: Request base64 string to bypass the fetch() bug
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, 
      };

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setWarningMessage('Camera permission is required to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setWarningMessage('Gallery permission is required to select a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        setSelectedAsset(asset);
      }
    } catch (err: any) {
      setErrorMessage('Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    // Ensure base64 data exists before attempting save
    if (!selectedAsset || !selectedAsset.base64) {
      setWarningMessage('Please select a new photo first.');
      return;
    }
    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error('Not authenticated.');

      const fileName = `${session.user.id}/${Date.now()}-profile.jpg`;
      const bucket = 'breathy-profile-pictures-public';

      // 2. FIX: Use decode(base64) to upload directly to Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, decode(selectedAsset.base64), {
          contentType: selectedAsset.mimeType || 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const newPhotoUrl = publicUrlData.publicUrl;

      await updatePersonalDetails({ profile_photo_url: newPhotoUrl });
      await fetchProfile(true);

      if (onSuccess) {
        onSuccess('Profile photo updated!');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage('Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = () => {
    setShowRemoveConfirm(true);
  };

  const doRemove = async () => {
    setShowRemoveConfirm(false);
    setIsRemoving(true);
    try {
      await removeProfilePhoto();
      await fetchProfile(true);
      if (onSuccess) {
        onSuccess('Profile photo removed.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage('Failed to remove photo. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const isProcessing = isSaving || isRemoving;

  return (
    <>
    <KeyboardAwareModal visible={visible} onClose={onClose} title="Edit Profile Photo">
      {/* Preview Area */}
      <View style={styles.previewArea}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="person-outline" size={48} color="#cbd5e1" />
            <Text style={styles.previewText}>Upload an image to begin</Text>
          </View>
        )}
      </View>

      {/* Pick Buttons */}
      <View style={styles.pickRow}>
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={() => pickImage('gallery')}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={20} color={BRAND} />
          <Text style={styles.pickBtnText}>
            {previewUri ? 'Choose New' : 'Select Image'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={() => pickImage('camera')}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={20} color={BRAND} />
          <Text style={styles.pickBtnText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.removeBtn, (!currentPhoto || isProcessing) && { opacity: 0.4 }]}
          onPress={handleRemove}
          disabled={!currentPhoto || isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.removeBtnText}>Remove Photo</Text>
        </TouchableOpacity>
        <View style={styles.footerRight}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isProcessing}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!selectedAsset || isProcessing) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!selectedAsset || isProcessing}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareModal>
    <WarningModal
      visible={!!warningMessage}
      message={warningMessage || ''}
      onClose={() => setWarningMessage(null)}
    />
    <ErrorModal
      visible={!!errorMessage}
      message={errorMessage || ''}
      onClose={() => setErrorMessage(null)}
    />
    <ConfirmationModal
      visible={showRemoveConfirm}
      title="Remove Profile Photo"
      message="Are you sure you want to permanently remove your profile photo?"
      confirmText="Yes, Remove"
      isDestructive={true}
      onCancel={() => setShowRemoveConfirm(false)}
      onConfirm={doRemove}
    />
  </>
  );
}

const styles = StyleSheet.create({
  previewArea: {
    marginBottom: 16,
    backgroundColor: '#f1f5f9', 
    borderRadius: 16,
    minHeight: 260, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: { width: 240, height: 240, borderRadius: 120 },
  previewPlaceholder: { alignItems: 'center', gap: 10 },
  previewText: { fontSize: 14, color: '#94a3b8' },

  pickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  pickBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  removeBtn: {},
  removeBtnText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  footerRight: { flexDirection: 'row', gap: 10 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, backgroundColor: BRAND },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});