import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import ErrorModal from '../../components/ui/ErrorModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import NotificationModal from '../../components/ui/NotificationModal';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getHealthRecords, deleteHealthRecord, getRecordUploadUrl, createRecordMetadata, updateHealthRecord, getRecordDownloadUrl } from '../../services/patientService';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, TextInput } from 'react-native';

export default function HealthRecordsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New action states
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getHealthRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load health records', error, { source: 'HealthRecordsScreen' });
      setErrorMessage('Could not load your medical records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteHealthRecord(deleteConfirm);
      setRecords(prev => prev.filter(r => r.id !== deleteConfirm));
    } catch (e) {
      console.error('Failed to delete record', e, { source: 'HealthRecordsScreen' });
      setErrorMessage('Could not delete the record.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      
      // 5MB limit
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        setErrorMessage('File is too large. Max size is 5MB.');
        return;
      }

      setIsUploading(true);
      
      const fileName = asset.name || 'document.pdf';
      const fileType = asset.mimeType || 'application/octet-stream';

      // 1. Get pre-signed URL from Supabase
      const { signedUrl, storagePath, token } = (await getRecordUploadUrl({
        fileName,
        fileType,
      })) as any;

      // 2. Upload binary to Supabase using legacy FileSystem bridge
      const uploadResult = await FileSystem.uploadAsync(signedUrl, asset.uri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': fileType,
          'Authorization': `Bearer ${token}`
        },
      });

      if (uploadResult.status !== 200) {
        throw new Error('Failed to upload file to storage bucket');
      }

      // 3. Create database metadata entry
      await createRecordMetadata({
        storage_path: storagePath,
        file_name: fileName,
        mime_type: fileType,
        file_size: asset.size || 0,
        record_type: 'uncategorized',
      });

      setNoticeMessage('Record uploaded successfully!');
      fetchRecords();

    } catch (error: any) {
      console.error('Upload failed', error);
      
      // Check for Premium Limit Errors specifically to match web behavior
      const status = error.response?.status; 
      const errorData = error.response?.data;
      const isLimitError = status === 403 || 
                           error.message?.includes('LIMIT_REACHED') ||
                           errorData?.error === 'LIMIT_REACHED';

      if (isLimitError) {
        setErrorMessage('You have reached the maximum number of health records allowed on your current plan. Please upgrade to premium.');
      } else {
        setErrorMessage('Failed to upload medical record. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingRecordId(id);
    setNewName(currentName);
  };

  const handleSaveRename = async () => {
    if (!editingRecordId) return;
    if (newName.trim() === '') {
      setErrorMessage('File name cannot be empty.');
      return;
    }
    
    setIsRenaming(true);
    try {
      await updateHealthRecord(editingRecordId, { file_name: newName.trim() });
      setRecords(prev => prev.map(r => r.id === editingRecordId ? { ...r, title: newName.trim(), file_name: newName.trim() } : r));
      setEditingRecordId(null);
    } catch (error) {
      console.error('Rename failed', error);
      setErrorMessage('Could not rename record.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleView = async (id: string, fileName: string) => {
    try {
      const response: any = await getRecordDownloadUrl(id);
      if (!response?.downloadUrl) throw new Error('No URL');
      
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloadResult = await FileSystem.downloadAsync(response.downloadUrl, fileUri);
      
      if (downloadResult.status === 200) {
        if (Platform.OS === 'android') {
          const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
          });
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri);
          } else {
            Linking.openURL(response.downloadUrl);
          }
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (e) {
      console.error('View error', e);
      setErrorMessage('Could not open record.');
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    setIsDownloading(id);
    try {
      const response: any = await getRecordDownloadUrl(id);
      if (!response?.downloadUrl) throw new Error('No URL');
      
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const downloadResult = await FileSystem.downloadAsync(response.downloadUrl, fileUri);
      
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          setNoticeMessage('File saved to app documents.');
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error', error);
      setErrorMessage('Could not download file.');
    } finally {
      setIsDownloading(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isEditing = editingRecordId === item.id;
    const title = item.file_name || item.title || 'Untitled Document';

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={item.record_type === 'lab_result' ? 'flask' : 'document-text'} 
              size={24} 
              color={c.brand} 
            />
          </View>
          
          <View style={styles.infoContainer}>
            {isEditing ? (
              <TextInput
                style={[styles.renameInput, { color: c.text, borderColor: c.brand }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                onSubmitEditing={handleSaveRename}
                editable={!isRenaming}
              />
            ) : (
              <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
            )}
            <Text style={[styles.date, { color: c.textSecondary }]}>
              {dayjs(item.record_date || item.created_at).format('MMM D, YYYY')} • {(item.file_size / 1024 / 1024).toFixed(2)} MB
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={() => setEditingRecordId(null)} style={styles.actionBtn}>
                <Ionicons name="close" size={20} color={c.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveRename} disabled={isRenaming} style={styles.actionBtn}>
                {isRenaming ? <ActivityIndicator size="small" color={c.brand} /> : <Ionicons name="checkmark" size={20} color={c.brand} />}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => handleView(item.id, title)} style={styles.actionBtn}>
                <Ionicons name="eye-outline" size={20} color={c.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleStartRename(item.id, title)} style={styles.actionBtn}>
                <Ionicons name="pencil-outline" size={20} color={c.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDownload(item.id, title)} disabled={isDownloading === item.id} style={styles.actionBtn}>
                {isDownloading === item.id ? <ActivityIndicator size="small" color={c.brand} /> : <Ionicons name="download-outline" size={20} color={c.textSecondary} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={20} color={c.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Medical Records</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={48} color={c.textTertiary} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No medical records found.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB for uploading new record */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: c.brand, bottom: insets.bottom + 20 }]}
        onPress={handleFileUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="add" size={30} color="#fff" />
        )}
      </TouchableOpacity>

      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
      <ConfirmationModal
        visible={!!deleteConfirm}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
        isDestructive={true}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
      <NotificationModal
        visible={!!noticeMessage}
        title="Upload"
        message={noticeMessage || ''}
        onClose={() => setNoticeMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  listContent: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 174, 158, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  renameInput: {
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: 2,
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 12,
    paddingTop: 8,
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
