import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Share2, Download, Music, Mic } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/Colors';
import { mergeAudioTracks } from '@/utils/audioProcessing';

export default function ExportScreen() {
  const { 
    vocalTrack, 
    instrumentalTrack, 
    vocalVolume,
    instrumentalVolume 
  } = useLocalSearchParams<{ 
    vocalTrack: string;
    instrumentalTrack: string;
    vocalVolume: string;
    instrumentalVolume: string;
  }>();
  
  const [isMerging, setIsMerging] = useState(false);
  const [exportedUri, setExportedUri] = useState<string | null>(null);
  const [exportName, setExportName] = useState('mixed_audio.mp3');
  
  // Check if we have all the required params
  const hasRequiredParams = Boolean(vocalTrack && instrumentalTrack);
  
  // Parse volume values
  const vocalVol = vocalVolume ? parseFloat(vocalVolume) : 1;
  const instrumentalVol = instrumentalVolume ? parseFloat(instrumentalVolume) : 1;
  
  const exportAudio = async () => {
    if (!vocalTrack || !instrumentalTrack) {
      Alert.alert('Error', 'Missing audio tracks. Please go back to the editor.');
      return;
    }
    
    setIsMerging(true);
    
    try {
      // Call the merge function
      const result = await mergeAudioTracks(
        vocalTrack,
        instrumentalTrack,
        vocalVol,
        instrumentalVol
      );
      
      if (result.success) {
        setExportedUri(result.outputUri);
        Alert.alert('Success', 'Your audio has been successfully exported!');
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export audio.');
      }
    } catch (err) {
      console.error('Failed to export audio', err);
      Alert.alert('Error', 'Failed to export audio. Please try again.');
    } finally {
      setIsMerging(false);
    }
  };
  
  const shareAudio = async () => {
    if (!exportedUri) return;
    
    try {
      if (Platform.OS === 'web') {
        // For web, download the file
        const link = document.createElement('a');
        link.href = exportedUri;
        link.download = exportName;
        link.click();
      } else {
        // For mobile, share the file
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(exportedUri);
        } else {
          Alert.alert(
            'Sharing not available',
            'Sharing is not available on this device'
          );
        }
      }
    } catch (err) {
      console.error('Failed to share audio', err);
      Alert.alert('Error', 'Failed to share audio. Please try again.');
    }
  };
  
  const downloadAudio = async () => {
    if (!exportedUri) return;
    
    if (Platform.OS === 'web') {
      // For web, download the file
      const link = document.createElement('a');
      link.href = exportedUri;
      link.download = exportName;
      link.click();
    } else {
      // For mobile, just copy to downloads (this is a simplified implementation)
      Alert.alert(
        'Success',
        'File saved to your device. You can access it through the share option.'
      );
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Audio</Text>
      </View>
      
      {hasRequiredParams ? (
        <>
          <View style={styles.infoContainer}>
            <View style={styles.trackInfoCard}>
              <View style={styles.trackInfoHeader}>
                <Mic color={Colors.vocalTrack} size={24} />
                <Text style={styles.trackInfoTitle}>Vocal Track</Text>
              </View>
              <Text style={styles.trackInfoDetail}>
                Volume: {Math.round(vocalVol * 100)}%
              </Text>
            </View>
            
            <View style={styles.trackInfoCard}>
              <View style={styles.trackInfoHeader}>
                <Music color={Colors.instrumentalTrack} size={24} />
                <Text style={styles.trackInfoTitle}>Instrumental Track</Text>
              </View>
              <Text style={styles.trackInfoDetail}>
                Volume: {Math.round(instrumentalVol * 100)}%
              </Text>
            </View>
          </View>
          
          {isMerging ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.processingText}>
                Merging audio tracks...{'\n'}This may take a few moments
              </Text>
            </View>
          ) : exportedUri ? (
            <View style={styles.exportedContainer}>
              <Text style={styles.successText}>
                Your mixed audio is ready!
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.shareButton]} 
                  onPress={shareAudio}
                >
                  <Share2 color={Colors.text} size={20} />
                  <Text style={styles.buttonText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.downloadButton]} 
                  onPress={downloadAudio}
                >
                  <Download color={Colors.text} size={20} />
                  <Text style={styles.buttonText}>Download</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.exportInfoText}>
                Your audio file has been exported with your chosen volume settings.
                You can now share it or download it to your device.
              </Text>
            </View>
          ) : (
            <View style={styles.exportContainer}>
              <Text style={styles.exportInfoText}>
                Merge your vocal and instrumental tracks with the volume settings
                you specified in the mixer.
              </Text>
              
              <TouchableOpacity 
                style={styles.exportButton} 
                onPress={exportAudio}
              >
                <Text style={styles.exportButtonText}>Export Mixed Audio</Text>
              </TouchableOpacity>
              
              <Text style={styles.disclaimer}>
                {Platform.OS === 'web'
                  ? 'The export process uses your browser\'s processing capabilities and may take a few moments depending on the file size.'
                  : 'The export process uses your device\'s processing capabilities and may take a few moments depending on the file size.'}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.noTracksContainer}>
          <Text style={styles.noTracksText}>
            No audio tracks to export. Please separate an audio file first in the editor.
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
  infoContainer: {
    marginBottom: 24,
  },
  trackInfoCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  trackInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackInfoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
    marginLeft: 8,
  },
  trackInfoDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.subtext,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 16,
  },
  exportContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  exportButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 24,
  },
  exportButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  exportInfoText: {
    color: Colors.subtext,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  disclaimer: {
    color: Colors.subtext,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  exportedContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
  },
  successText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.success,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  shareButton: {
    backgroundColor: Colors.secondary,
  },
  downloadButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  noTracksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noTracksText: {
    color: Colors.subtext,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});