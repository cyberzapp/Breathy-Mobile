import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { emrService } from '../../services/emrService';

interface HealthRecordUploaderModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HealthRecordUploaderModal({
  visible,
  patientId,
  onClose,
  onSuccess,
}: HealthRecordUploaderModalProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [recordType, setRecordType] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No File', 'Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const uploadResult = await emrService.uploadHealthRecordFile({
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      });

      // 2. Create DB Record
      await emrService.createHealthRecord({
        patient_id: patientId,
        storage_path: uploadResult.storage_path,
        file_name: uploadResult.file_name,
        mime_type: uploadResult.mime_type,
        file_size: selectedFile.size || 0,
        record_type: recordType || 'uncategorized',
      });

      onSuccess();
      setRecordType('');
      setSelectedFile(null);
      onClose();
    } catch (error: any) {
      console.error('Error uploading health record:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload the file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>Upload Health Record</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.content}>
          <TouchableOpacity 
            style={[styles.filePickerButton, { borderColor: c.brand, backgroundColor: c.brandBg }]} 
            onPress={handlePickFile}
          >
            <Ionicons name="document-attach" size={32} color={c.brand} style={{ marginBottom: 8 }} />
            <Text style={{ color: c.brand, fontWeight: '600' }}>
              {selectedFile ? selectedFile.name : 'Tap to select a file'}
            </Text>
            {selectedFile && selectedFile.size && (
              <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 4 }}>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textSecondary }]}>Record Type / Category</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              value={recordType}
              onChangeText={setRecordType}
              placeholder="e.g. Lab Report, Scan, Prescription"
              placeholderTextColor={c.textTertiary}
            />
          </View>

          <View style={styles.spacer} />

          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: selectedFile ? c.brand : c.textTertiary }]}
            onPress={handleUpload}
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.bottomButtonText}>Upload File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filePickerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  spacer: {
    flex: 1,
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  bottomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
