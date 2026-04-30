import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../lib/apiClient';

const BRAND = '#22ae9e';

interface Props {
  visible: boolean;
  event: any;
  onClose: () => void;
}

export default function VideoAppointmentModal({ visible, event, onClose }: Props) {
  const [isJoinable, setJoinable] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!visible || !event) return;

    const checkTime = () => {
      const now = new Date();
      const startTime = new Date(event.start);
      // Can join 5 minutes before
      const fiveMinutesBefore = new Date(startTime.getTime() - 5 * 60 * 1000);

      if (now >= fiveMinutesBefore) {
        setJoinable(true);
        setCountdown('You can start the call now.');
      } else {
        setJoinable(false);
        const diff = fiveMinutesBefore.getTime() - now.getTime();
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setCountdown(`Call can be started in ${minutes}m ${seconds}s`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [visible, event]);

  const handleStartCall = async () => {
    setLoading(true);
    try {
      // Mirror the web's signalCallStart
      await apiClient.post('/api/video/start-call', { appointmentId: event.id });
      
      // Close modal and navigate to WebView
      onClose();
      navigation.navigate('VideoModule', {
        appointmentId: event.id,
      });
    } catch (err) {
      console.error('Failed to start call', err);
      // Fallback navigate anyway in case the backend already flagged it as started
      onClose();
      navigation.navigate('VideoModule', {
        appointmentId: event.id,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="videocam" size={24} color="#3b82f6" />
              <Text style={styles.headerTitle}>Video Consultation</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.patientName}>{event.extendedProps?.patientName}</Text>
            
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.timeText}>
                Scheduled for: {new Date(event.start).toLocaleString()}
              </Text>
            </View>

            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: isJoinable ? '#f0fdf4' : '#fffbeb',
                  borderColor: isJoinable ? '#bbf7d0' : '#fef08a',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isJoinable ? '#166534' : '#92400e' },
                ]}
              >
                {countdown}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !isJoinable && styles.primaryBtnDisabled,
              ]}
              onPress={handleStartCall}
              disabled={!isJoinable || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Start Call</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  content: {
    padding: 20,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  timeText: {
    color: '#64748b',
    fontSize: 14,
  },
  statusBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: BRAND,
  },
  primaryBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
