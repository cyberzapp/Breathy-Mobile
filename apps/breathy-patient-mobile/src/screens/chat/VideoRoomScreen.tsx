import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import ErrorModal from '../../components/ui/ErrorModal';
import NotificationModal from '../../components/ui/NotificationModal';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { getDailyVideoToken } from '../../services/patientService';

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

  const { appointmentId, doctorName } = route.params || {};

  const [callObject, setCallObject] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [localParticipant, setLocalParticipant] = useState<any>(null);
  const [remoteParticipant, setRemoteParticipant] = useState<any>(null);
  const [DailyMediaViewComponent, setDailyMediaViewComponent] = useState<any>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // --- PiP Drag Setup ---
  const pan = useRef(new Animated.ValueXY()).current;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // PiP dimensions (from styles.localContainer)
  const pipWidth = 100;
  const pipHeight = 150;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        
        let newX = (pan.x as any)._value;
        let newY = (pan.y as any)._value;

        // Snapping boundaries calculation
        // Initial position is top: 60, right: 24 (which maps to x=0, y=0)
        // Move left goes negative X. Min X is when the left edge hits the screen left edge (with some padding)
        const minX = -(screenWidth - pipWidth - 48); // 24px padding on both sides
        const maxX = 0; // The right edge cannot go past the initial right: 24
        
        const minY = -40; // The top edge cannot go past top: 20
        const maxY = screenHeight - pipHeight - 60 - 150; // The bottom edge leaves room for controls

        if (newX < minX) newX = minX;
        if (newX > maxX) newX = maxX;
        if (newY < minY) newY = minY;
        if (newY > maxY) newY = maxY;

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      }
    })
  ).current;

  useEffect(() => {
    if (!appointmentId) {
      setErrorModalMsg('No appointment ID provided.');
      navigation.goBack();
      return;
    }

    initDailyCall();

    return () => {
      leaveCall();
    };
  }, [appointmentId]);

  const initDailyCall = async () => {
    try {
      // Fetch the token and room URL from the backend
      const response: any = await getDailyVideoToken(appointmentId);
      const { roomUrl, token } = response;

      // Lazy-load Daily.co SDK
      console.log('[VideoRoom] Lazy-loading Daily.co SDK...');
      const DailyModule = require('@daily-co/react-native-daily-js');
      const Daily = DailyModule.default || DailyModule;
      const { DailyMediaView } = DailyModule;
      setDailyMediaViewComponent(() => DailyMediaView);
      console.log('[VideoRoom] Daily.co SDK loaded successfully.');

      const co = Daily.createCallObject();
      setCallObject(co);

      // Setup Auto-Disconnect Logic (5 minutes if doctor doesn't join)
      let noShowTimeout: any;
      const handleParticipantCount = () => {
        if (noShowTimeout) clearTimeout(noShowTimeout);
        const pCount = Object.keys(co.participants()).length;
        if (pCount <= 1) {
          noShowTimeout = setTimeout(() => {
            setNoticeMsg("The doctor did not join the call in time. Ending automatically.");
          }, 5 * 60 * 1000);
        }
      };

      const updateParticipantsList = () => {
        const participants = co.participants();
        const pList = Object.values(participants);
        const local = pList.find((p: any) => p.local);
        const remote = pList.find((p: any) => !p.local);

        setLocalParticipant(local || null);
        setRemoteParticipant(remote || null);
      };

      // Event Listeners
      co.on('joined-meeting', () => {
        setIsConnecting(false);
        updateParticipantsList();
        handleParticipantCount();
      });
      
      co.on('participant-joined', () => {
        updateParticipantsList();
        handleParticipantCount();
      });
      
      co.on('participant-updated', updateParticipantsList);
      
      co.on('participant-left', (e: any) => {
        updateParticipantsList();
        handleParticipantCount();
        if (e.participant && !e.participant.local) {
          setNoticeMsg('The doctor has left the meeting.');
        }
      });
      
      co.on('error', (e: any) => {
        console.error('[VideoRoom] Daily.co Error:', e);
        setErrorModalMsg(e?.errorMsg || 'An unknown error occurred.');
      });

      // Join the call
      await co.join({ url: roomUrl, token });
    } catch (err: any) {
      console.error('[VideoRoom] Failed to initialize Daily call:', err?.message || err);
      setIsConnecting(false);
      setLoadError(err?.message || 'Could not join the video call.');
      setErrorModalMsg(
        'Could not initialize the video call. This feature requires a native build (not Expo Go).\n\n' + (err?.message || '')
      );
    }
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
            videoTrack={remoteParticipant.videoTrack || null}
            audioTrack={remoteParticipant.audioTrack || null}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
          />
        ) : (
          <View style={styles.center}>
            <View style={styles.pulseCircle}>
              <Ionicons name="people" size={48} color={c.brand} />
            </View>
            <Text style={{ color: '#f1f5f9', marginTop: 16, fontSize: 18, fontWeight: '600' }}>
              Waiting for Dr. {doctorName || 'Doctor'}...
            </Text>
            <Text style={{ color: '#94a3b8', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
              They will join this secure room shortly.
            </Text>
          </View>
        )}
      </View>

      {/* Local Video (Patient) */}
      {localParticipant?.videoTrack && cameraOn && DailyMediaViewComponent && (
        <Animated.View 
          style={[styles.localContainer, { transform: pan.getTranslateTransform() }]} 
          {...panResponder.panHandlers}
        >
          <DailyMediaViewComponent
            videoTrack={localParticipant.videoTrack}
            audioTrack={localParticipant.audioTrack || null}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
            mirror={true}
          />
        </Animated.View>
      )}

      {/* Controls */}
      <View style={styles.controlsDockWrapper}>
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: micOn ? 'rgba(255,255,255,0.15)' : '#ef4444' }]} 
            onPress={toggleMic}
          >
            <Ionicons name={micOn ? "mic" : "mic-off"} size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#ef4444', transform: [{ scale: 1.1 }] }]} 
            onPress={leaveCall}
          >
            <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: cameraOn ? 'rgba(255,255,255,0.15)' : '#ef4444' }]} 
            onPress={toggleCamera}
          >
            <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ErrorModal
        visible={!!errorModalMsg}
        message={errorModalMsg || ''}
        onClose={() => setErrorModalMsg(null)}
      />
      <NotificationModal
        visible={!!noticeMsg}
        title="Doctor Left"
        message={noticeMsg || ''}
        onClose={() => { setNoticeMsg(null); leaveCall(); }}
      />
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
    backgroundColor: '#0f172a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22ae9e', // Brand color border
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  controlsDockWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Translucent dark dock
    borderRadius: 40,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 174, 158, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 174, 158, 0.3)',
  },
});

