import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

// ⚠️ IMPORTANT: Do NOT import @daily-co/react-native-daily-js at the top level!
// The Daily.co SDK eagerly initializes WebRTC native modules on import.
// If those native modules aren't linked (e.g. Expo Go, or stale dev build),
// it crashes the ENTIRE JS bundle before React even mounts — causing the
// "stuck splash screen" issue.
//
// Instead, we lazy-load it inside the component via require().

export default function VideoRoomScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const c = useColors();

  const { url, token, doctorName } = route.params || {};

  const [callObject, setCallObject] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [localParticipant, setLocalParticipant] = useState<any>(null);
  const [remoteParticipant, setRemoteParticipant] = useState<any>(null);
  const [DailyMediaViewComponent, setDailyMediaViewComponent] = useState<any>(null);

  useEffect(() => {
    if (!url) {
      Alert.alert('Error', 'No video URL provided.');
      navigation.goBack();
      return;
    }

    initDailyCall();

    return () => {
      leaveCall();
    };
  }, [url]);

  const initDailyCall = async () => {
    try {
      // Lazy-load Daily.co SDK — this is the key fix!
      console.log('[VideoRoom] Lazy-loading Daily.co SDK...');
      const DailyModule = require('@daily-co/react-native-daily-js');
      const Daily = DailyModule.default || DailyModule;
      const { DailyMediaView } = DailyModule;
      setDailyMediaViewComponent(() => DailyMediaView);
      console.log('[VideoRoom] Daily.co SDK loaded successfully.');

      const co = Daily.createCallObject();
      setCallObject(co);

      // Event Listeners
      co.on('joined-meeting', handleJoinedMeeting);
      co.on('participant-joined', handleParticipantUpdate);
      co.on('participant-updated', handleParticipantUpdate);
      co.on('participant-left', handleParticipantLeft);
      co.on('error', handleError);

      // Join the call
      await co.join({ url, token });
    } catch (err: any) {
      console.error('[VideoRoom] Failed to initialize Daily call:', err?.message || err);
      setIsConnecting(false);
      setLoadError(err?.message || 'Could not join the video call.');
      Alert.alert(
        'Video Call Error',
        'Could not initialize the video call. This feature requires a native build (not Expo Go).\n\n' + (err?.message || '')
      );
    }
  };

  const handleJoinedMeeting = (e: any) => {
    setIsConnecting(false);
    updateParticipants(e.participants);
  };

  const handleParticipantUpdate = (e: any) => {
    if (!callObject) return;
    updateParticipants(callObject.participants());
  };

  const handleParticipantLeft = (e: any) => {
    if (!callObject) return;
    updateParticipants(callObject.participants());
    if (e.participant.session_id === remoteParticipant?.session_id) {
      Alert.alert('Doctor left', 'The doctor has left the meeting.');
    }
  };

  const handleError = (e: any) => {
    console.error('[VideoRoom] Daily.co Error:', e);
    Alert.alert('Video Error', e?.errorMsg || 'An unknown error occurred.');
  };

  const updateParticipants = (participants: Record<string, any>) => {
    const pList = Object.values(participants);
    const local = pList.find((p: any) => p.local);
    const remote = pList.find((p: any) => !p.local);

    setLocalParticipant(local || null);
    setRemoteParticipant(remote || null);
  };

  const leaveCall = useCallback(async () => {
    if (callObject) {
      await callObject.leave();
      await callObject.destroy();
      setCallObject(null);
    }
    navigation.goBack();
  }, [callObject, navigation]);

  const toggleCamera = () => {
    if (!callObject) return;
    const nextState = !cameraOn;
    callObject.setLocalVideo(nextState);
    setCameraOn(nextState);
  };

  const toggleMic = () => {
    if (!callObject) return;
    const nextState = !micOn;
    callObject.setLocalAudio(nextState);
    setMicOn(nextState);
  };

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: '#1e293b' }]}>
        <Ionicons name="warning" size={48} color="#ef4444" />
        <Text style={{ color: '#fff', marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
          {loadError}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: c.brand, borderRadius: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isConnecting) {
    return (
      <View style={[styles.center, { backgroundColor: '#1e293b' }]}>
        <ActivityIndicator size="large" color={c.brand} />
        <Text style={{ color: '#fff', marginTop: 16 }}>Connecting to Dr. {doctorName || 'Doctor'}...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0f172a' }]}>
      {/* Remote Video (Doctor) */}
      <View style={styles.remoteContainer}>
        {remoteParticipant?.videoTrack && DailyMediaViewComponent ? (
          <DailyMediaViewComponent
            videoTrack={remoteParticipant.videoTrack}
            audioTrack={remoteParticipant.audioTrack}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
          />
        ) : (
          <View style={styles.center}>
            <Ionicons name="people" size={48} color="#475569" />
            <Text style={{ color: '#94a3b8', marginTop: 12 }}>Waiting for Dr. {doctorName || 'Doctor'} to join...</Text>
          </View>
        )}
      </View>

      {/* Local Video (Patient) */}
      {localParticipant?.videoTrack && cameraOn && DailyMediaViewComponent && (
        <View style={styles.localContainer}>
          <DailyMediaViewComponent
            videoTrack={localParticipant.videoTrack}
            audioTrack={localParticipant.audioTrack || null}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: micOn ? 'rgba(255,255,255,0.2)' : '#ef4444' }]} 
          onPress={toggleMic}
        >
          <Ionicons name={micOn ? "mic" : "mic-off"} size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: '#ef4444', transform: [{ scale: 1.2 }] }]} 
          onPress={leaveCall}
        >
          <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: cameraOn ? 'rgba(255,255,255,0.2)' : '#ef4444' }]} 
          onPress={toggleCamera}
        >
          <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  remoteContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    margin: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  localContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 100,
    height: 150,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

