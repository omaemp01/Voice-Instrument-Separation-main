import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Pause, Square, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import AudioWaveform from '@/components/AudioWaveform';
import { saveAudioToCache } from '@/utils/fileSystem';

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  const durationTimer = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Request permissions
  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please grant microphone permission to use the recording feature'
        );
      }
    };

    getPermissions();

    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      stopPlayback();
    };
  }, []);

  const startRecording = async () => {
    try {
      // Clear previous recording if exists
      if (audioUri) {
        await stopPlayback();
        setAudioUri(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setRecordingStatus('recording');
      
      // Trigger haptic feedback on iOS
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Start tracking duration
      positionRef.current = 0;
      setPosition(0);
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      durationTimer.current = setInterval(() => {
        positionRef.current += 0.1;
        setPosition(positionRef.current);
      }, 100);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setRecordingStatus('idle');
      await recording.stopAndUnloadAsync();
      
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri) {
        setAudioUri(uri);
        
        // Save recording to cache for later use
        const savedUri = await saveAudioToCache(uri, 'recording.m4a');
        console.log('Audio saved to:', savedUri);
        
        // Load the recording for playback
        loadAudio(uri);
      }
      
      setRecording(null);
      
      // Trigger haptic feedback on iOS
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;
    
    try {
      if (recordingStatus === 'recording') {
        await recording.pauseAsync();
        setRecordingStatus('paused');
        
        if (durationTimer.current) {
          clearInterval(durationTimer.current);
        }
        
        // Trigger haptic feedback on iOS
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else if (recordingStatus === 'paused') {
        await recording.startAsync();
        setRecordingStatus('recording');
        
        // Resume tracking duration
        durationTimer.current = setInterval(() => {
          positionRef.current += 0.1;
          setPosition(positionRef.current);
        }, 100);
        
        // Trigger haptic feedback on iOS
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (err) {
      console.error('Failed to pause/resume recording', err);
    }
  };

  const loadAudio = async (uri: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      
      // Get duration
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      }
    } catch (err) {
      console.error('Failed to load audio', err);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.isPlaying) {
      setPosition(status.positionMillis / 1000);
    } else if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      sound?.setPositionAsync(0);
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;
    
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
      
      // Trigger haptic feedback on iOS
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error('Failed to toggle playback', err);
    }
  };

  const stopPlayback = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      } catch (err) {
        console.error('Failed to stop playback', err);
      }
    }
  };

  const proceedToMixing = () => {
    if (audioUri) {
      router.push({
        pathname: '/editor',
        params: { audioUri }
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        <AudioWaveform
          audioUri={audioUri}
          isRecording={recordingStatus === 'recording'}
          position={position}
          duration={duration}
        />
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration || position)}
          </Text>
        </View>
      </View>
      
      <View style={styles.controlsContainer}>
        {recordingStatus === 'idle' ? (
          <>
            {audioUri ? (
              <>
                <TouchableOpacity style={styles.controlButton} onPress={togglePlayback}>
                  {isPlaying ? (
                    <Pause color={Colors.text} size={28} />
                  ) : (
                    <Play color={Colors.text} size={28} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.recordButton, styles.newRecordingButton]} 
                  onPress={startRecording}
                >
                  <Mic color={Colors.text} size={24} />
                  <Text style={styles.buttonText}>New Recording</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.proceedButton]} 
                  onPress={proceedToMixing}
                >
                  <Text style={styles.buttonText}>Proceed to Mixing</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <Mic color={Colors.text} size={32} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.controlButton} onPress={pauseRecording}>
              {recordingStatus === 'paused' ? (
                <Mic color={Colors.text} size={28} />
              ) : (
                <Pause color={Colors.text} size={28} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Square color={Colors.text} size={24} />
            </TouchableOpacity>
          </>
        )}
      </View>
      
      <Text style={styles.instructionText}>
        {recordingStatus === 'idle' 
          ? audioUri 
            ? 'Recording complete. Play back or proceed to mixing.'
            : 'Tap the microphone to start recording.'
          : recordingStatus === 'recording'
            ? 'Recording in progress... Tap pause or stop when finished.'
            : 'Recording paused. Tap to resume or stop to finish.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.waveformBackground,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  timeContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeText: {
    color: Colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  newRecordingButton: {
    backgroundColor: Colors.secondary,
    width: 'auto',
    height: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  proceedButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  instructionText: {
    color: Colors.subtext,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});