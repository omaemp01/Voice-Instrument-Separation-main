import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Colors from '@/constants/Colors';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  trackColor?: string;
}

const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 0.01,
  trackColor = Colors.primary,
}) => {
  // Calculate the position percentage from the value
  const calculatePosition = (val: number) => {
    return ((val - minimumValue) / (maximumValue - minimumValue)) * 100;
  };

  // Initial position
  const position = useSharedValue(calculatePosition(value));

  // Update position when value changes externally
  React.useEffect(() => {
    position.value = calculatePosition(value);
  }, [value, minimumValue, maximumValue]);

  // Convert position percentage to actual value
  const calculateValue = (pos: number) => {
    const rawValue = minimumValue + (pos / 100) * (maximumValue - minimumValue);
    
    if (!step) return rawValue;
    
    // Apply step
    const steppedValue = Math.round(rawValue / step) * step;
    
    // Ensure value is within bounds
    return Math.min(Math.max(steppedValue, minimumValue), maximumValue);
  };

  // Handle pan gesture
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startPosition = position.value;
    },
    onActive: (event, ctx) => {
      // Calculate new position based on pan
      const newPosition = ctx.startPosition + (event.translationX / TRACK_WIDTH) * 100;
      
      // Clamp position between 0% and 100%
      position.value = Math.min(Math.max(newPosition, 0), 100);
      
      // Calculate and update value
      const newValue = calculateValue(position.value);
      runOnJS(onValueChange)(newValue);
    },
    onEnd: () => {
      // Optional: add spring animation at the end
      position.value = withSpring(position.value);
    },
  });

  // Animated styles for thumb
  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: (position.value / 100) * TRACK_WIDTH }],
    };
  });

  // Animated styles for active track
  const activeTrackStyle = useAnimatedStyle(() => {
    return {
      width: `${position.value}%`,
      backgroundColor: trackColor,
    };
  });

  return (
    <View style={styles.container}>
      {/* Track background */}
      <View style={styles.track}>
        {/* Active track */}
        <Animated.View style={[styles.activeTrack, activeTrackStyle]} />
      </View>

      {/* Thumb */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.thumbContainer, thumbStyle]}>
          <View style={[styles.thumb, { backgroundColor: trackColor }]} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// Constants
const TRACK_HEIGHT = 4;
const TRACK_WIDTH = Platform.OS === 'web' ? 300 : 280; // Adjust based on your needs
const THUMB_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE,
    width: TRACK_WIDTH,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  activeTrack: {
    height: '100%',
    width: '50%', // Default width, will be animated
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumbContainer: {
    position: 'absolute',
    left: -THUMB_SIZE / 2, // Center the thumb on the track
    justifyContent: 'center',
    alignItems: 'center',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default Slider;