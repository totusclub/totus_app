import React, {useEffect, useState} from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Animated,
} from 'react-native';
import {
    getCallState,
    getActiveCallInfo,
    endCall,
} from '../../../modules/voip/VoipService';

type MinimizedCallViewProps = {
    onExpand: () => void;
};

export const MinimizedCallView: React.FC<MinimizedCallViewProps> = ({onExpand}) => {
    const [callState, setCallState] = useState(getCallState());
    const [callInfo, setCallInfo] = useState(getActiveCallInfo());
    const [callSeconds, setCallSeconds] = useState(0);
    const pulseAnim = useState(new Animated.Value(1))[0];

    // Update call state every 500ms
    useEffect(() => {
        const interval = setInterval(() => {
            const state = getCallState();
            const info = getActiveCallInfo();
            setCallState(state);
            setCallInfo(info);

            if (info.isActive && info.startedAt) {
                const diffSec = Math.floor((Date.now() - info.startedAt) / 1000);
                setCallSeconds(diffSec);
            } else {
                setCallSeconds(0);
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Pulse animation for incoming calls
    useEffect(() => {
        const currentState = getCallState();
        if (currentState.state === 'ringing') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [callState.state]);

    const formatCallTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleEndCall = (e: any) => {
        e.stopPropagation();
        endCall();
    };

    const currentState = getCallState();
    if (currentState.state === 'idle' || currentState.state === 'ended' || currentState.state === 'rejected') {
        return null;
    }

    const displayName = currentState.callerName || 'Неизвестный';
    const isActive = currentState.state === 'answered';
    const isRinging = currentState.state === 'ringing';

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            <TouchableOpacity
                style={styles.container}
                onPress={onExpand}
                activeOpacity={0.9}
                pointerEvents="auto">
                <Animated.View 
                    style={[
                        styles.content,
                        isRinging && { transform: [{ scale: pulseAnim }] }
                    ]}>
                    <View style={[styles.avatar, isRinging && styles.avatarRinging]}>
                        <Text style={styles.avatarText}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                        {isRinging && <View style={styles.ringingIndicator} />}
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>
                            {displayName}
                        </Text>
                        {isActive && callInfo.isActive ? (
                            <View style={styles.timerContainer}>
                                <View style={styles.activeIndicator} />
                                <Text style={styles.timer}>{formatCallTime(callSeconds)}</Text>
                            </View>
                        ) : (
                            <Text style={styles.status}>
                                {isRinging ? 'Входящий звонок' : 'Вызов...'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.actions}>
                        {isActive ? (
                            <TouchableOpacity
                                style={styles.endButton}
                                onPress={handleEndCall}
                                activeOpacity={0.7}>
                                <Text style={styles.endButtonText}>✕</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.callIcon}>
                                <Text style={styles.callIconText}>📞</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingHorizontal: 16,
        pointerEvents: 'box-none',
    },
    container: {
        pointerEvents: 'auto',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(99,102,241,0.3)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
        minHeight: 72,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#667eea',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    avatarRinging: {
        borderColor: '#10b981',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        zIndex: 2,
    },
    ringingIndicator: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(16,185,129,0.3)',
        borderRadius: 26,
    },
    info: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center',
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
        marginRight: 8,
    },
    timer: {
        fontSize: 14,
        color: '#fbbf24',
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        letterSpacing: 0.5,
    },
    status: {
        fontSize: 13,
        color: '#9ca3af',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    endButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderWidth: 1.5,
        borderColor: 'rgba(239,68,68,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    endButtonText: {
        fontSize: 20,
        color: '#fca5a5',
        fontWeight: '400',
    },
    callIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99,102,241,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callIconText: {
        fontSize: 20,
    },
});
