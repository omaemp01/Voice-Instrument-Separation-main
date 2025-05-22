import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Upload, FileAudio, Play, Pause } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import AudioWaveform from '@/components/AudioWaveform';
import { saveAudioToCache } from '@/utils/fileSystem';

export default function UploadScreen() {
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const router = useRouter();

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      // Stop any current playback
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      const asset = result.assets[0];
      setFileName(asset.name);

      // Check file size (limit to 50MB for example)
      if (asset.size && asset.size > 50 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select an audio file smaller than 50MB');
        return;
      }

      // Check if it's a valid audio file by attempting to read it
      try {
        // Save to app's cache directory for easier access
        const savedUri = await saveAudioToCache(asset.uri, asset.name);
        setAudioUri(savedUri);
        
        // Load audio for playback
        loadAudio(savedUri);
      } catch (err) {
        console.error('Invalid audio file:', err);
        Alert.alert('Invalid File', 'Please select a valid audio file');
        setAudioUri(null);
        setFileName(null);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  };

  const loadAudio = async (uri: string) => {
    try {
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
      Alert.alert('Error', 'Failed to load audio file. The format may not be supported.');
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
    } catch (err) {
      console.error('Failed to toggle playback', err);
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
      <View style={styles.uploadContainer}>
        {audioUri ? (
          <>
            <View style={styles.fileInfoContainer}>
              <FileAudio color={Colors.primary} size={24} />
              <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                {fileName || 'Audio file'}
              </Text>
            </View>
            
            <View style={styles.waveformContainer}>
              <AudioWaveform
                audioUri={audioUri}
                isRecording={false}
                position={position}
                duration={duration}
              />
              
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>
            </View>
            
            <View style={styles.playbackControls}>
              <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                {isPlaying ? (
                  <Pause color={Colors.text} size={24} />
                ) : (
                  <Play color={Colors.text} size={24} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={pickAudio}>
                <Upload color={Colors.text} size={20} />
                <Text style={styles.buttonText}>Select Another</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.primaryButton} onPress={proceedToMixing}>
                <Text style={styles.buttonText}>Proceed to Mixing</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickAudio}>
            <Upload color={Colors.text} size={32} />
            <Text style={styles.uploadText}>Upload Audio File</Text>
            <Text style={styles.supportedFormats}>
              Supported formats: MP3, WAV, M4A, AAC
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    width: '80%',
    aspectRatio: 2,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
  },
  supportedFormats: {
    color: Colors.subtext,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  fileName: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
    flex: 1,
  },
  waveformContainer: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.waveformBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
});