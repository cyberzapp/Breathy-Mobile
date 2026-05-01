import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getActiveSession,
  getAvailableSessions,
  getTodaysQueue,
  startClinicSession,
  startConsultation,
  endConsultation,
  updateWaitlistStatus,
  endClinicSession,
  announceDelay,
  subscribeToQueueChanges,
  QueueItem,
  ActiveSession,
  AvailableSession,
} from '../services/queueService';

import AddPatientToQueueModal from './AddPatientToQueueModal';
import VideoCallsModal from './VideoCallsModal';
import SuccessModal from './ui/SuccessModal';
import ErrorModal from './ui/ErrorModal';
import ConfirmationModal from './ui/ConfirmationModal';
import ActionSheetModal, { ActionSheetOption } from './ui/ActionSheetModal';

// ---------------------------------------------------------------------------
// TodaysQueueWidget — Native mirror of TodaysQueue.jsx + PatientsPanel
// ---------------------------------------------------------------------------
// 3 states:
//   1. ACTIVE SESSION  → show queue list with patient cards
//   2. SESSIONS AVAILABLE → show "Start Session" buttons
//   3. NO SESSIONS     → show "No Appointments" message
// ---------------------------------------------------------------------------

const BRAND = '#22ae9e';

export default function TodaysQueueWidget() {
  // ── State ──
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // track which button is loading
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showVideoCallsModal, setShowVideoCallsModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showDelayPicker, setShowDelayPicker] = useState(false);
  const [delayOptions, setDelayOptions] = useState<ActionSheetOption[]>([]);

  // ── Data Fetching ──
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const session = await getActiveSession();
      setActiveSession(session);

      if (session) {
        const queueData = await getTodaysQueue();
        setQueue(queueData || []);
      } else {
        const sessions = await getAvailableSessions();
        setAvailableSessions(sessions || []);
      }
    } catch (err: any) {
      console.error('[Queue] Fetch failed:', err?.message);
      setError(err?.message || 'Failed to load queue');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscription + polling fallback
  useEffect(() => {
    // 1. Supabase real-time channels
    const unsubscribe = subscribeToQueueChanges(() => {
      fetchAll(true);
    });

    // 2. Polling fallback every 60s to avoid hitting 100 requests/15min API rate limits
    const pollInterval = setInterval(() => {
      fetchAll(true);
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [fetchAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll(true);
  };

  // ── Actions ──

  const handleStartSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await startClinicSession(sessionId);
      await fetchAll(true);
    } catch (err: any) {
      setErrorMessage('Failed to start session. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartConsultation = async (waitlistEntryId: string) => {
    setActionLoading(waitlistEntryId);
    try {
      await startConsultation(waitlistEntryId);
      await fetchAll(true);
    } catch (err: any) {
      setErrorMessage('Failed to start consultation. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndConsultation = async (waitlistEntryId: string) => {
    setActionLoading(`end-${waitlistEntryId}`);
    try {
      await endConsultation(waitlistEntryId);
      await fetchAll(true);
    } catch (err: any) {
      setErrorMessage('Failed to end consultation. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (waitlistEntryId: string, status: string) => {
    setActionLoading(`status-${waitlistEntryId}`);
    try {
      await updateWaitlistStatus(waitlistEntryId, status);
      await fetchAll(true);
    } catch (err: any) {
      setErrorMessage('Failed to update status. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndSession = () => {
    setShowEndSessionConfirm(true);
  };

  const doEndSession = async () => {
    setShowEndSessionConfirm(false);
    setActionLoading('end-session');
    try {
      await endClinicSession();
      setActiveSession(null);
      setQueue([]);
      await fetchAll(true);
    } catch (err: any) {
      setErrorMessage('Failed to end session. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAnnounceDelay = (session: AvailableSession) => {
    const delays = [10, 15, 20, 30, 45, 60];
    const opts: ActionSheetOption[] = delays.map((min) => ({
      label: `${min} min`,
      onPress: async () => {
        try {
          await announceDelay(session.id, min);
          await fetchAll(true);
        } catch (err: any) {
          setErrorMessage('Failed to update delay. Please try again.');
        }
      },
    }));

    if (session.delay_minutes > 0) {
      opts.unshift({
        label: '✓ On Time',
        onPress: async () => {
          try {
            await announceDelay(session.id, 0);
            await fetchAll(true);
          } catch (err: any) {
            setErrorMessage('Failed to update delay. Please try again.');
          }
        },
      });
    }

    setDelayOptions(opts);
    setShowDelayPicker(true);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Queue</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Queue</Text>
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchAll()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 1: Session is ACTIVE — Show the queue list
  // ═══════════════════════════════════════════════════════════════════════════
  if (activeSession) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
            <Text style={styles.headerTitle}>Today</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowVideoCallsModal(true)}
            >
              <Ionicons name="videocam-outline" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { marginLeft: 8 }]}
              onPress={() => setShowAddPatientModal(true)}
            >
              <Ionicons name="person-add-outline" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { marginLeft: 8 }]}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Queue List */}
        {queue.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Ionicons name="people-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyText}>No patients in queue yet</Text>
            <Text style={styles.emptySubtext}>
              Patients will appear here as they check in
            </Text>
          </View>
        ) : (
          <View style={{ paddingBottom: 8 }}>
            {queue.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                actionLoading={actionLoading}
                onStart={() => handleStartConsultation(item.id)}
                onEnd={() => handleEndConsultation(item.id)}
                onSkip={() => handleUpdateStatus(item.id, 'skipped')}
                onCheckIn={() => handleUpdateStatus(item.id, 'waiting')}
              />
            ))}
          </View>
        )}

        {/* Footer: End Session */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.endSessionBtn}
            onPress={handleEndSession}
            disabled={actionLoading === 'end-session'}
          >
            <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            <Text style={styles.endSessionText}>End Session</Text>
          </TouchableOpacity>
          <Text style={styles.footerInfo}>
            {queue.filter((q) => q.status === 'waiting').length} waiting ·{' '}
            {queue.filter((q) => q.status === 'completed').length} completed
          </Text>
        </View>

        {/* Action Modals */}
        <AddPatientToQueueModal
          visible={showAddPatientModal}
          onClose={() => setShowAddPatientModal(false)}
          onAdded={() => fetchAll(true)}
          onSuccess={(msg) => { setShowAddPatientModal(false); setSuccessMessage(msg); }}
        />
        <VideoCallsModal
          visible={showVideoCallsModal}
          onClose={() => setShowVideoCallsModal(false)}
        />

        <SuccessModal
          visible={!!successMessage}
          onClose={() => setSuccessMessage(null)}
          message={successMessage || ''}
        />
        <ErrorModal
          visible={!!errorMessage}
          message={errorMessage || ''}
          onClose={() => setErrorMessage(null)}
        />
        <ConfirmationModal
          visible={showEndSessionConfirm}
          title="End Clinic Session"
          message="Are you sure you want to end today's session? This will clear the active queue."
          confirmText="End Session"
          isDestructive={true}
          onCancel={() => setShowEndSessionConfirm(false)}
          onConfirm={doEndSession}
        />

        <ActionSheetModal
          visible={showDelayPicker}
          title="Update Delay"
          message="Set total delay time (patients will be notified):"
          options={delayOptions}
          onCancel={() => setShowDelayPicker(false)}
        />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 2: No Active Session but sessions are AVAILABLE to start
  // ═══════════════════════════════════════════════════════════════════════════
  if (availableSessions.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Queue</Text>
        </View>

        <View style={styles.startContainer}>
          <View style={styles.startIconCircle}>
            <Ionicons name="play-circle" size={44} color={BRAND} />
          </View>
          <Text style={styles.startTitle}>Start Your Clinic</Text>
          <Text style={styles.startSubtitle}>
            You have {availableSessions.length} session
            {availableSessions.length > 1 ? 's' : ''} scheduled for today.
          </Text>

          {availableSessions.map((session) => (
            <View key={session.id} style={styles.sessionButtonGroup}>
              <TouchableOpacity
                style={styles.startSessionButton}
                onPress={() => handleStartSession(session.id)}
                disabled={actionLoading === session.id}
                activeOpacity={0.8}
              >
                {actionLoading === session.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#ffffff" />
                    <Text style={styles.startSessionText}>
                      Start ({session.start_time} – {session.end_time})
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Late button */}
              <TouchableOpacity
                style={styles.lateButton}
                onPress={() => handleAnnounceDelay(session)}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={session.delay_minutes > 0 ? '#ef4444' : '#f59e0b'}
                />
                <Text
                  style={[
                    styles.lateButtonText,
                    session.delay_minutes > 0 && { color: '#ef4444' },
                  ]}
                >
                  {session.delay_minutes > 0
                    ? `Late by ${session.delay_minutes} mins`
                    : "I'm running late"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE 3: No sessions at all
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Queue</Text>
      </View>
      <View style={styles.centerBox}>
        <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
        <Text style={styles.noSessionTitle}>No Appointments</Text>
        <Text style={styles.noSessionSubtext}>
          You have no appointments or scheduled sessions for today.
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// QueueItemCard — Individual patient row
// ---------------------------------------------------------------------------
function QueueItemCard({
  item,
  actionLoading,
  onStart,
  onEnd,
  onSkip,
  onCheckIn,
}: {
  item: QueueItem;
  actionLoading: string | null;
  onStart: () => void;
  onEnd: () => void;
  onSkip: () => void;
  onCheckIn: () => void;
}) {
  const time = new Date(item.time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isInProgress = item.status === 'in_progress';
  const isCompleted = item.status === 'completed';
  const isSkipped = item.status === 'skipped';
  const isWaiting = item.status === 'waiting';

  return (
    <View
      style={[
        styles.queueCard,
        isInProgress && styles.queueCardActive,
        isCompleted && styles.queueCardCompleted,
      ]}
    >
      <View style={styles.queueCardLeft}>
        {/* Token or Video icon */}
        {item.type === 'queue' ? (
          <View
            style={[
              styles.tokenCircle,
              isInProgress && { backgroundColor: BRAND },
            ]}
          >
            <Text
              style={[
                styles.tokenText,
                isInProgress && { color: '#ffffff' },
              ]}
            >
              {item.token}
            </Text>
          </View>
        ) : (
          <View style={[styles.tokenCircle, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="videocam" size={16} color="#3b82f6" />
          </View>
        )}

        {/* Patient Info */}
        <View style={styles.patientInfo}>
          <Text
            style={[
              styles.patientName,
              isInProgress && { color: BRAND, fontWeight: '800' },
              isCompleted && { color: '#94a3b8' },
            ]}
            numberOfLines={1}
          >
            {item.patient_name}
          </Text>
          <View style={styles.patientMeta}>
            <Text style={styles.patientTime}>{time}</Text>
            {isSkipped && (
              <View style={styles.skippedBadge}>
                <Text style={styles.skippedBadgeText}>SKIPPED</Text>
              </View>
            )}
            {isInProgress && (
              <View style={styles.inProgressBadge}>
                <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.queueCardRight}>
        {isWaiting && (
          <>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={onStart}
              disabled={actionLoading === item.id}
            >
              {actionLoading === item.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="play" size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
            </TouchableOpacity>
          </>
        )}
        {isInProgress && (
          <TouchableOpacity
            style={styles.endBtn}
            onPress={onEnd}
            disabled={actionLoading === `end-${item.id}`}
          >
            {actionLoading === `end-${item.id}` ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        )}
        {isCompleted && (
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark" size={16} color="#94a3b8" />
          </View>
        )}
        {isSkipped && (
          <TouchableOpacity style={styles.checkInBtn} onPress={onCheckIn}>
            <Ionicons name="arrow-undo-outline" size={16} color={BRAND} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginTop: 20,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Live indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.5,
  },

  // Queue Item Card
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  queueCardActive: {
    backgroundColor: '#f0fdfa',
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
  },
  queueCardCompleted: {
    opacity: 0.5,
  },
  queueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tokenCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  patientTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  skippedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  skippedBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#d97706',
    letterSpacing: 0.5,
  },
  inProgressBadge: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inProgressBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: BRAND,
    letterSpacing: 0.5,
  },

  // Action buttons
  queueCardRight: {
    flexDirection: 'row',
    gap: 6,
  },
  startBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  endSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  endSessionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  footerInfo: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Center states
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: BRAND,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },

  // Start Session State
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  startIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${BRAND}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  startTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  startSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  sessionButtonGroup: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  startSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  startSessionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  lateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 6,
  },
  lateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },

  // No Session State
  noSessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  noSessionSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },

  // Empty Queue
  emptyQueue: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});
