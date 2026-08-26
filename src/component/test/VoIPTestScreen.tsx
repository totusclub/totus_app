import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useVoIPCall } from '../../modules/hooks/useVoIPCall';
import { callKeepService } from '../../modules/services/callKeepService';

/**
 * Test Screen for VoIP and CallKeep
 * Add this to your navigation for testing purposes
 */
export const VoIPTestScreen: React.FC = () => {
  const [voipToken, setVoipToken] = useState<string | null>(null);
  const [callUUID, setCallUUID] = useState<string>('');
  const [callerName, setCallerName] = useState<string>('Test Caller');
  const [callerNumber, setCallerNumber] = useState<string>('+1234567890');
  const [testCallUUID, setTestCallUUID] = useState<string>('');

  const { 
    getVoIPToken, 
    answerCall, 
    endCall, 
    isCallKeepInitialized,
    currentCallUUID 
  } = useVoIPCall({
    onIncomingCall: (payload) => {
      Alert.alert('Incoming Call', `From: ${payload.callerName}\nNumber: ${payload.callerNumber}`);
    },
    onCallAnswered: (uuid) => {
      Alert.alert('Call Answered', `UUID: ${uuid}`);
      setTestCallUUID(uuid);
    },
    onCallEnded: (uuid) => {
      Alert.alert('Call Ended', `UUID: ${uuid}`);
      setTestCallUUID('');
    },
    onTokenReceived: (token) => {
      setVoipToken(token);
      Alert.alert('VoIP Token Received', token.substring(0, 20) + '...');
    },
  });

  const handleGetToken = async () => {
    try {
      const token = await getVoIPToken();
      if (token) {
        setVoipToken(token);
        Alert.alert('VoIP Token', token);
      } else {
        Alert.alert('Error', 'Token not available yet. Check console logs.');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to get token: ${error}`);
    }
  };

  const handleTestIncomingCall = async () => {
    if (!isCallKeepInitialized) {
      Alert.alert('Error', 'CallKeep not initialized yet');
      return;
    }

    const uuid = `test-${Date.now()}`;
    setTestCallUUID(uuid);
    setCallUUID(uuid); // Also set in local state for display

    try {
      await callKeepService.displayIncomingCall(
        uuid,
        callerName,
        callerNumber,
        false // hasVideo
      );
      Alert.alert('Success', `Test call displayed\nUUID: ${uuid}`);
    } catch (error) {
      Alert.alert('Error', `Failed to display call: ${error}`);
      setTestCallUUID('');
      setCallUUID('');
    }
  };

  const handleAnswerCall = async () => {
    const uuidToAnswer = testCallUUID || currentCallUUID || callUUID;
    if (!uuidToAnswer) {
      Alert.alert('Error', 'No active call to answer. Display a test call first.');
      return;
    }

    try {
      await answerCall(uuidToAnswer);
      setTestCallUUID(uuidToAnswer);
      setCallUUID(uuidToAnswer);
    } catch (error) {
      Alert.alert('Error', `Failed to answer call: ${error}`);
    }
  };

  const handleEndCall = async () => {
    const uuidToEnd = testCallUUID || currentCallUUID || callUUID;
    if (!uuidToEnd) {
      Alert.alert('Error', 'No active call to end');
      return;
    }

    try {
      await endCall(uuidToEnd);
      setTestCallUUID('');
      setCallUUID('');
    } catch (error) {
      Alert.alert('Error', `Failed to end call: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>VoIP & CallKeep Test Screen</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.status}>
          CallKeep Initialized: {isCallKeepInitialized ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={styles.status}>
          Current Call UUID: {currentCallUUID || testCallUUID || callUUID || 'None'}
        </Text>
        {testCallUUID && (
          <Text style={[styles.status, { color: '#007AFF', fontWeight: 'bold' }]}>
            Active Test Call: {testCallUUID}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VoIP Token</Text>
        {voipToken ? (
          <View>
            <Text style={styles.tokenLabel}>Token (first 40 chars):</Text>
            <Text style={styles.token}>{voipToken.substring(0, 40)}...</Text>
            <Text style={styles.tokenLabel}>Full Token:</Text>
            <Text style={styles.token} selectable>
              {voipToken}
            </Text>
          </View>
        ) : (
          <Text style={styles.noToken}>No token received yet. Check console logs.</Text>
        )}
        <Button title="Get VoIP Token" onPress={handleGetToken} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Incoming Call</Text>
        <TextInput
          style={styles.input}
          placeholder="Caller Name"
          value={callerName}
          onChangeText={setCallerName}
        />
        <TextInput
          style={styles.input}
          placeholder="Caller Number"
          value={callerNumber}
          onChangeText={setCallerNumber}
          keyboardType="phone-pad"
        />
        <Button title="Display Test Call" onPress={handleTestIncomingCall} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Actions</Text>
        <Button 
          title="Answer Call" 
          onPress={handleAnswerCall}
          disabled={!testCallUUID && !currentCallUUID && !callUUID}
        />
        <View style={styles.buttonSpacer} />
        <Button 
          title="End Call" 
          onPress={handleEndCall}
          color="#ff4444"
          disabled={!testCallUUID && !currentCallUUID && !callUUID}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instruction}>
          1. Wait for CallKeep to initialize (check status above){'\n'}
          2. Get VoIP token (should appear automatically or click button){'\n'}
          3. Use the token to send VoIP push from your backend{'\n'}
          4. Or use "Display Test Call" to test CallKeep UI locally{'\n'}
          5. Check console logs for detailed information
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    marginBottom: 5,
  },
  tokenLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
  token: {
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  noToken: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  buttonSpacer: {
    height: 10,
  },
  instruction: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
  },
});

