import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { WebView } from 'react-native-webview';
import { useColors } from '../../hooks/useColors';
import { useBreathySounds } from '../../hooks/useBreathySounds';
import {
  getRecentPrescriptions,
  fetchPrescriptionById,
  sendPrescriptionEmail,
  getPrescriptionEmailDetails,
} from '../../services/prescriptionService';
import SuccessModal from '../ui/SuccessModal';
import ErrorModal from '../ui/ErrorModal';

// ---------------------------------------------------------------------------
// RecentPrescriptionsWidget — Floating bottom-sheet with 5 action buttons
// ---------------------------------------------------------------------------
// Triggered by long-press on the Prescription icon in HomeScreen.
// Actions (matching web PrescriptionWidget.jsx):
//   1. 👁  View PDF    — In-app WebView PDF viewer
//   2. 📥 Download    — Downloads to device via legacy FileSystem API
//   3. 🖨  Print       — Native print dialog via expo-print
//   4. 📧 Email       — Email modal (matches web's email flow)
//   5. 📤 Share       — Native share sheet (WhatsApp, etc.)
// ---------------------------------------------------------------------------

interface RecentPrescriptionsWidgetProps {
  visible: boolean;
  onClose: () => void;
}

interface PrescriptionItem {
  id: string;
  diagnosis: string;
  created_at: string;
  patients?: { full_name?: string };
  download_url?: string;
}

export default function RecentPrescriptionsWidget({
  visible,
  onClose,
}: RecentPrescriptionsWidgetProps) {
  const c = useColors();
  const { playPop, playSuccess, playError } = useBreathySounds();
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PrescriptionItem | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // --- PDF Viewer State ---
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // --- Email Modal State ---
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Fetch recent prescriptions on mount ---
  useEffect(() => {
    if (!visible) return;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getRecentPrescriptions();
        setPrescriptions(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch {
        setPrescriptions([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [visible]);

  // --- Get PDF URL for a prescription ---
  const getPdfUrl = useCallback(async (item: PrescriptionItem): Promise<string> => {
    if (item.download_url) return item.download_url;
    const detail: any = await fetchPrescriptionById(item.id);
    if (!detail?.download_url) throw new Error('PDF URL not found.');
    return detail.download_url;
  }, []);

  // --- 1. View PDF (In-App WebView) ---
  const handleView = useCallback(async (item: PrescriptionItem) => {
    setActiveItemId(item.id);
    try {
      const url = await getPdfUrl(item);
      playPop();
      setPdfViewerUrl(url);
      setShowPdfViewer(true);
    } catch (err: any) {
      playError();
      setErrorMessage('Could not open prescription. Please try again.');
    } finally {
      setActiveItemId(null);
    }
  }, [getPdfUrl, playPop, playError]);

  // --- 2. Download PDF to device ---
  const handleDownload = useCallback(async () => {
    if (!selectedItem || isBusy) return;
    setIsBusy(true);
    try {
      const url = await getPdfUrl(selectedItem);
      const patientName = selectedItem.patients?.full_name?.replace(/\s+/g, '_') || 'Patient';
      const fileName = `Prescription_${patientName}_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const result = await FileSystem.downloadAsync(url, fileUri);
      if (result.status !== 200) throw new Error('Download failed.');

      playSuccess();
      setSuccessMessage(`Downloaded as ${fileName}`);
      // Also offer to share the file
      Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' });
      setShowActions(false);
    } catch (err: any) {
      playError();
      setErrorMessage('Could not download prescription. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }, [selectedItem, isBusy, getPdfUrl, playSuccess, playError]);

  // --- 3. Print (download PDF locally then open native print dialog) ---
  const handlePrint = useCallback(async () => {
    if (!selectedItem || isBusy) return;
    setIsBusy(true);
    try {
      const url = await getPdfUrl(selectedItem);
      const fileUri = FileSystem.cacheDirectory + 'print_prescription.pdf';

      const result = await FileSystem.downloadAsync(url, fileUri);
      if (result.status !== 200) throw new Error('Download for print failed.');

      playPop();
      await Print.printAsync({ uri: result.uri });
      playSuccess();
      setShowActions(false);
    } catch (err: any) {
      playError();
      setErrorMessage('Could not print prescription. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }, [selectedItem, isBusy, getPdfUrl, playPop, playSuccess, playError]);

  // --- 4. Email to Patient (matches web's email flow) ---
  const handleEmail = useCallback(async () => {
    if (!selectedItem || isBusy) return;
    setIsBusy(true);
    try {
      const details: any = await getPrescriptionEmailDetails(selectedItem.id);
      setEmailAddress(details?.patientEmail || '');
      setShowEmailModal(true);
    } catch (err: any) {
      playError();
      setErrorMessage('Could not fetch email details. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }, [selectedItem, isBusy, playError]);

  const handleSendEmail = useCallback(async () => {
    if (!selectedItem || !emailAddress.trim()) return;
    setIsSendingEmail(true);
    try {
      await sendPrescriptionEmail({
        prescriptionId: selectedItem.id,
        recipientEmail: emailAddress.trim(),
        patientName: selectedItem.patients?.full_name || 'Patient',
      });
      playSuccess();
      setSuccessMessage('Email has been queued for sending.');
      setShowEmailModal(false);
      setShowActions(false);
    } catch (err: any) {
      playError();
      setErrorMessage('Could not send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  }, [selectedItem, emailAddress, playSuccess, playError]);

  // --- 5. Share (download PDF then share actual file via native share sheet) ---
  const handleShare = useCallback(async () => {
    if (!selectedItem || isBusy) return;
    setIsBusy(true);
    try {
      const url = await getPdfUrl(selectedItem);
      const patientName = selectedItem.patients?.full_name?.replace(/\s+/g, '_') || 'Patient';
      const fileName = `Prescription_${patientName}.pdf`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      const result = await FileSystem.downloadAsync(url, fileUri);
      if (result.status !== 200) throw new Error('Download failed.');

      playPop();
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share prescription for ${selectedItem.patients?.full_name || 'Patient'}`,
      });
      setShowActions(false);
    } catch (err: any) {
      playError();
      setErrorMessage('Could not share prescription. Please try again.');
    } finally {
      setIsBusy(false);
    }
  }, [selectedItem, isBusy, getPdfUrl, playPop, playError]);

  // --- Action buttons data ---
  const ACTIONS = [
    { key: 'download', icon: 'download-outline' as const, label: 'Download', color: '#3b82f6', onPress: handleDownload },
    { key: 'print', icon: 'print-outline' as const, label: 'Print', color: '#8b5cf6', onPress: handlePrint },
    { key: 'email', icon: 'mail-outline' as const, label: 'Email', color: '#f59e0b', onPress: handleEmail },
    { key: 'share', icon: 'share-social-outline' as const, label: 'Share', color: '#22c55e', onPress: handleShare },
  ];

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const renderItem = ({ item }: { item: PrescriptionItem }) => {
    const isActive = activeItemId === item.id;
    return (
      <View style={[styles.prescriptionRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <TouchableOpacity
          style={styles.prescriptionContent}
          activeOpacity={0.7}
          onPress={() => handleView(item)}
        >
          <View style={[styles.avatar, { backgroundColor: '#f0fdfa' }]}>
            <Ionicons name="medical-outline" size={18} color="#14b8a6" />
          </View>
          <View style={styles.prescriptionText}>
            <Text style={[styles.patientName, { color: c.text }]} numberOfLines={1}>
              {item.patients?.full_name || 'Walk-in Patient'}
            </Text>
            <Text style={[styles.diagnosisText, { color: c.textTertiary }]} numberOfLines={1}>
              {item.diagnosis || 'No diagnosis'}
            </Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.dateText, { color: c.textTertiary }]}>
              {formatDate(item.created_at)}
            </Text>
            {isActive ? (
              <ActivityIndicator size="small" color={c.brand} style={{ marginTop: 4 }} />
            ) : (
              <Ionicons name="eye-outline" size={18} color={c.brand} style={{ marginTop: 4 }} />
            )}
          </View>
        </TouchableOpacity>

        {/* 3-dot menu */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => {
            playPop();
            setSelectedItem(item);
            setShowActions(true);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={c.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {/* Main List Sheet */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <View />
        </TouchableOpacity>

        <View style={[styles.sheet, { backgroundColor: c.card }]}>
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: c.borderMedium }]} />
          </View>

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Recent Prescriptions</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={c.textTertiary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={c.brand} />
              <Text style={[styles.loadingText, { color: c.textSecondary }]}>Loading...</Text>
            </View>
          ) : prescriptions.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={48} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                No recent prescriptions
              </Text>
            </View>
          ) : (
            <FlatList
              data={prescriptions}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {/* Actions Bottom Sheet */}
      <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
        <TouchableOpacity style={styles.actionsBackdrop} activeOpacity={1} onPress={() => { setShowActions(false); setIsBusy(false); }}>
          <View />
        </TouchableOpacity>
        <View style={[styles.actionsSheet, { backgroundColor: c.card }]}>
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: c.borderMedium }]} />
          </View>
          <Text style={[styles.actionsTitle, { color: c.text }]}>
            {selectedItem?.patients?.full_name || 'Prescription'}
          </Text>
          <Text style={[styles.actionsSubtitle, { color: c.textTertiary }]}>
            {selectedItem?.diagnosis || 'Actions'}
          </Text>
          <View style={styles.actionsGrid}>
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={[styles.actionBtn, { backgroundColor: c.cardAlt, borderColor: c.border }]}
                activeOpacity={0.7}
                onPress={action.onPress}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={action.color} />
                ) : (
                  <View style={[styles.actionIconBox, { backgroundColor: action.color + '18' }]}>
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                )}
                <Text style={[styles.actionLabel, { color: c.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: c.border }]}
            onPress={() => { setShowActions(false); setIsBusy(false); }}
          >
            <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* In-App PDF Viewer */}
      <Modal visible={showPdfViewer} animationType="slide" onRequestClose={() => setShowPdfViewer(false)}>
        <View style={[styles.pdfViewerContainer, { backgroundColor: c.bg }]}>
          {/* PDF Viewer Header */}
          <View style={[styles.pdfViewerHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setShowPdfViewer(false)} style={styles.pdfBackBtn}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.pdfViewerTitle, { color: c.text }]} numberOfLines={1}>
              Prescription Preview
            </Text>
            <TouchableOpacity
              onPress={async () => {
                if (!pdfViewerUrl) return;
                try {
                  await Linking.openURL(pdfViewerUrl);
                } catch { }
              }}
              style={styles.pdfBackBtn}
            >
              <Ionicons name="open-outline" size={22} color={c.brand} />
            </TouchableOpacity>
          </View>

          {/* PDF WebView */}
          {pdfViewerUrl && (
            <WebView
              source={{
                uri: Platform.OS === 'android'
                  ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfViewerUrl)}`
                  : pdfViewerUrl,
              }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator size="large" color={c.brand} />
                  <Text style={[styles.loadingText, { color: c.textSecondary, marginTop: 12 }]}>
                    Loading PDF...
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Email Modal (matches web flow) */}
      <Modal visible={showEmailModal} transparent animationType="fade" onRequestClose={() => setShowEmailModal(false)}>
        <TouchableOpacity style={styles.actionsBackdrop} activeOpacity={1} onPress={() => setShowEmailModal(false)}>
          <View />
        </TouchableOpacity>
        <View style={[styles.emailSheet, { backgroundColor: c.card }]}>
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: c.borderMedium }]} />
          </View>
          <Ionicons name="mail-outline" size={36} color="#f59e0b" style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Text style={[styles.emailTitle, { color: c.text }]}>Email Prescription</Text>
          <Text style={[styles.emailSubtitle, { color: c.textTertiary }]}>
            Send prescription PDF to the patient's email address
          </Text>
          <TextInput
            style={[styles.emailInput, { backgroundColor: c.input, borderColor: c.borderMedium, color: c.text }]}
            placeholder="patient@email.com"
            placeholderTextColor={c.textTertiary}
            value={emailAddress}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.emailActions}>
            <TouchableOpacity
              style={[styles.emailCancelBtn, { borderColor: c.border }]}
              onPress={() => setShowEmailModal(false)}
            >
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emailSendBtn, { backgroundColor: '#f59e0b', opacity: isSendingEmail ? 0.6 : 1 }]}
              onPress={handleSendEmail}
              disabled={isSendingEmail || !emailAddress.trim()}
            >
              {isSendingEmail ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.emailSendText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={!!successMessage}
        message={successMessage || ''}
        onClose={() => setSuccessMessage(null)}
      />
      <ErrorModal
        visible={!!errorMessage}
        message={errorMessage || ''}
        onClose={() => setErrorMessage(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  prescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prescriptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prescriptionText: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
  },
  diagnosisText: {
    fontSize: 12,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  menuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  // --- Actions Sheet ---
  actionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  actionsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionsSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    justifyContent: 'center',
  },
  actionBtn: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 16,
    marginHorizontal: 20,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // --- PDF Viewer ---
  pdfViewerContainer: {
    flex: 1,
  },
  pdfViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  pdfBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfViewerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  pdfLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- Email Modal ---
  emailSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  emailTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  emailSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  emailInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 16,
  },
  emailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emailCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailSendBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emailSendText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
