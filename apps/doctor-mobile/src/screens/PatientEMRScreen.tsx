import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../hooks/useColors';
import { emrService, TreatmentPlan } from '../services/emrService';
import ClinicalNoteEditorModal from '../components/emr/ClinicalNoteEditorModal';
import TreatmentPlanCreatorModal from '../components/emr/TreatmentPlanCreatorModal';
import TreatmentPlanEntryModal from '../components/emr/TreatmentPlanEntryModal';
import HealthRecordUploaderModal from '../components/emr/HealthRecordUploaderModal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import ErrorModal from '../components/ui/ErrorModal';

type PatientEMRParams = {
  PatientEMR: {
    patient: any;
  };
};

type TabType = 'timeline' | 'plans' | 'files';

export default function PatientEMRScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PatientEMRParams, 'PatientEMR'>>();
  const { patient } = route.params;
  const c = useColors();

  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isPlanCreatorVisible, setIsPlanCreatorVisible] = useState(false);
  const [isPlanEntryVisible, setIsPlanEntryVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; title: string } | null>(null);
  const [isFileUploaderVisible, setIsFileUploaderVisible] = useState(false);

  // Custom UI Modals State
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletePlanModalVisible, setDeletePlanModalVisible] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<{ id: string, title: string } | null>(null);
  const [deleteFileModalVisible, setDeleteFileModalVisible] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string, name: string } | null>(null);
  const [deleteNoteModalVisible, setDeleteNoteModalVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: string } | null>(null);

  // Helper to find latest past appointment
  const findLatestAppointmentId = () => {
    const now = new Date();
    const pastAppointments = timeline
      .filter((item) => item.type === 'appointment' && new Date(item.timestamp) <= now)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return pastAppointments.length > 0 ? pastAppointments[0].data.id : null;
  };

  const handleAddNote = () => {
    const apptId = findLatestAppointmentId();
    if (!apptId) {
      alert('Cannot add note. No past appointments found for this patient.');
      return;
    }
    setEditingNote(null);
    setIsNoteModalVisible(true);
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setIsNoteModalVisible(true);
  };

  useEffect(() => {
    loadData();
  }, [patient.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [timelineRes, plansRes] = await Promise.all([
        emrService.getPatientTimeline(patient.id),
        emrService.getPatientTreatmentPlans(patient.id),
      ]);
      setTimeline(Array.isArray(timelineRes) ? timelineRes : timelineRes?.data || []);
      setPlans(Array.isArray(plansRes) ? plansRes : plansRes?.data || []);
    } catch (error) {
      console.error('Error loading EMR data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTab = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && { borderBottomColor: c.brand }]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, { color: isActive ? c.brand : c.textTertiary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleDeletePlan = (id: string, title: string) => {
    setPlanToDelete({ id, title });
    setDeletePlanModalVisible(true);
  };

  const executeDeletePlan = async () => {
    if (!planToDelete) return;
    setDeletePlanModalVisible(false);
    try {
      setIsLoading(true);
      await emrService.deleteTreatmentPlan(planToDelete.id);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message);
      setErrorModalVisible(true);
      setIsLoading(false);
    }
  };

  const handleDeleteFile = (id: string, name: string) => {
    setFileToDelete({ id, name });
    setDeleteFileModalVisible(true);
  };

  const executeDeleteFile = async () => {
    if (!fileToDelete) return;
    setDeleteFileModalVisible(false);
    try {
      setIsLoading(true);
      await emrService.deleteHealthRecord(fileToDelete.id);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message);
      setErrorModalVisible(true);
      setIsLoading(false);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNoteToDelete({ id });
    setDeleteNoteModalVisible(true);
  };

  const executeDeleteNote = async () => {
    if (!noteToDelete) return;
    setDeleteNoteModalVisible(false);
    try {
      setIsLoading(true);
      await emrService.deleteClinicalNote(noteToDelete.id);
      loadData();
    } catch (e: any) {
      setErrorMessage(e.message);
      setErrorModalVisible(true);
      setIsLoading(false);
    }
  };

  const renderTimelineItem = ({ item }: { item: any }) => {
    let icon = 'ellipse-outline';
    let title = '';
    let subtitle = '';

    if (item.type === 'appointment') {
      icon = 'calendar';
      title = 'Appointment';
      subtitle = `Status: ${item.data.status}`;
    } else if (item.type === 'prescription') {
      icon = 'document-text';
      title = 'Prescription';
      subtitle = item.data.diagnosis || 'No diagnosis provided';
    } else if (item.type === 'clinical_note') {
      icon = 'medical';
      title = 'Clinical Note';
      subtitle = 'Doctor Note Added';
    } else if (item.type === 'health_record') {
      icon = 'folder';
      title = 'Health Record';
      subtitle = item.data.file_name || 'Document';
    }

    return (
      <TouchableOpacity
        style={[styles.timelineCard, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={item.type === 'clinical_note' ? () => handleEditNote(item.data) : undefined}
      >
        <View style={[styles.timelineIconWrapper, { backgroundColor: c.brandBg }]}>
          <Ionicons name={icon as any} size={20} color={c.brand} />
        </View>
        <View style={styles.timelineContent}>
          <Text style={[styles.timelineTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.timelineSubtitle, { color: c.textSecondary }]}>{subtitle}</Text>
          <Text style={[styles.timelineDate, { color: c.textTertiary }]}>
            {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(item.timestamp))}
          </Text>
        </View>
        {item.type === 'clinical_note' && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => handleDeleteNote(item.data.id)} style={{ padding: 4, marginRight: 8 }}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
            <Ionicons name="pencil" size={16} color={c.textTertiary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPlanItem = ({ item }: { item: TreatmentPlan }) => (
    <TouchableOpacity
      style={[styles.planCard, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={() => {
        setSelectedPlan({ id: item.id, title: item.title });
        setIsPlanEntryVisible(true);
      }}
    >
      <View style={styles.planHeader}>
        <Text style={[styles.planTitle, { color: c.text }]}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'active' ? '#dcfce7' : '#f1f5f9' }]}>
          <Text style={[styles.badgeText, { color: item.status === 'active' ? '#166534' : '#64748b' }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.planDiagnosis, { color: c.textSecondary }]}>Diagnosis: {item.diagnosis}</Text>
      {item.goals && <Text style={[styles.planGoals, { color: c.textSecondary }]}>Goals: {item.goals}</Text>}

      <View style={styles.planFooter}>
        <Text style={[styles.planDate, { color: c.textTertiary }]}>
          Started: {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(item.start_date))}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.planEntries, { color: c.brand, marginRight: 16 }]}>
            {item.treatment_plan_entries?.length || 0} Entries
          </Text>
          <TouchableOpacity onPress={() => handleDeletePlan(item.id, item.title)}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFileItem = ({ item }: { item: any }) => (
    <View style={[styles.fileCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <Ionicons name="document" size={24} color={c.brand} style={styles.fileIcon} />
      <View style={styles.fileContent}>
        <Text style={[styles.fileName, { color: c.text }]} numberOfLines={1}>
          {item.data.file_name}
        </Text>
        <Text style={[styles.fileType, { color: c.textTertiary }]}>{item.data.record_type}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity style={{ padding: 8, marginRight: 4 }} onPress={() => handleDeleteFile(item.data.id, item.data.file_name)}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 8 }} onPress={() => { if (item.data.public_url) Linking.openURL(item.data.public_url); }}>
          <Ionicons name="download-outline" size={20} color={c.brand} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Modals */}
      <ClinicalNoteEditorModal
        visible={isNoteModalVisible}
        patientId={patient.id}
        appointmentId={findLatestAppointmentId()}
        existingNote={editingNote}
        onClose={() => setIsNoteModalVisible(false)}
        onSuccess={loadData}
      />
      <TreatmentPlanCreatorModal
        visible={isPlanCreatorVisible}
        patientId={patient.id}
        onClose={() => setIsPlanCreatorVisible(false)}
        onSuccess={loadData}
      />

      {selectedPlan && (
        <TreatmentPlanEntryModal
          visible={isPlanEntryVisible}
          planId={selectedPlan.id}
          planTitle={selectedPlan.title}
          onClose={() => setIsPlanEntryVisible(false)}
          onSuccess={loadData}
        />
      )}
      <HealthRecordUploaderModal
        visible={isFileUploaderVisible}
        patientId={patient.id}
        onClose={() => setIsFileUploaderVisible(false)}
        onSuccess={loadData}
      />

      <ErrorModal
        visible={errorModalVisible}
        message={errorMessage}
        onClose={() => setErrorModalVisible(false)}
      />

      <ConfirmationModal
        visible={deletePlanModalVisible}
        title="Delete Treatment Plan"
        message={`Are you sure you want to delete "${planToDelete?.title}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        onCancel={() => setDeletePlanModalVisible(false)}
        onConfirm={executeDeletePlan}
      />

      <ConfirmationModal
        visible={deleteFileModalVisible}
        title="Delete Health Record"
        message={`Are you sure you want to delete "${fileToDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        onCancel={() => setDeleteFileModalVisible(false)}
        onConfirm={executeDeleteFile}
      />

      <ConfirmationModal
        visible={deleteNoteModalVisible}
        title="Delete Clinical Note"
        message="Are you sure you want to delete this clinical note? This cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onCancel={() => setDeleteNoteModalVisible(false)}
        onConfirm={executeDeleteNote}
      />

      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {patient.full_name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDetails}>
          <View style={styles.headerBadge}>
            <Ionicons name="person-outline" size={12} color={c.textSecondary} />
            <Text style={[styles.headerBadgeText, { color: c.textSecondary }]}>{patient.id?.split('-')[0]}</Text>
          </View>
          {patient.age && (
            <View style={styles.headerBadge}>
              <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
              <Text style={[styles.headerBadgeText, { color: c.textSecondary }]}>{patient.age}y</Text>
            </View>
          )}
          {patient.gender && (
            <View style={styles.headerBadge}>
              <Ionicons name="male-female-outline" size={12} color={c.textSecondary} />
              <Text style={[styles.headerBadgeText, { color: c.textSecondary, textTransform: 'capitalize' }]}>{patient.gender}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
        {renderTab('timeline', 'Timeline')}
        {renderTab('plans', 'Treatment Plans')}
        {renderTab('files', 'Files')}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={c.brand} />
        </View>
      ) : (
        <View style={styles.listContainer}>
          {activeTab === 'timeline' && (
            <FlatList
              data={timeline}
              keyExtractor={(item) => item.data.id}
              renderItem={renderTimelineItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textTertiary }]}>No timeline events found.</Text>}
            />
          )}

          {activeTab === 'plans' && (
            <FlatList
              data={plans}
              keyExtractor={(item) => item.id}
              renderItem={renderPlanItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textTertiary }]}>No active treatment plans.</Text>}
            />
          )}

          {activeTab === 'files' && (
            <FlatList
              data={timeline.filter((t) => t.type === 'health_record')}
              keyExtractor={(item) => item.data.id}
              renderItem={renderFileItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textTertiary }]}>No files uploaded.</Text>}
            />
          )}
        </View>
      )}
      {/* FABs */}
      {!isLoading && activeTab === 'timeline' && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: c.brand }]} onPress={handleAddNote}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Add Note</Text>
        </TouchableOpacity>
      )}
      {!isLoading && activeTab === 'plans' && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: c.brand }]} onPress={() => setIsPlanCreatorVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>Create Plan</Text>
        </TouchableOpacity>
      )}

      {!isLoading && activeTab === 'files' && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: c.brand }]} onPress={() => setIsFileUploaderVisible(true)}>
          <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.fabText}>Upload</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  headerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: { width: 40 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  timelineIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  timelineSubtitle: { fontSize: 14, marginBottom: 8 },
  timelineDate: { fontSize: 12 },
  planCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  planDiagnosis: { fontSize: 14, marginBottom: 4 },
  planGoals: { fontSize: 14, marginBottom: 12 },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  planDate: { fontSize: 12 },
  planEntries: { fontSize: 12, fontWeight: '600' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  fileIcon: { marginRight: 16 },
  fileContent: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  fileType: { fontSize: 13 },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 4,
  },
});
