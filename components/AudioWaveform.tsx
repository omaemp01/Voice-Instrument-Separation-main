import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Colors from '@/constants/Colors';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

interface AudioWaveformProps {
  audioUri: string | null;
  isRecording: boolean;
  position: number;
  duration: number;
}

const BAR_COUNT = 50;
const MAX_BAR_HEIGHT = 80;

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  audioUri, 
  isRecording,
  position,
  duration
}) => {
  const [barHeights, setBarHeights] = useState<number[]>([]);
  const animationProgress = useSharedValue(0);
  
  // Generate random bar heights when audio changes or when recording
  useEffect(() => {
    if (audioUri || isRecording) {
      generateRandomBars();
    } else {
      setBarHeights([]);
    }
  }, [audioUri]);
  
  // Update animation when recording status changes
  useEffect(() => {
    if (isRecording) {
      animationProgress.value = 0;
      animationProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(animationProgress);
    }
    
    return () => {
      cancelAnimation(animationProgress);
    };
  }, [isRecording]);
  
  // Generate random bar heights for visualization
  const generateRandomBars = () => {
    const heights: number[] = [];
    
    // Create some random but aesthetically pleasing waveform
    for (let i = 0; i < BAR_COUNT; i++) {
      // Generate a value between 0.1 and 1.0
      const randomValue = 0.1 + Math.random() * 0.9;
      
      // Apply a bell curve to make the middle bars generally taller
      const bellCurve = Math.sin((i / BAR_COUNT) * Math.PI);
      const height = MAX_BAR_HEIGHT * randomValue * bellCurve;
      
      heights.push(Math.max(5, height)); // Ensure minimum height of 5
    }
    
    setBarHeights(heights);
  };
  
  // Animation style for recording
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.7 + animationProgress.value * 0.3,
      transform: [{ scaleY: 0.9 + animationProgress.value * 0.2 }],
    };
  });
  
  // Calculate playback position for non-recording mode
  const playbackPosition = duration > 0 ? (position / duration) * BAR_COUNT : 0;
  
  return (
    <View style={styles.container}>
      {barHeights.length > 0 ? (
        <View style={styles.waveformContainer}>
          {barHeights.map((height, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  height: height,
                  backgroundColor: isRecording
                    ? Colors.waveformPrimary
                    : index <= playbackPosition
                      ? Colors.waveformPrimary
                      : Colors.waveformSecondary,
                },
                isRecording && animatedStyle,
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyWaveform} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: Colors.waveformPrimary,
  },
  emptyWaveform: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
});

export default AudioWaveform;