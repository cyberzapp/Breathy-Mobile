import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BRAND = '#22ae9e';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type UpdatePhase = 'idle' | 'available' | 'downloading' | 'ready' | 'error';

interface Props {
    visible: boolean;
    phase: UpdatePhase;
    progress: number; // 0–100
    forceUpdate?: boolean;
    onUpdate: () => void;
    onDismiss: () => void;
    onRetry?: () => void;
}

export default function UpdateModal({
    visible,
    phase,
    progress,
    forceUpdate = false,
    onUpdate,
    onDismiss,
    onRetry,
}: Props) {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    // Entrance animation
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 65,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }
    }, [visible]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const getContent = () => {
        switch (phase) {
            case 'available':
                return {
                    icon: 'sparkles' as const,
                    iconColor: '#f59e0b',
                    title: 'Update Available',
                    subtitle: 'A new version of the app is ready. Update now for the latest features and fixes.',
                };
            case 'downloading':
                return {
                    icon: 'cloud-download' as const,
                    iconColor: BRAND,
                    title: 'Downloading Update…',
                    subtitle: `${Math.round(progress)}% complete`,
                };
            case 'ready':
                return {
                    icon: 'checkmark-circle' as const,
                    iconColor: '#22c55e',
                    title: 'Update Ready',
                    subtitle: 'The update has been downloaded. Restart to apply the latest version.',
                };
            case 'error':
                return {
                    icon: 'warning' as const,
                    iconColor: '#ef4444',
                    title: 'Update Failed',
                    subtitle: 'Something went wrong while downloading the update. Please try again.',
                };
            default:
                return { icon: 'sparkles' as const, iconColor: BRAND, title: '', subtitle: '' };
        }
    };

    const content = getContent();

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* ── Gradient Header ── */}
                    <View style={styles.header}>
                        <View style={styles.headerGradient}>
                            <View style={[styles.iconCircle, { backgroundColor: content.iconColor + '20' }]}>
                                <Ionicons name={content.icon} size={32} color={content.iconColor} />
                            </View>
                        </View>
                    </View>

                    {/* ── Body ── */}
                    <View style={styles.body}>
                        <Text style={styles.title}>{content.title}</Text>
                        <Text style={styles.subtitle}>{content.subtitle}</Text>

                        {/* Progress Bar — shown during download or ready */}
                        {(phase === 'downloading' || phase === 'ready') && (
                            <View style={styles.progressTrack}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: progressWidth,
                                            backgroundColor: phase === 'ready' ? '#22c55e' : BRAND,
                                        },
                                    ]}
                                />
                            </View>
                        )}

                        {/* ── Actions ── */}
                        <View style={styles.actions}>
                            {phase === 'available' && (
                                <>
                                    <TouchableOpacity style={styles.primaryBtn} onPress={onUpdate} activeOpacity={0.8}>
                                        <Ionicons name="download-outline" size={18} color="#fff" />
                                        <Text style={styles.primaryBtnText}>Update Now</Text>
                                    </TouchableOpacity>
                                    {!forceUpdate && (
                                        <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
                                            <Text style={styles.secondaryBtnText}>Not Now</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}

                            {phase === 'ready' && (
                                <>
                                    <TouchableOpacity style={styles.primaryBtn} onPress={onUpdate} activeOpacity={0.8}>
                                        <Ionicons name="refresh" size={18} color="#fff" />
                                        <Text style={styles.primaryBtnText}>Restart Now</Text>
                                    </TouchableOpacity>
                                    {!forceUpdate && (
                                        <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
                                            <Text style={styles.secondaryBtnText}>Later</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}

                            {phase === 'error' && (
                                <>
                                    <TouchableOpacity style={styles.primaryBtn} onPress={onRetry} activeOpacity={0.8}>
                                        <Ionicons name="reload" size={18} color="#fff" />
                                        <Text style={styles.primaryBtnText}>Retry</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
                                        <Text style={styles.secondaryBtnText}>Dismiss</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {forceUpdate && phase !== 'downloading' && (
                            <Text style={styles.forceHint}>This is a required update.</Text>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    sheet: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 20,
    },
    header: {
        paddingTop: 32,
        paddingBottom: 8,
        alignItems: 'center',
    },
    headerGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        paddingHorizontal: 28,
        paddingBottom: 28,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        marginTop: 20,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    actions: {
        width: '100%',
        marginTop: 24,
        gap: 10,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND,
        paddingVertical: 15,
        borderRadius: 14,
        gap: 8,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    secondaryBtnText: {
        color: '#64748b',
        fontSize: 15,
        fontWeight: '600',
    },
    forceHint: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center',
    },
});
