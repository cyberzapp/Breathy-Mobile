import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTodaysVideoAppointments, updateWaitlistStatus } from '../services/queueService';
import { updateAppointmentStatus } from '../services/calendarService';
import VideoAppointmentModal from './VideoAppointmentModal';

const BRAND = '#22ae9e';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function VideoCallsModal({ visible, onClose }: Props) {
  const [videoCalls, setVideoCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  const fetchCalls = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    else setRefreshing(true);

    try {
      const data = await getTodaysVideoAppointments();
      setVideoCalls(data || []);
    } catch (error: any) {
      console.error('[VideoCalls] Fetch error:', error);
      Alert.alert('Error', error.message || 'Failed to fetch video calls.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchCalls();
    } else {
      setVideoCalls([]);
    }
  }, [visible, fetchCalls]);

  const handleStatusChange = async (appointmentId: string, status: string) => {
    try {
      await updateAppointmentStatus(appointmentId, status);
      fetchCalls(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status.');
    }
  };

  const handleJoinClick = (appt: any) => {
    const event = {
      id: appt.id,
      title: appt.patients?.full_name,
      start: new Date(appt.start_time),
      startStr: appt.start_time,
      extendedProps: { ...appt, patientName: appt.patients?.full_name, type: 'appointment-video' }
    };
    setSelectedAppt(event);
  };

  const renderItem = ({ item }: { item: any }) => {
    const timeText = new Date(item.start_time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.callCard}>
        <View style={styles.callInfo}>
          <Text style={styles.patientName}>{item.patients?.full_name || 'Unknown Patient'}</Text>
          <Text style={styles.timeText}>{timeText}</Text>
        </View>

        <View style={styles.actionsBox}>
          {item.status === 'completed' ? (
            <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.badgeText, { color: '#475569' }]}>Completed</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => handleJoinClick(item)}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  Alert.alert('Update Status', 'Mark this call as:', [
                    { text: 'Completed', onPress: () => handleStatusChange(item.id, 'completed') },
                    { text: 'No-Show', style: 'destructive', onPress: () => handleStatusChange(item.id, 'no-show') },
                    { text: 'Cancel', style: 'cancel' }
                  ]);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="videocam" size={22} color={BRAND} />
                <Text style={styles.headerTitle}>Video Consultations</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* List */}
            {isLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={BRAND} />
              </View>
            ) : videoCalls.length === 0 ? (
              <View style={styles.centerBox}>
                <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No video calls scheduled for today.</Text>
              </View>
            ) : (
              <FlatList
                data={videoCalls}
                keyExtractor={(i) => i.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => fetchCalls(true)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Internal Room Modal */}
      {selectedAppt && (
        <VideoAppointmentModal
          visible={!!selectedAppt}
          event={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  centerBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  callInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#64748b',
  },
  actionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6', // Video blue
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  iconBtn: {
    padding: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
