import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Helper to save audio to cache directory
export const saveAudioToCache = async (
  uri: string, 
  filename: string
): Promise<string> => {
  if (Platform.OS === 'web') {
    // On web, we can just return the URI as is
    return uri;
  }
  
  // For native platforms, copy to cache directory
  const destination = `${FileSystem.cacheDirectory}${filename}`;
  
  try {
    // Check if the destination file exists and delete it
    const info = await FileSystem.getInfoAsync(destination);
    if (info.exists) {
      await FileSystem.deleteAsync(destination);
    }
    
    // Copy the file
    await FileSystem.copyAsync({
      from: uri,
      to: destination
    });
    
    return destination;
  } catch (err) {
    console.error('Error saving file to cache:', err);
    throw err;
  }
};

// Helper to create a temporary directory for processing
export const createTempDirectory = async (): Promise<string> => {
  if (Platform.OS === 'web') {
    // On web, no need for temp directory
    return '';
  }
  
  const tempDir = `${FileSystem.cacheDirectory}temp_${Date.now()}/`;
  
  try {
    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    }
    
    return tempDir;
  } catch (err) {
    console.error('Error creating temp directory:', err);
    throw err;
  }
};

// Helper to clean up temporary files
export const cleanupTempFiles = async (files: string[]): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(file);
      if (info.exists) {
        await FileSystem.deleteAsync(file);
      }
    }
  } catch (err) {
    console.error('Error cleaning up temp files:', err);
  }
};