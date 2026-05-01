import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Daily, { DailyCall, DailyParticipant, DailyMediaView } from '@daily-co/react-native-daily-js';

// FIX: Use your centralized API client to guarantee Auth Tokens are attached!
import apiClient from '../lib/apiClient';

// --- TypeScript Interfaces ---
type RootStackParamList = {
  VideoModule: { appointmentId: string };
  Dashboard: undefined;
};
type VideoModuleScreenRouteProp = RouteProp<RootStackParamList, 'VideoModule'>;

interface Props {
  route: VideoModuleScreenRouteProp;
}

// --- Billing Helper ---
const checkVideoStatus = async (currentDurationMinutes: number) => {
    try {
        // FIX: Replaced raw fetch with apiClient
        const response: any = await apiClient.post('/api/video/check-status', { currentDurationMinutes });
        return response;
    } catch (e) { 
        return { status: 'error' }; 
    }
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoModuleScreen({ route }: any) {
    const { appointmentId } = route.params;
    const navigation = useNavigation<any>();
    
    const [callObject, setCallObject] = useState<DailyCall | null>(null);
    const [localParticipant, setLocalParticipant] = useState<DailyParticipant | null>(null);
    const [remoteParticipant, setRemoteParticipant] = useState<DailyParticipant | null>(null);
    
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const [callDuration, setCallDuration] = useState(0);
    const [isPaidMode, setIsPaidMode] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [costPerMin, setCostPerMin] = useState(0.80);
    const [isConnecting, setIsConnecting] = useState(true);

    useEffect(() => {
        const initCall = async () => {
            try {
                // FIX: Use apiClient so the Supabase Bearer token is automatically attached
                const response: any = await apiClient.post('/api/video/provision-room', { appointmentId });
                const { roomUrl, token } = response;

                const co = Daily.createCallObject();
                setCallObject(co);

                const updateParticipants = () => {
                    const participants = co.participants();
                    const local = participants.local;
                    const remote = Object.values(participants).find(p => !p.local);
                    
                    setLocalParticipant(local as DailyParticipant);
                    setRemoteParticipant((remote as DailyParticipant) || null);
                };

                co.on('joined-meeting', () => {
                    setIsConnecting(false);
                    updateParticipants();
                });
                co.on('participant-joined', updateParticipants);
                co.on('participant-updated', updateParticipants);
                co.on('participant-left', updateParticipants);
                co.on('error', (e: any) => {
                    Alert.alert('Connection Error', e.errorMsg, [{ text: 'OK', onPress: handleEndCall }]);
                });

                await co.join({ url: roomUrl, token });
            } catch (err: any) {
                setIsConnecting(false);
                Alert.alert(
                    'Connection Failed', 
                    err.message || 'Could not securely provision the video room.',
                    [{ text: 'Go Back', onPress: () => navigation.goBack() }]
                );
            }
        };

        initCall();

        return () => {
            if (callObject) {
                callObject.leave().then(() => callObject.destroy());
            }
        };
    }, [appointmentId]);

    // Timer
    useEffect(() => {
        if (!callObject || isConnecting) return;
        const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, [callObject, isConnecting]);

    // Status Checker
    useEffect(() => {
        if (callDuration > 0 && callDuration % 60 === 0) {
            performStatusCheck(callDuration / 60);
        }
    }, [callDuration]);

    useEffect(() => {
        // Only run if the call is active and we've finished connecting
        if (!callObject || isConnecting) return;
        let timeoutId: ReturnType<typeof setTimeout>;

        // If there is no remote participant (patient hasn't joined)
        if (!remoteParticipant) {
            timeoutId = setTimeout(() => {
                Alert.alert(
                    "Patient No-Show", 
                    "The patient did not join in time. Ending call to save limits.",
                    [{ text: "OK", onPress: handleEndCall }]
                );
            }, 5 * 60 * 1000); // 5 minutes
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [callObject, isConnecting, remoteParticipant]);

    const performStatusCheck = async (currentMins: number) => {
        if (showPaymentModal) return;
        const result = await checkVideoStatus(currentMins);

        if (result.status === 'warning' && result.mode === 'limit_reached') {
            setCostPerMin(result.cost_per_min || 0.80);
            setShowPaymentModal(true);
        } else if (result.status === 'allowed' && result.mode === 'paid' && !isPaidMode) {
            setIsPaidMode(true);
            Alert.alert('Paid Mode', `Switched to Paid Mode (₹${result.charged}/min)`);
        } else if (result.status === 'cut') {
            handleEndCall();
            Alert.alert('Call Ended', result.message || "Insufficient funds.");
        }
    };

    const handleContinuePaid = async () => {
        setShowPaymentModal(false);
        setIsPaidMode(true);
        const result = await checkVideoStatus(Math.floor(callDuration / 60) + 1);
        if (result.status === 'cut') handleEndCall();
    };

    const handleEndCall = () => {
        callObject?.leave().then(() => callObject?.destroy());
        navigation.navigate('Tabs', { screen: 'Home' });
    };

    const toggleMic = () => {
        callObject?.setLocalAudio(!micOn);
        setMicOn(!micOn);
    };

    const toggleCamera = () => {
        callObject?.setLocalVideo(!cameraOn);
        setCameraOn(!cameraOn);
    };

    if (isConnecting) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#22ae9e" />
                <Text style={{ color: '#fff', marginTop: 12 }}>Securing Connection...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <View style={[styles.timerBadge, isPaidMode && styles.timerPaid]}>
                    <Ionicons name="time" size={16} color="#fff" />
                    <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
                </View>
            </View>

            <View style={styles.remoteContainer}>
                {remoteParticipant?.videoTrack ? (
                    <DailyMediaView
                        videoTrack={(remoteParticipant.videoTrack as any) || null}
                        audioTrack={(remoteParticipant.audioTrack as any) || null}
                        style={StyleSheet.absoluteFillObject}
                        objectFit="cover"
                    />
                ) : (
                    <View style={styles.waitingRoom}>
                        <Ionicons name="people" size={48} color="#475569" />
                        <Text style={styles.waitingText}>Waiting for patient to join...</Text>
                    </View>
                )}
            </View>

            {localParticipant?.videoTrack && cameraOn && (
                <View style={styles.localContainer}>
                    <DailyMediaView
                        videoTrack={(localParticipant.videoTrack as any) || null}
                        audioTrack={(localParticipant.audioTrack as any) || null}
                        style={StyleSheet.absoluteFillObject}
                        objectFit="cover"
                        mirror={true}
                    />
                    {!micOn && (
                        <View style={styles.mutedBadge}>
                            <Ionicons name="mic-off" size={14} color="#ef4444" />
                        </View>
                    )}
                </View>
            )}

            <View style={styles.controls}>
                <TouchableOpacity onPress={toggleMic} style={[styles.btn, !micOn && styles.btnOff]}>
                    <Ionicons name={micOn ? "mic" : "mic-off"} size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEndCall} style={[styles.btn, styles.btnEnd]}>
                    <Ionicons name="call" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleCamera} style={[styles.btn, !cameraOn && styles.btnOff]}>
                    <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {showPaymentModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Free Limit Reached</Text>
                        <Text style={styles.modalText}>Your free 15 minutes are up. Continue for ₹{costPerMin.toFixed(2)}/min?</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtnEnd} onPress={handleEndCall}>
                                <Text style={styles.modalBtnText}>End Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnContinue} onPress={handleContinuePaid}>
                                <Text style={styles.modalBtnText}>Continue (Paid)</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    topBar: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20, gap: 6 },
    timerPaid: { backgroundColor: '#d97706' },
    timerText: { color: '#fff', fontWeight: 'bold' },
    remoteContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    waitingRoom: { alignItems: 'center', gap: 10 },
    waitingText: { color: '#94a3b8', fontSize: 16 },
    localContainer: { position: 'absolute', top: 50, right: 20, width: 110, height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#22ae9e', zIndex: 5 },
    mutedBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 10 },
    controls: { position: 'absolute', bottom: 60, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 30, zIndex: 10 },
    btn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
    btnOff: { backgroundColor: '#ef4444' },
    btnEnd: { backgroundColor: '#ef4444', transform: [{ rotate: '135deg' }], width: 64, height: 64, borderRadius: 32 },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
    modalCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    modalText: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalBtnEnd: { flex: 1, padding: 12, backgroundColor: '#cbd5e1', borderRadius: 8, alignItems: 'center' },
    modalBtnContinue: { flex: 1, padding: 12, backgroundColor: '#22c55e', borderRadius: 8, alignItems: 'center' },
    modalBtnText: { fontWeight: 'bold', color: '#0f172a' }
});