import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@/components/Slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Pause, Mic, Music, WaveformCircle } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { processingAudio } from '@/utils/audioProcessing';

export default function EditorScreen() {
  const { audioUri } = useLocalSearchParams<{ audioUri: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [vocalTrack, setVocalTrack] = useState<string | null>(null);
  const [instrumentalTrack, setInstrumentalTrack] = useState<string | null>(null);
  const [vocalVolume, setVocalVolume] = useState(1);
  const [instrumentalVolume, setInstrumentalVolume] = useState(1);
  const [originalSound, setOriginalSound] = useState<Audio.Sound | null>(null);
  const [vocalSound, setVocalSound] = useState<Audio.Sound | null>(null);
  const [instrumentalSound, setInstrumentalSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<'original' | 'processed'>('original');
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const router = useRouter();
  
  // Track which sounds are currently playing
  const playingRef = useRef<{
    original: boolean;
    vocal: boolean;
    instrumental: boolean;
  }>({
    original: false,
    vocal: false,
    instrumental: false,
  });
  
  // Load original audio on mount
  useEffect(() => {
    if (audioUri) {
      loadOriginalAudio(audioUri);
    }
    
    return () => {
      // Clean up all audio resources
      stopAllPlayback();
    };
  }, [audioUri]);
  
  // Update volumes when playing processed tracks
  useEffect(() => {
    if (playbackMode === 'processed') {
      if (vocalSound) {
        vocalSound.setVolumeAsync(vocalVolume);
      }
      if (instrumentalSound) {
        instrumentalSound.setVolumeAsync(instrumentalVolume);
      }
    }
  }, [vocalVolume, instrumentalVolume, playbackMode]);
  
  const loadOriginalAudio = async (uri: string) => {
    try {
      if (originalSound) {
        await originalSound.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onOriginalPlaybackStatusUpdate
      );
      
      setOriginalSound(sound);
      
      // Get duration
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      }
    } catch (err) {
      console.error('Failed to load original audio', err);
      Alert.alert('Error', 'Failed to load audio file.');
    }
  };
  
  const onOriginalPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.isPlaying) {
        setPosition(status.positionMillis / 1000);
        playingRef.current.original = true;
      } else {
        playingRef.current.original = false;
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPosition(0);
          originalSound?.setPositionAsync(0);
        }
      }
    }
  };
  
  const onProcessedPlaybackStatusUpdate = (status: any, type: 'vocal' | 'instrumental') => {
    if (status.isLoaded) {
      if (status.isPlaying) {
        playingRef.current[type] = true;
      } else {
        playingRef.current[type] = false;
        if (status.didJustFinish) {
          // Only set isPlaying to false if both tracks finished
          if (!playingRef.current.vocal && !playingRef.current.instrumental) {
            setIsPlaying(false);
            setPosition(0);
            vocalSound?.setPositionAsync(0);
            instrumentalSound?.setPositionAsync(0);
          }
        }
      }
    }
  };
  
  const processAudio = async () => {
    if (!audioUri) return;
    
    setIsProcessing(true);
    
    try {
      // Stop any playback
      await stopAllPlayback();
      
      // Call audio processing function
      const result = await processingAudio(audioUri);
      
      if (result.success) {
        setVocalTrack(result.vocalTrack);
        setInstrumentalTrack(result.instrumentalTrack);
        setIsProcessed(true);
        
        // Load the processed tracks
        await loadProcessedTracks(result.vocalTrack, result.instrumentalTrack);
        
        // Switch to processed mode
        setPlaybackMode('processed');
      } else {
        Alert.alert('Processing Failed', result.error || 'Failed to process audio.');
      }
    } catch (err) {
      console.error('Failed to process audio', err);
      Alert.alert('Error', 'Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const loadProcessedTracks = async (vocalUri: string, instrumentalUri: string) => {
    try {
      // Load vocal track
      if (vocalSound) {
        await vocalSound.unloadAsync();
      }
      
      const { sound: newVocalSound } = await Audio.Sound.createAsync(
        { uri: vocalUri },
        { shouldPlay: false, volume: vocalVolume },
        (status) => onProcessedPlaybackStatusUpdate(status, 'vocal')
      );
      
      setVocalSound(newVocalSound);
      
      // Load instrumental track
      if (instrumentalSound) {
        await instrumentalSound.unloadAsync();
      }
      
      const { sound: newInstrumentalSound } = await Audio.Sound.createAsync(
        { uri: instrumentalUri },
        { shouldPlay: false, volume: instrumentalVolume },
        (status) => onProcessedPlaybackStatusUpdate(status, 'instrumental')
      );
      
      setInstrumentalSound(newInstrumentalSound);
    } catch (err) {
      console.error('Failed to load processed tracks', err);
    }
  };
  
  const togglePlayback = async () => {
    if (playbackMode === 'original') {
      if (!originalSound) return;
      
      try {
        if (isPlaying) {
          await originalSound.pauseAsync();
          setIsPlaying(false);
        } else {
          await originalSound.playAsync();
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('Failed to toggle original playback', err);
      }
    } else {
      // Processed mode - play both tracks together
      if (!vocalSound || !instrumentalSound) return;
      
      try {
        if (isPlaying) {
          await Promise.all([
            vocalSound.pauseAsync(),
            instrumentalSound.pauseAsync()
          ]);
          setIsPlaying(false);
        } else {
          // Ensure both tracks start from the same position
          await Promise.all([
            vocalSound.setPositionAsync(position * 1000),
            instrumentalSound.setPositionAsync(position * 1000)
          ]);
          
          await Promise.all([
            vocalSound.playAsync(),
            instrumentalSound.playAsync()
          ]);
          
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('Failed to toggle processed playback', err);
      }
    }
  };
  
  const stopAllPlayback = async () => {
    setIsPlaying(false);
    
    if (originalSound) {
      try {
        await originalSound.stopAsync();
        await originalSound.setPositionAsync(0);
      } catch (err) {
        console.error('Failed to stop original sound', err);
      }
    }
    
    if (vocalSound) {
      try {
        await vocalSound.stopAsync();
        await vocalSound.setPositionAsync(0);
      } catch (err) {
        console.error('Failed to stop vocal sound', err);
      }
    }
    
    if (instrumentalSound) {
      try {
        await instrumentalSound.stopAsync();
        await instrumentalSound.setPositionAsync(0);
      } catch (err) {
        console.error('Failed to stop instrumental sound', err);
      }
    }
    
    setPosition(0);
  };
  
  const switchPlaybackMode = async () => {
    // Stop current playback
    await stopAllPlayback();
    
    // Toggle mode
    setPlaybackMode(prev => prev === 'original' ? 'processed' : 'original');
  };
  
  const proceedToExport = () => {
    if (isProcessed && vocalTrack && instrumentalTrack) {
      router.push({
        pathname: '/export',
        params: {
          vocalTrack,
          instrumentalTrack,
          vocalVolume: vocalVolume.toString(),
          instrumentalVolume: instrumentalVolume.toString()
        }
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
      {audioUri ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isProcessed ? 'Mix Separated Tracks' : 'Audio Editor'}
            </Text>
          </View>
          
          <View style={styles.waveformContainer}>
            <View style={styles.timelineContainer}>
              <View style={[
                styles.positionIndicator, 
                { left: `${(position / duration) * 100}%` }
              ]} />
              
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={togglePlayback}
              disabled={isProcessing}
            >
              {isPlaying ? (
                <Pause color={Colors.text} size={24} />
              ) : (
                <Play color={Colors.text} size={24} />
              )}
            </TouchableOpacity>
            
            {isProcessed && (
              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  { backgroundColor: playbackMode === 'original' ? Colors.card : Colors.success }
                ]} 
                onPress={switchPlaybackMode}
              >
                <Text style={styles.modeButtonText}>
                  {playbackMode === 'original' ? 'Original' : 'Separated'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isProcessed && playbackMode === 'processed' ? (
            <View style={styles.mixerContainer}>
              <View style={styles.trackContainer}>
                <View style={styles.trackLabelContainer}>
                  <Mic color={Colors.vocalTrack} size={20} />
                  <Text style={styles.trackLabel}>Vocals</Text>
                </View>
                <Slider
                  value={vocalVolume}
                  onValueChange={setVocalVolume}
                  minimumValue={0}
                  maximumValue={2}
                  step={0.01}
                  trackColor={Colors.vocalTrack}
                />
                <Text style={styles.volumeText}>{Math.round(vocalVolume * 100)}%</Text>
              </View>
              
              <View style={styles.trackContainer}>
                <View style={styles.trackLabelContainer}>
                  <Music color={Colors.instrumentalTrack} size={20} />
                  <Text style={styles.trackLabel}>Instrumental</Text>
                </View>
                <Slider
                  value={instrumentalVolume}
                  onValueChange={setInstrumentalVolume}
                  minimumValue={0}
                  maximumValue={2}
                  step={0.01}
                  trackColor={Colors.instrumentalTrack}
                />
                <Text style={styles.volumeText}>{Math.round(instrumentalVolume * 100)}%</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.exportButton} 
                onPress={proceedToExport}
              >
                <Text style={styles.exportButtonText}>Proceed to Export</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.processingContainer}>
              {isProcessing ? (
                <>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.processingText}>
                    Processing audio...{'\n'}This may take a few moments
                  </Text>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.processButton} 
                    onPress={processAudio}
                    disabled={isProcessing}
                  >
                    <WaveformCircle color={Colors.text} size={24} />
                    <Text style={styles.processButtonText}>
                      {isProcessed ? 'Reprocess Audio' : 'Separate Vocal & Instrumental'}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.infoText}>
                    This will use AI to separate the audio into vocal and instrumental tracks.
                    {Platform.OS === 'web' 
                      ? ' Processing happens directly in your browser using WebAssembly.'
                      : ' Processing happens directly on your device.'}
                  </Text>
                </>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.noAudioContainer}>
          <Text style={styles.noAudioText}>
            No audio file selected. Please record or upload an audio file first.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  waveformContainer: {
    height: 200,
    backgroundColor: Colors.waveformBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
  },
  timelineContainer: {
    height: 60,
    backgroundColor: Colors.card,
    borderRadius: 4,
    position: 'relative',
  },
  positionIndicator: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: Colors.primary,
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
    marginBottom: 24,
    marginTop: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.card,
  },
  modeButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  mixerContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  trackContainer: {
    marginBottom: 24,
  },
  trackLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackLabel: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  volumeText: {
    color: Colors.subtext,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  exportButton: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  exportButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  processButton: {
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  processButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 12,
  },
  processingText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 16,
  },
  infoText: {
    color: Colors.subtext,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  noAudioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noAudioText: {
    color: Colors.subtext,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});