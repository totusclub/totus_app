
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Platform,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
    getCallState,
    getActiveCallInfo,
    getCurrentUserId,
    getConnectionStatus,
    getCurrentNetworkStatus,
    toggleMute,
    toggleSpeakerMode,
    endCall,
    rejectCall,
    answerCall,
    getCurrentLoyaltyId,
} from '../../../modules/voip/VoipService';
import NetInfo from '@react-native-community/netinfo';
import { getUserByLoyaltyId } from '../../../modules/api/users';
import { AppIcon } from '../index';
import MuteIcon from '../icons/mute';
import SpeakerIcon from '../icons/speaker';
import { useTheme } from '../../../hooks/useTheme';

type CallModalProps = {
    visible: boolean;
    onClose?: () => void;
    onMinimize?: () => void;
};

export const CallModal: React.FC<CallModalProps> = ({ visible, onClose, onMinimize }) => {
    const { theme, isDark } = useTheme();
    const [callState, setCallState] = useState(getCallState());
    const [callInfo, setCallInfo] = useState(getActiveCallInfo());
    const [connectionStatus, setConnectionStatus] = useState(getConnectionStatus());
    const [networkStatus, setNetworkStatus] = useState(getCurrentNetworkStatus());
    const [connectionQuality, setConnectionQuality] = useState<'low' | 'high' | 'none'>('none');
    const [callSeconds, setCallSeconds] = useState(0);
    const [callerPhone, setCallerPhone] = useState<string | null>(null);
    const currentUserId = getCurrentUserId();

    // Update call state immediately when modal becomes visible
    useEffect(() => {
        if (visible) {
            const state = getCallState();
            const info = getActiveCallInfo();
            const connStatus = getConnectionStatus();
            const netStatus = getCurrentNetworkStatus();
            setCallState(state);
            setCallInfo(info);
            setConnectionStatus(connStatus);
            setNetworkStatus(netStatus);

            // Try to get caller phone number if we have caller name
            if (state.callerName) {
                // Extract loyaltyId from callerName or try to find user
                // For now, we'll try to get it from the call state if available
                // This is a placeholder - you may need to pass loyaltyId through call state
            }
        }
    }, [visible]);

    // Fetch caller phone number when call state changes
    useEffect(() => {
        const fetchCallerInfo = async () => {
            // Try to get loyaltyId from call state or other source
            // This is a placeholder - adjust based on your actual data structure
            const state = getCallState();
            if (state.callerName && state.callUUID) {
                // You might need to extract loyaltyId from callerName or store it in call state
                // For now, we'll leave phone as null or use a placeholder
                setCallerPhone(null);
            }
        };

        if (visible) {
            fetchCallerInfo();
        }
    }, [visible, callState.callerName]);

    // Listen to network status changes in real-time and determine connection quality
    useEffect(() => {
        if (!visible) return;

        const unsubscribe = NetInfo.addEventListener((state) => {
            const netStatus = {
                isConnected: state.isConnected ?? false,
                type: state.type,
                isInternetReachable: state.isInternetReachable ?? null,
            };
            setNetworkStatus(netStatus);

            // Determine connection quality (low/high)
            let quality: 'low' | 'high' | 'none' = 'none';
            if (netStatus.isConnected && netStatus.isInternetReachable !== false) {
                // High quality: WiFi or strong cellular (4G/5G)
                if (netStatus.type === 'wifi') {
                    quality = 'high';
                } else if (netStatus.type === 'cellular') {
                    // Check cellular generation if available
                    const details = (state as any).details;
                    if (details) {
                        const cellularGeneration = details.cellularGeneration;
                        // High quality: 4G or 5G
                        if (cellularGeneration === '4g' || cellularGeneration === '5g') {
                            quality = 'high';
                        } else {
                            // Low quality: 2G or 3G
                            quality = 'low';
                        }
                    } else {
                        // Default to high for cellular if details not available
                        quality = 'high';
                    }
                } else {
                    // Other connection types default to high
                    quality = 'high';
                }
            }
            setConnectionQuality(quality);
        });

        return () => {
            unsubscribe();
        };
    }, [visible]);

    // Update call state every 500ms while visible (faster updates for connection status)
    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            const state = getCallState();
            const info = getActiveCallInfo();
            const connStatus = getConnectionStatus();
            const netStatus = getCurrentNetworkStatus();

            // Always update state to ensure UI reflects latest connection status
            setCallState(state);
            setCallInfo(info);
            setConnectionStatus(connStatus);
            setNetworkStatus(netStatus);

            // Update connection quality based on network status
            let quality: 'low' | 'high' | 'none' = 'none';
            if (netStatus.isConnected && netStatus.isInternetReachable !== false) {
                if (netStatus.type === 'wifi') {
                    quality = 'high';
                } else if (netStatus.type === 'cellular') {
                    // Default to high for cellular (will be updated by NetInfo listener with details)
                    quality = 'high';
                } else {
                    quality = 'high';
                }
            }
            setConnectionQuality(quality);

            // Debug log connection status occasionally
            if (state.state === 'answered' && Math.random() < 0.1) {
                console.log('📊 CallModal Connection Status:', {
                    callState: state.state,
                    isActive: info.isActive,
                    connectionState: connStatus.connectionState,
                    iceConnectionState: connStatus.iceConnectionState,
                    isConnecting: connStatus.isConnecting,
                    isConnected: connStatus.isConnected,
                });
            }

            // Update timer
            if (info.isActive && info.startedAt) {
                const diffSec = Math.floor((Date.now() - info.startedAt) / 1000);
                setCallSeconds(diffSec);
            } else {
                setCallSeconds(0);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [visible]);

    const formatCallTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getStateText = (state?: string) => {
        const stateToCheck = state ?? callState.state;
        switch (stateToCheck) {
            case 'calling':
                return 'Вызов...';
            case 'ringing':
                return 'Входящий звонок';
            case 'answered':
                return 'Разговор';
            case 'ended':
                return 'Звонок завершён';
            case 'rejected':
                return 'Звонок отклонён';
            default:
                return '';
        }
    };

    const handleMute = () => {
        // Toggle mute and get the new state immediately
        const newMuted = toggleMute();
        // Force immediate state update by getting fresh state from VoipService
        const freshState = getCallState();
        setCallState({
            ...freshState,
            isMuted: newMuted, // Use the returned value from toggleMute for immediate feedback
        });
        // console.log('handleMute: Mute toggled to', newMuted, 'fresh state:', freshState.isMuted);
    };

    const handleToggleSpeaker = () => {
        const newMode = toggleSpeakerMode();
        const fresh = getCallState();
        setCallState({
            ...fresh,
            speakerMode: newMode,
            isSpeakerEnabled: newMode === 'loudspeaker',
        });
    };

    const handleEndCall = () => {
        endCall();
        if (onClose) {
            onClose();
        }
    };

    const handleRejectCall = () => {
        const currentState = getCallState();
        if (currentState.callUUID) {
            rejectCall(currentState.callUUID);
        }
        if (onClose) {
            onClose();
        }
    };

    // Always read fresh state for visibility check (don't rely on stale internal state)
    const currentState = getCallState();

    // Only show modal if call is not idle
    if (!visible || currentState.state === 'idle') {
        return null;
    }

    // Use current state - always prefer fresh state from VoipService for real-time updates
    // This ensures mute/speaker buttons always show the correct state
    const effectiveState = currentState;

    const isIncoming = effectiveState.state === 'ringing';
    const isOutgoing = effectiveState.state === 'calling';
    const isActive = effectiveState.state === 'answered';
    const isEnded = effectiveState.state === 'ended' || effectiveState.state === 'rejected';
    // No answer: when call ended without being answered (for outgoing calls)
    const isNoAnswer = isEnded && !isActive && !isIncoming;

    // Determine display name based on call state
    const displayName = effectiveState.callerName || 'Неизвестный';
    const displayInitial = displayName.charAt(0).toUpperCase();

    // Format phone number for display
    const formatPhoneNumber = (phone: string | null): string => {
        if (!phone) {
            return '';
        }
        // Format phone number with spaces
        return phone.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    /** Same 64×64 circular control as end/reject/answer — muted / speaker toggles */
    const styleMuteCircle = () => [
        styles.actionCircle,
        styles.actionCircleNeutralShadow,
        {
            backgroundColor: effectiveState.isMuted
                ? isDark
                    ? 'rgba(239, 68, 68, 0.22)'
                    : 'rgba(239, 68, 68, 0.15)'
                : isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.06)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: effectiveState.isMuted ? theme.error : theme.border,
        },
    ];

    const styleSpeakerCircle = () => [
        styles.actionCircle,
        styles.actionCircleNeutralShadow,
        {
            backgroundColor:
                effectiveState.speakerMode === 'loudspeaker'
                    ? isDark
                        ? 'rgba(245, 158, 11, 0.22)'
                        : 'rgba(245, 158, 11, 0.18)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.06)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor:
                effectiveState.speakerMode === 'loudspeaker' ? theme.warning : theme.border,
        },
    ];

    return (
        <Modal
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            presentationStyle="fullScreen"
            transparent={true}>
    
            <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={[styles.cardHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                    {/* Internet Status - Left side of header */}
                    <View style={styles.headerInternetStatus}>
                        <Text allowFontScaling={false} style={[
                            styles.internetStatusText,
                            {
                                color: connectionQuality === 'high'
                                    ? isDark ? theme.success : '#22c55e' // Green for high in both modes
                                    : connectionQuality === 'low'
                                        ? isDark ? theme.warning : '#f59e0b' // Orange for low in both modes
                                        : isDark ? theme.error : '#ef4444' // Red for no connection in both modes
                            }
                        ]}>
                            {connectionQuality === 'high'
                                ? 'качество соединения - хорошее'
                                : connectionQuality === 'low'
                                    ? 'качество соединения низкий'
                                    : 'Нет подключения'}
                        </Text>
                    </View>
                    
                    <Text allowFontScaling={false} style={[styles.cardHeaderTitle, { color: theme.text }]}>Звонок</Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                            const currentState = getCallState();
                            if (onMinimize) {
                                onMinimize();
                            } else if (onClose) {
                                onClose();
                            }
                        }}
                        activeOpacity={0.7}>
                        <Text allowFontScaling={false} style={[styles.closeButtonText, { color: theme.textTertiary }]}>✕</Text>
                    </TouchableOpacity>
                </View>
                {/* White Card - Full Height */}
                <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
                    {/* Header */}


                    {/* Avatar Section with Background */}
                    <View style={[styles.contentWrapper, { backgroundColor: theme.background }]}>

                        <View style={[styles.avatarSection, { backgroundColor: theme.backgroundSecondary }]}>
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatar, { borderColor: theme.backgroundSecondary }]}>
                                    <Text allowFontScaling={false} style={[styles.avatarText, { color: theme.text }]}>{displayInitial}</Text>
                                </View>
                            </View>


                            {/* Caller Name */}
                            <Text allowFontScaling={false} style={[styles.callerName, { color: theme.text }]}>{displayName}</Text>

                            {/* Phone Number */}
                            <Text allowFontScaling={false} style={[styles.phoneNumber, { color: theme.textTertiary }]}>{formatPhoneNumber(callerPhone)}</Text>

                            {/* Connection Status - Show in all call states */}
                            {(connectionStatus?.connectionState || isIncoming || isOutgoing || isActive) && (
                                <Text allowFontScaling={false} style={[
                                    styles.connectionStatus,
                                    {
                                        color: connectionStatus?.isConnected 
                                            ? theme.success 
                                            : connectionStatus?.isConnecting 
                                            ? theme.warning 
                                            : isIncoming || isOutgoing
                                            ? theme.warning
                                            : theme.error
                                    }
                                ]}>
                                    {connectionStatus?.isConnected 
                                        ? 'Соединение установлено'
                                        : connectionStatus?.isConnecting 
                                        ? (connectionStatus.iceConnectionState === 'checking' && connectionStatus.connectionState !== 'new' 
                                            ? 'Соединение...'
                                            : 'Вызов...')
                                        : connectionStatus?.connectionState === 'failed' 
                                        ? 'Ошибка подключения' 
                                        : connectionStatus?.connectionState === 'disconnected' || connectionStatus?.connectionState === 'closed'
                                        ? 'Отключено'
                                        : isIncoming
                                        ? 'Ожидание ответа...'
                                        : isOutgoing
                                        ? 'Установка соединения...'
                                        : 'Ожидание...'}
                                </Text>
                            )}


                            {/* Incoming Call Status */}
                            {isIncoming && (
                                <Text allowFontScaling={false} style={[styles.incomingCallStatus, { color: theme.success }]}>Входящий звонок</Text>
                            )}

                            {/* Call Duration */}
                            {isActive && callInfo.isActive && (
                                <Text allowFontScaling={false} style={[styles.callDuration, { color: theme.text }]}>{formatCallTime(callSeconds)}</Text>
                            )}

                            {/* No Answer Status */}
                            {isNoAnswer && (
                                <Text allowFontScaling={false} style={[styles.noAnswerText, { color: theme.error }]}>Нет ответа</Text>
                            )}

                            {/* Outgoing (calling): same row layout as answered — SPEAKER | СБРОСИТЬ */}
                            {isOutgoing && !isEnded && !isNoAnswer && (
                                <View style={styles.controlsRow}>
                                    <View style={[
                                        styles.controlColumn,
                                        effectiveState.speakerMode === 'loudspeaker' && styles.controlColumnActive,
                                        effectiveState.speakerMode === 'loudspeaker' && { backgroundColor: theme.backgroundSecondary },
                                    ]}>
                                        <TouchableOpacity
                                            style={styleSpeakerCircle()}
                                            onPress={handleToggleSpeaker}
                                            activeOpacity={0.7}>
                                            <SpeakerIcon
                                                size={40}
                                                color={effectiveState.speakerMode === 'loudspeaker' ? theme.warning : theme.text}
                                            />
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[
                                            styles.actionButtonLabel,
                                            { color: effectiveState.speakerMode === 'loudspeaker' ? theme.warning : theme.text },
                                        ]}>SPEAKER</Text>
                                    </View>
                                    <LinearGradient
                                        colors={isDark
                                            ? ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']
                                            : ['rgba(39, 39, 39, 0)', 'rgba(39, 39, 39, 0.2)', 'rgba(39, 39, 39, 0)']}
                                        locations={[0, 0.4844, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.controlsDivider}
                                    />
                                    <View style={styles.controlColumn}>
                                        <TouchableOpacity
                                            style={[styles.actionCircle, styles.actionCircleDanger]}
                                            onPress={handleEndCall}
                                            activeOpacity={0.8}>
                                            <AppIcon name="phone" size={24} color="#FFFFFF" />
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[styles.actionButtonLabel, { color: theme.textTertiary }]}>СБРОСИТЬ</Text>
                                    </View>
                                </View>
                            )}

                            {/* Answered: MUTE | SPEAKER | СБРОСИТЬ — same horizontal row + dividers */}
                            {isActive && !isNoAnswer && (
                                <View style={styles.controlsRow}>
                                    <View style={[
                                        styles.controlColumn,
                                        effectiveState.isMuted && styles.controlColumnActive,
                                        effectiveState.isMuted && { backgroundColor: theme.backgroundSecondary },
                                    ]}>
                                        <TouchableOpacity
                                            style={styleMuteCircle()}
                                            onPress={handleMute}
                                            activeOpacity={0.7}>
                                            <MuteIcon
                                                size={40}
                                                color={effectiveState.isMuted ? theme.error : theme.text}
                                            />
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[
                                            styles.actionButtonLabel,
                                            { color: effectiveState.isMuted ? theme.error : theme.text },
                                        ]}>MUTE</Text>
                                    </View>
                                    <LinearGradient
                                        colors={isDark
                                            ? ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']
                                            : ['rgba(39, 39, 39, 0)', 'rgba(39, 39, 39, 0.2)', 'rgba(39, 39, 39, 0)']}
                                        locations={[0, 0.4844, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.controlsDivider}
                                    />
                                    <View style={[
                                        styles.controlColumn,
                                        effectiveState.speakerMode === 'loudspeaker' && styles.controlColumnActive,
                                        effectiveState.speakerMode === 'loudspeaker' && { backgroundColor: theme.backgroundSecondary },
                                    ]}>
                                        <TouchableOpacity
                                            style={styleSpeakerCircle()}
                                            onPress={handleToggleSpeaker}
                                            activeOpacity={0.7}>
                                            <SpeakerIcon
                                                size={40}
                                                color={effectiveState.speakerMode === 'loudspeaker' ? theme.warning : theme.text}
                                            />
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[
                                            styles.actionButtonLabel,
                                            { color: effectiveState.speakerMode === 'loudspeaker' ? theme.warning : theme.text },
                                        ]}>SPEAKER</Text>
                                    </View>
                                    <LinearGradient
                                        colors={isDark
                                            ? ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']
                                            : ['rgba(39, 39, 39, 0)', 'rgba(39, 39, 39, 0.2)', 'rgba(39, 39, 39, 0)']}
                                        locations={[0, 0.4844, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.controlsDivider}
                                    />
                                    <View style={styles.controlColumn}>
                                        <TouchableOpacity
                                            style={[styles.actionCircle, styles.actionCircleDanger]}
                                            onPress={handleEndCall}
                                            activeOpacity={0.8}>
                                            <AppIcon name="phone" size={24} color="#FFFFFF" />
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[styles.actionButtonLabel, { color: theme.textTertiary }]}>СБРОСИТЬ</Text>
                                    </View>
                                </View>
                            )}

                            {/* Incoming Call Buttons - Side by Side */}
                            {isIncoming && effectiveState.callUUID && !isEnded && (
                                <View style={styles.incomingCallButtonsContainer}>
                                    {/* Reject Button (Left) */}
                                    <View style={styles.incomingCallButtonWrapper}>
                                        <TouchableOpacity
                                            style={[styles.actionCircle, styles.actionCircleDanger]}
                                            onPress={handleRejectCall}
                                            activeOpacity={0.8}>
                                            <AppIcon name="phone" size={24} color="#FFFFFF" />
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[styles.actionButtonLabel, { color: theme.textTertiary }]}>СБРОСИТЬ</Text>
                                    </View>


                                    {/* Divider with Linear Gradient */}
                                    <LinearGradient
                                        colors={isDark 
                                            ? ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']
                                            : ['rgba(39, 39, 39, 0)', 'rgba(39, 39, 39, 0.2)', 'rgba(39, 39, 39, 0)']}
                                        locations={[0, 0.4844, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.incomingCallDivider}
                                    />

                                    {/* Answer Button (Right) */}
                                    <View style={styles.incomingCallButtonWrapper}>
                                        <TouchableOpacity
                                            style={[styles.actionCircle, styles.actionCircleSuccess]}
                                            onPress={async () => {
                                                // Get fresh state to ensure we have the latest callUUID
                                                const freshState = getCallState();
                                                const callUUID = freshState.callUUID || effectiveState.callUUID;
                                                
                                                if (!callUUID) {
                                                    console.error('❌ Cannot answer call - no callUUID available');
                                                    console.error('   Fresh state:', freshState);
                                                    console.error('   Effective state:', effectiveState);
                                                    return;
                                                }
                                                
                                                console.log('📞 Answer button pressed in CallModal');
                                                console.log('   callUUID:', callUUID);
                                                console.log('   Current state:', freshState.state);
                                                
                                                try {
                                                    // Immediately update local state for instant UI feedback
                                                    // This shows "answered" state right away
                                                    setCallState({
                                                        ...freshState,
                                                        state: 'answered',
                                                    });
                                                    
                                                    // Answer the call using the same function as CallKeep
                                                    // This ensures identical behavior: stops ringtone, answers CallKeep, starts WebRTC
                                                    await answerCall(callUUID);
                                                    console.log('✅ Call answered from CallModal - using same function as CallKeep');
                                                    
                                                    // Force immediate state update after answer
                                                    // The polling interval will also update, but this ensures instant feedback
                                                    const updatedState = getCallState();
                                                    const updatedInfo = getActiveCallInfo();
                                                    setCallState(updatedState);
                                                    setCallInfo(updatedInfo);
                                                    
                                                    // Also update after a short delay to catch any async state changes
                                                    setTimeout(() => {
                                                        const finalState = getCallState();
                                                        const finalInfo = getActiveCallInfo();
                                                        setCallState(finalState);
                                                        setCallInfo(finalInfo);
                                                    }, 300);
                                                } catch (e) {
                                                    console.error('❌ Failed to answer call from CallModal:', e);
                                                    // Revert state on error - get fresh state
                                                    const errorState = getCallState();
                                                    setCallState(errorState);
                                                    setCallInfo(getActiveCallInfo());
                                                }
                                            }}
                                            activeOpacity={0.8}>
                                            <View style={styles.phoneIconRotated}>
                                                <AppIcon name="phone" size={24} color="#FFFFFF" />
                                            </View>
                                        </TouchableOpacity>
                                        <Text allowFontScaling={false} style={[styles.actionButtonLabel, { color: theme.textTertiary }]}>ОТВЕТИТЬ</Text>
                                    </View>
                                </View>
                            )}

                            {/* Call Again Button (for no answer state) */}
                            {isNoAnswer && (
                                <View style={styles.callAgainContainer}>
                                    <TouchableOpacity
                                        style={[styles.actionCircle, styles.actionCircleSuccess]}
                                        onPress={() => {
                                            // Call again - you might want to implement this
                                            console.log('Call again pressed');
                                        }}
                                        activeOpacity={0.8}>
                                        <AppIcon name="phone" size={24} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <Text allowFontScaling={false} style={[styles.actionButtonLabel, { color: theme.textTertiary }]}>ПОЗВОНИТЬ</Text>
                                </View>
                            )}

                            {/* End State */}
                            {isEnded && (
                                <View style={styles.endContainer}>
                                    <Text allowFontScaling={false} style={[styles.endText, { color: theme.text }]}>
                                        {effectiveState.state === 'ended'
                                            ? 'Звонок завершён'
                                            : 'Звонок отклонён'}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.closeEndButton, { backgroundColor: theme.backgroundSecondary }]}
                                        onPress={() => {
                                            if (onClose) {
                                                onClose();
                                            }
                                        }}
                                        activeOpacity={0.8}>
                                        <Text allowFontScaling={false} style={[styles.closeEndButtonText, { color: theme.text }]}>Закрыть</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        flex: 1,
        width: '100%',
        padding: 8,
        alignItems: 'center',
    },
    headerInternetStatus: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    internetStatusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 80 : 50,
        paddingBottom: 16,
        marginBottom: 4, // 4px distance below header
        borderBottomWidth: 1,
    },
    contentWrapper: {
        width: '100%',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
    },
    cardHeaderTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    closeButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'flex-end',
        flex: 1,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: '300',
    },
    avatarSection: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        paddingVertical: 40,
        borderRadius: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 156,
        height: 156,
        borderRadius: 780, // Makes it a perfect circle
        backgroundColor: '#FACD64', // Yellow background (kept as brand color)
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 7.8,
    },
    avatarText: {
        fontSize: 64,
        fontWeight: '600',
    },
    callerName: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 36, // 36px distance from avatar section
        marginBottom: 0,
        textAlign: 'center',
    },
    phoneNumber: {
        fontSize: 16,
        marginTop: 36, // 36px distance from name
        marginBottom: 0,
        textAlign: 'center',
    },
    connectionStatus: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12, // 12px distance from phone number
        marginBottom: 0,
        textAlign: 'center',
    },
    incomingCallStatus: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 36, // 36px distance from phone number
        marginBottom: 0,
        textAlign: 'center',
    },
    callDuration: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 36, // 36px distance from phone number
        marginBottom: 0,
        fontVariant: ['tabular-nums'],
        textAlign: 'center',
    },
    noAnswerText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 36, // 36px distance from phone number
        marginBottom: 36, // 36px distance to call button
        textAlign: 'center',
    },
    controlsRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 36,
        marginBottom: 0,
        paddingHorizontal: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    controlColumn: {
        flex: 1,
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 12,
    },
    controlColumnActive: {
        // Active state styling handled inline
    },
    /** Shared 64×64 circular hit area for all call controls */
    actionCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionCircleNeutralShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
    },
    actionCircleDanger: {
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    actionCircleSuccess: {
        backgroundColor: '#34C759',
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    actionButtonLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    controlsDivider: {
        width: 1,
        alignSelf: 'stretch',
        minHeight: 88,
        marginHorizontal: 8,
    },
    incomingCallButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 36,
    },
    incomingCallDivider: {
        width: 1,
        height: '100%',
        marginHorizontal: 40, // 40px distance on each side
    },
    incomingCallButtonWrapper: {
        alignItems: 'center',
    },
    phoneIconRotated: {
        transform: [{ rotate: '180deg' }], // Rotate phone icon 180deg for answer
    },
    callAgainContainer: {
        alignItems: 'center',
        width: '100%',
        marginTop: 36, // 36px distance from no answer text
    },
    endContainer: {
        alignItems: 'center',
        width: '100%',
    },
    endText: {
        fontSize: 18,
        marginBottom: 24,
        fontWeight: '600',
    },
    closeEndButton: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    closeEndButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

