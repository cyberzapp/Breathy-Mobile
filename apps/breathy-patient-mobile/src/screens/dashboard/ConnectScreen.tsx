import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../store/authStore';
import { getUpcomingAppointments, getPastAppointments, getActiveChatSessions } from '../../services/patientService';
import dayjs from 'dayjs';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import short from 'short-uuid';

export default function ConnectScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'chats'>('upcoming');
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'upcoming') {
        const data = await getUpcomingAppointments(userId!);
        setUpcoming(data);
      } else if (activeTab === 'history') {
        const data = await getPastAppointments({ pageParam: 0, userId: userId! });
        setHistory(data);
      } else if (activeTab === 'chats') {
        const response = await getActiveChatSessions();
        const data = (response as any)?.data || response;
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load data in ConnectHub:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      Alert.alert('Success', 'Appointment cancelled.');
      loadData(); // refresh list
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to cancel appointment.');
    }
  };

  const handleDownloadInvoice = async (item: any) => {
    try {
      const doctorName = item.doctor?.full_name || 'Doctor';
      const clinicName = item.clinic?.name || 'Clinic';
      const patientName = session?.user?.email || 'Patient';

      const htmlContent = `
        <html>
          <body style="font-family: Helvetica, Arial, sans-serif; padding: 20px;">
            <h1 style="color: #0d9488;">BREATHY TECHNOLOGIES</h1>
            <p style="color: #555;">Invoice for Appointment</p>
            <hr />
            <p><strong>Patient:</strong> ${patientName}</p>
            <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p><strong>Clinic:</strong> ${clinicName}</p>
            <p><strong>Date:</strong> ${dayjs(item.start_time).format('MMM D, YYYY h:mm A')}</p>
            <p><strong>Status:</strong> ${item.status}</p>
            <br/>
            <h3>Amount Paid: INR ${item.payments?.[0]?.amount || '0'}</h3>
            <p style="color: green; font-weight: bold;">Payment Status: SUCCESS</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to generate invoice.');
    }
  };

  const renderAppointmentCard = ({ item }: { item: any }) => {
    const isVideo = item.appointment_type === 'video';
    const isCompleted = item.status === 'completed';
    const isUpcoming = item.status === 'scheduled';

    const getShortId = (id: string) => {
      if (!id) return '';
      if (id.length === 36 && id.includes('-')) {
        try {
          const translator = (short as any).createTranslator ? (short as any).createTranslator() : (short as any).default();
          return translator.fromUUID(id);
        } catch { return id; }
      }
      return id;
    };
    const finalDoctorId = item.doctor?.shortId || getShortId(item.doctor?.id);

    return (
      <Animated.View entering={FadeInUp} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('DoctorProfile', { doctorId: finalDoctorId })}>
            {item.doctor?.profile_photo_url ? (
              <Image source={{ uri: item.doctor.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: c.brandBg || '#e0f2f1', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: c.brand, fontSize: 20, fontWeight: '700' }}>
                  {item.doctor?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.cardInfo}>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorProfile', { doctorId: finalDoctorId })}>
              <Text style={[styles.doctorName, { color: c.text }]}>Dr. {item.doctor?.full_name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => item.clinic?.id && navigation.navigate('ClinicProfile', { clinicId: item.clinic.id })}>
              <Text style={[styles.clinicName, { color: c.brand, marginTop: 2 }]}>{item.clinic?.name || 'Clinic'}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isCompleted ? c.borderMedium : c.brandBg }]}>
            <Text style={[styles.statusText, { color: isCompleted ? c.textSecondary : c.brand }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Ionicons name="calendar-outline" size={16} color={c.textTertiary} />
            <Text style={[styles.timeText, { color: c.textSecondary }]}>{dayjs(item.start_time).format('MMM D, YYYY')}</Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name="time-outline" size={16} color={c.textTertiary} />
            <Text style={[styles.timeText, { color: c.textSecondary }]}>{dayjs(item.start_time).format('h:mm A')}</Text>
          </View>
          <View style={styles.timeItem}>
            <Ionicons name={isVideo ? "videocam-outline" : "business-outline"} size={16} color={c.brand} />
            <Text style={[styles.timeText, { color: c.brand }]}>{isVideo ? 'Video' : 'In-Person'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {/* {activeTab === 'upcoming' && (
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: c.bg, borderColor: c.border }]} onPress={() => Alert.alert('Cancel Appointment', 'Are you sure you want to cancel?', [{ text: 'No' }, { text: 'Yes, Cancel', onPress: () => handleCancel(item.id) }])}>
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Cancel</Text>
            </TouchableOpacity>
          )} */}

          {activeTab === 'upcoming' && isVideo && (
            <TouchableOpacity style={[styles.actionBtn, { flex: 1.5, backgroundColor: c.brand, borderColor: c.brand }]} onPress={() => navigation.navigate('VideoRoom', { appointmentId: item.id, doctorName: item.doctor?.full_name || 'Doctor' })}>
              <Ionicons name="videocam" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Join Call</Text>
            </TouchableOpacity>
          )}

          {(activeTab === 'history' || isCompleted) && (
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: c.brand, borderColor: c.brand }]} onPress={() => handleDownloadInvoice(item)}>
              <Ionicons name="document-text-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderChatCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={() => navigation.navigate('ChatRoom', { sessionId: item.id, participantName: item.doctor_name })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: c.brandBg, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={24} color={c.brand} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.doctorName, { color: c.text }]}>Dr. {item.doctor_name}</Text>
            <Text style={[styles.clinicName, { color: c.textSecondary }]}>Chat Session</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.borderMedium} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>Connect Hub</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Links Section */}
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={[styles.quickLinkBox, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => navigation.navigate('Prescriptions')}
          >
            <Ionicons name="medical" size={24} color={c.brand} />
            <Text style={[styles.quickLinkText, { color: c.text }]}>Prescriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickLinkBox, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => navigation.navigate('TreatmentPlans')}
          >
            <Ionicons name="clipboard" size={24} color={c.brand} />
            <Text style={[styles.quickLinkText, { color: c.text }]}>Treatment Plans</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: c.border, padding: 4, borderRadius: 12 }]}>
          {['upcoming', 'history', 'chats'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && { backgroundColor: c.card }]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[styles.tabText, { color: isActive ? c.brand : c.textSecondary, fontWeight: isActive ? '700' : '500' }]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {isLoading ? (
          <ActivityIndicator size="large" color={c.brand} style={{ marginTop: 40 }} />
        ) : (
          <Animated.View entering={FadeIn}>
            {activeTab === 'upcoming' && upcoming.length === 0 && (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No upcoming appointments.</Text>
            )}
            {activeTab === 'history' && history.length === 0 && (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No past appointments.</Text>
            )}
            {activeTab === 'chats' && chats.length === 0 && (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No active chat sessions.</Text>
            )}

            {activeTab === 'upcoming' && upcoming.map(item => <View key={item.id}>{renderAppointmentCard({ item })}</View>)}
            {activeTab === 'history' && history.map(item => <View key={item.id}>{renderAppointmentCard({ item })}</View>)}
            {activeTab === 'chats' && chats.map(item => <View key={item.id}>{renderChatCard({ item })}</View>)}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16 },
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickLinkBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  clinicName: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
