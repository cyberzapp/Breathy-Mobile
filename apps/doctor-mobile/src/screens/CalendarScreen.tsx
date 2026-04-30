import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OfflineBookingModal from '../components/OfflineBookingModal';
import {
  getCalendarEvents,
  updateAppointmentStatus,
  CalendarEvent,
} from '../services/calendarService';
import { useColors } from '../hooks/useColors';
import { Screen } from '../components/Screen';
// ---------------------------------------------------------------------------
// CalendarScreen — Full native calendar with month grid + day agenda
// ---------------------------------------------------------------------------
// Architecture:
//   [Month Grid]       — tap a day to see its events
//   [Day Agenda List]  — event cards with status, actions
//   [Event Inspector]  — bottom sheet with full details & actions
// ---------------------------------------------------------------------------

const BRAND = '#22ae9e';
const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - 52) / 7; // 18px padding each side + 16px gap

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: '#ecfdf5', color: '#059669', label: 'Confirmed' },
  waiting: { bg: '#fffbeb', color: '#d97706', label: 'Waiting' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
  completed: { bg: '#f1f5f9', color: '#475569', label: 'Completed' },
  'no-show': { bg: '#fef2f2', color: '#9f1239', label: 'No Show' },
};

export default function CalendarScreen() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inspectorEvent, setInspectorEvent] = useState<CalendarEvent | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOfflineBooking, setShowOfflineBooking] = useState(false);
  const c = useColors();
  const insets = useSafeAreaInsets();

  // ─── Fetch Events for current month ───
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const startDate = new Date(currentYear, currentMonth, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const data = await getCalendarEvents({
        startDate,
        endDate,
        clinicId: 'all',
        type: 'all'
      });

      if (data && data.length > 0) {

      }
      setEvents(data || []);
    } catch (err: any) {
      console.error('[Calendar] Fetch failed:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ─── Month Navigation ───
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  // ─── Calendar Grid Data ───
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) days.push(null);
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    return days;
  }, [currentMonth, currentYear]);

  // ─── Events grouped by date key ───
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((evt) => {
      const key = new Date(evt.start).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    return map;
  }, [events]);

  // ─── Selected day's events ───
  const selectedDayKey = selectedDate.toDateString();
  const selectedDayEvents = eventsByDate[selectedDayKey] || [];

  // ─── Status Actions ───
  const handleStatusChange = async (eventId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      await updateAppointmentStatus(eventId, newStatus);
      Alert.alert('Updated', `Appointment marked as ${newStatus}`);
      setInspectorEvent(null);
      await fetchEvents();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Month Title ───
  const monthTitle = new Date(currentYear, currentMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  const getDayEventCount = (day: number) => {
    const key = new Date(currentYear, currentMonth, day).toDateString();
    return eventsByDate[key]?.length || 0;
  };

  return (
    <Screen style={{ backgroundColor: '#f4f4f4' }}>
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ═══ Month Header ═══ */}
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={[styles.monthTitle, { color: c.text }]}>{monthTitle}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* ═══ Weekday Labels ═══ */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={styles.weekdayLabel}>
                {wd}
              </Text>
            ))}
          </View>

          {/* ═══ Calendar Grid ═══ */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={styles.dayCell} />;
              }
              const eventCount = getDayEventCount(day);
              const todayHighlight = isToday(day);
              const selectedHighlight = isSelected(day);

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    todayHighlight && styles.dayCellToday,
                    selectedHighlight && styles.dayCellSelected,
                  ]}
                  onPress={() =>
                    setSelectedDate(new Date(currentYear, currentMonth, day))
                  }
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.dayText,
                      todayHighlight && styles.dayTextToday,
                      selectedHighlight && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {eventCount > 0 && (
                    <View style={styles.dotRow}>
                      {eventCount <= 3
                        ? Array.from({ length: eventCount }).map((_, i) => (
                          <View key={i} style={styles.eventDot} />
                        ))
                        : <>
                          <View style={styles.eventDot} />
                          <View style={styles.eventDot} />
                          <Text style={styles.dotMore}>+{eventCount - 2}</Text>
                        </>
                      }
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ═══ Day Agenda ═══ */}
          <View style={styles.agendaSection}>
            <View style={styles.agendaHeader}>
              <Text style={[styles.agendaTitle, { color: c.text }]}>
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.agendaCount}>
                {selectedDayEvents.length} appointment
                {selectedDayEvents.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={BRAND} />
              </View>
            ) : selectedDayEvents.length === 0 ? (
              <View style={styles.emptyAgenda}>
                <Ionicons name="calendar-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyText}>No appointments this day</Text>
                <Text style={styles.emptySubtext}>
                  Tap another date or book a new appointment
                </Text>
              </View>
            ) : (
              selectedDayEvents
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map((evt) => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    onPress={() => setInspectorEvent(evt)}
                  />
                ))
            )}
          </View>
        </ScrollView>

        {/* ── Floating Action Button (FAB) ── */}
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => setShowOfflineBooking(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* ═══ Event Inspector Modal ═══ */}
        {inspectorEvent && (
          <EventInspectorModal
            event={inspectorEvent}
            onClose={() => setInspectorEvent(null)}
            onStatusChange={handleStatusChange}
            actionLoading={actionLoading}
          />
        )}

        {/* ═══ Offline Booking Modal ═══ */}
        <OfflineBookingModal
          visible={showOfflineBooking}
          onClose={() => setShowOfflineBooking(false)}
          initialDate={selectedDate}
          onBooked={fetchEvents}
        />
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// EventCard — Agenda list item
// ---------------------------------------------------------------------------
function EventCard({
  event,
  onPress,
}: {
  event: CalendarEvent;
  onPress: () => void;
}) {
  const c = useColors();
  const startTime = new Date(event.start).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(event.end).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isVideo = event.extendedProps?.type === 'video';
  const status = event.extendedProps?.status || 'confirmed';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.confirmed;

  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: c.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Time column */}
      <View style={styles.eventTimeCol}>
        <Text style={styles.eventStartTime}>{startTime}</Text>
        <Text style={styles.eventEndTime}>{endTime}</Text>
      </View>

      {/* Divider line */}
      <View
        style={[
          styles.eventDivider,
          { backgroundColor: isVideo ? '#3b82f6' : BRAND },
        ]}
      />

      {/* Content */}
      <View style={styles.eventContent}>
        <View style={styles.eventTopRow}>
          <Text style={styles.eventPatientName} numberOfLines={1}>
            {event.extendedProps?.patientName || event.title}
          </Text>
          {isVideo && (
            <View style={styles.videoBadge}>
              <Ionicons name="videocam" size={10} color="#3b82f6" />
            </View>
          )}
        </View>

        <View style={styles.eventBottomRow}>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusPillText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
          {event.extendedProps?.clinicName && (
            <Text style={styles.clinicLabel} numberOfLines={1}>
              {event.extendedProps.clinicName}
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// EventInspectorModal — Full details + actions
// ---------------------------------------------------------------------------
function EventInspectorModal({
  event,
  onClose,
  onStatusChange,
  actionLoading,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  actionLoading: boolean;
}) {
  const props = event.extendedProps;
  const isVideo = props?.type === 'video';
  const status = props?.status || 'confirmed';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.confirmed;
  const patientName = props?.patientName || event.title;

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.inspectorSheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.inspectorHeader}>
            <View
              style={[
                styles.inspectorTypeIcon,
                { backgroundColor: isVideo ? '#eff6ff' : '#f0fdf9' },
              ]}
            >
              <Ionicons
                name={isVideo ? 'videocam' : 'location'}
                size={22}
                color={isVideo ? '#3b82f6' : BRAND}
              />
            </View>
            <View style={styles.inspectorHeaderText}>
              <Text style={styles.inspectorPatient}>{patientName}</Text>
              <View style={styles.inspectorStatusRow}>
                <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                </View>
                {props?.phone && (
                  <Text style={styles.inspectorPhone}>
                    📞 {props.phone}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.inspectorClose}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Details */}
          <View style={styles.inspectorDetails}>
            <DetailRow
              icon="calendar-outline"
              title={startDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
              subtitle={`${startDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })} – ${endDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`}
            />
            <DetailRow
              icon={isVideo ? 'videocam-outline' : 'location-outline'}
              title={isVideo ? 'Online Video Consultation' : props?.clinicName || 'Clinic'}
              subtitle={isVideo ? 'Link available in Video tab' : 'In-person visit'}
            />
            {props?.reason && (
              <DetailRow
                icon="document-text-outline"
                title="Reason for Visit"
                subtitle={props.reason}
              />
            )}
          </View>

          {/* Actions */}
          {status !== 'completed' && status !== 'cancelled' && (
            <View style={styles.inspectorActions}>
              {/* Primary Action */}
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: isVideo ? '#3b82f6' : '#22c55e' },
                ]}
                onPress={() =>
                  onStatusChange(
                    event.id,
                    isVideo ? 'completed' : 'waiting'
                  )
                }
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={isVideo ? 'videocam' : 'arrow-forward-circle'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.primaryActionText}>
                      {isVideo ? 'Join Video' : 'Check In'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Actions Row */}
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => onStatusChange(event.id, 'completed')}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={BRAND} />
                  <Text style={styles.secondaryBtnText}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: '#fecaca' }]}
                  onPress={() => onStatusChange(event.id, 'cancelled')}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={[styles.secondaryBtnText, { color: '#ef4444' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: '#fed7aa' }]}
                  onPress={() => onStatusChange(event.id, 'no-show')}
                >
                  <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" />
                  <Text style={[styles.secondaryBtnText, { color: '#f59e0b' }]}>
                    No-Show
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DetailRow helper
// ---------------------------------------------------------------------------
function DetailRow({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color="#64748b" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.detailSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Month Header
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },

  // Weekday Row
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  weekdayLabel: {
    width: DAY_WIDTH,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Calendar Grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  dayCell: {
    width: DAY_WIDTH,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  dayCellToday: {
    backgroundColor: '#f0fdf9',
  },
  dayCellSelected: {
    backgroundColor: BRAND,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dayTextToday: {
    color: BRAND,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND,
  },
  dotMore: {
    fontSize: 7,
    fontWeight: '700',
    color: BRAND,
  },

  // Agenda Section
  agendaSection: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 10,
  },
  agendaCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 10,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyAgenda: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  eventTimeCol: {
    width: 52,
    alignItems: 'center',
  },
  eventStartTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  eventEndTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  eventDivider: {
    width: 3,
    height: '100%',
    minHeight: 36,
    borderRadius: 2,
    marginHorizontal: 10,
  },
  eventContent: {
    flex: 1,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  videoBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  clinicLabel: {
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
  },

  // Inspector Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  inspectorSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },

  // Inspector Header
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  inspectorTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspectorHeaderText: {
    flex: 1,
  },
  inspectorPatient: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  inspectorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  inspectorPhone: {
    fontSize: 11,
    color: '#64748b',
  },
  inspectorClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Inspector Details
  inspectorDetails: {
    padding: 20,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  detailSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },

  // Inspector Actions
  inspectorActions: {
    paddingHorizontal: 20,
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  secondaryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND,
  },

  // Floating Action Button
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
