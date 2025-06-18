import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import DraggableFlatList, { 
  RenderItemParams, 
  ScaleDecorator 
} from 'react-native-draggable-flatlist';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { typography, spacing, borderRadius, shadows } from '@/utils/theme';
import { signsMapping, signTranslations } from '@/utils/signsMapping';
import { Play, Plus, Trash2, GripVertical } from 'lucide-react-native';
import * as Speech from 'expo-speech';

interface SelectedSign {
  id: string;
  arabic: string;
  french: string;
  videoSource: any;
  key: string; // Required for DraggableFlatList
}

export default function PhraseComposerScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [selectedSigns, setSelectedSigns] = useState<SelectedSign[]>([]);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [isPlayingPhrase, setIsPlayingPhrase] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [currentVideoSource, setCurrentVideoSource] = useState<any>(null);
  const videoRef = useRef<Video | null>(null);

  // Get all available signs
  const availableSigns = Object.keys(signTranslations).map(key => ({
    id: key,
    arabic: signTranslations[key].arabic,
    french: signTranslations[key].french,
    videoSource: signsMapping[key],
  }));

  const addSignToPhrase = (sign: typeof availableSigns[0]) => {
    const newSign: SelectedSign = {
      ...sign,
      key: `${sign.id}-${Date.now()}-${Math.random()}`, // Unique key for drag and drop
    };
    setSelectedSigns(prev => [...prev, newSign]);
  };

  const removeSignFromPhrase = (index: number) => {
    setSelectedSigns(prev => prev.filter((_, i) => i !== index));
  };

  const clearPhrase = () => {
    setSelectedSigns([]);
    setCurrentPlayingIndex(null);
    setIsPlayingPhrase(false);
    setShowVideoPopup(false);
  };

  const handleDragEnd = ({ data }: { data: SelectedSign[] }) => {
    setSelectedSigns(data);
  };

  const playSign = async (sign: SelectedSign, index: number) => {
    if (isPlayingPhrase) return; // Prevent individual play during phrase playback
    
    setCurrentPlayingIndex(index);
    setCurrentVideoSource(sign.videoSource);
    setShowVideoPopup(true);
    
    // Wait a bit for the video source to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (videoRef.current) {
      try {
        // Load the video first
        await videoRef.current.loadAsync(sign.videoSource, {}, false);
        
        // Wait a bit for loading
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Then play it
        await videoRef.current.playAsync();
      } catch (error) {
        console.error('Error playing video:', error);
        setCurrentPlayingIndex(null);
        setShowVideoPopup(false);
      }
    } else {
      console.error('Video ref is null');
      setCurrentPlayingIndex(null);
      setShowVideoPopup(false);
    }
  };

  const playPhrase = async () => {
    if (selectedSigns.length === 0) {
      Alert.alert('Empty Phrase', 'Please add some signs to your phrase first.');
      return;
    }

    if (isPlayingPhrase) return; // Prevent multiple simultaneous playbacks

    setIsPlayingPhrase(true);
    setShowVideoPopup(true);
    
    for (let i = 0; i < selectedSigns.length; i++) {
      setCurrentPlayingIndex(i);
      const sign = selectedSigns[i];
      setCurrentVideoSource(sign.videoSource);
      
      // Wait a bit for the video source to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRef.current) {
        try {
          // Load the video first
          await videoRef.current.loadAsync(sign.videoSource, {}, false);
          
          // Wait a bit for loading
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Then play it
          await videoRef.current.playAsync();
          
          // Wait for video to finish (approximately 2 seconds) plus a small pause
          await new Promise(resolve => setTimeout(resolve, 2500));
        } catch (error) {
          console.error('Error playing video:', error);
          // Continue with next video even if this one fails
        }
      } else {
        console.error('Video ref is null');
        // Wait anyway to maintain timing
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    }
    
    setCurrentPlayingIndex(null);
    setIsPlayingPhrase(false);
    setShowVideoPopup(false);
  };

  const closeVideoPopup = () => {
    setShowVideoPopup(false);
    setCurrentPlayingIndex(null);
    setIsPlayingPhrase(false);
    if (videoRef.current) {
      videoRef.current.stopAsync();
    }
  };

  const renderSignItem = ({ item }: { item: typeof availableSigns[0] }) => (
    <TouchableOpacity
      style={[
        styles.signItem,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...shadows.small,
        },
      ]}
      onPress={() => addSignToPhrase(item)}
    >
      <Text style={[styles.signText, { color: theme.text }]}>
        {item.arabic}
      </Text>
      <Text style={[styles.signText, { color: theme.textSecondary }]}>
        {item.french}
      </Text>
      <Plus size={16} color={theme.primary} style={styles.addIcon} />
    </TouchableOpacity>
  );

  const renderSelectedSign = ({ item, drag, isActive }: RenderItemParams<SelectedSign>) => (
    <ScaleDecorator>
      <View
        style={[
          styles.selectedSignContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            ...shadows.small,
            opacity: isActive ? 0.5 : 1,
            transform: [{ scale: isActive ? 1.05 : 1 }],
          },
        ]}
      >
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={styles.dragHandle}
        >
          <GripVertical size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        
        <View style={styles.selectedSignInfo}>
          <Text style={[styles.selectedSignText, { color: theme.text }]}>
            {item.arabic}
          </Text>
          <Text style={[styles.selectedSignText, { color: theme.textSecondary }]}>
            {item.french}
          </Text>
        </View>
        
        <View style={styles.selectedSignActions}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { 
                backgroundColor: currentPlayingIndex === selectedSigns.findIndex(s => s.key === item.key) ? theme.success : theme.primary,
                opacity: isPlayingPhrase ? 0.5 : 1,
              }
            ]}
            onPress={() => playSign(item, selectedSigns.findIndex(s => s.key === item.key))}
            disabled={isPlayingPhrase}
          >
            <Play size={16} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={() => removeSignFromPhrase(selectedSigns.findIndex(s => s.key === item.key))}
            disabled={isPlayingPhrase}
          >
            <Trash2 size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScaleDecorator>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Phrase Display */}
      <View style={styles.phraseSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('phrase.composed')}
        </Text>
        
        {selectedSigns.length === 0 ? (
          <View style={[styles.emptyPhrase, { backgroundColor: theme.card }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('phrase.empty')}
            </Text>
          </View>
        ) : (
          <View style={styles.selectedSignsContainer}>
            <DraggableFlatList
              data={selectedSigns}
              onDragEnd={handleDragEnd}
              keyExtractor={(item) => item.key}
              renderItem={renderSelectedSign}
              contentContainerStyle={styles.draggableContainer}
            />
          </View>
        )}

        {selectedSigns.length > 0 && (
          <View style={styles.phraseActions}>
            <TouchableOpacity
              style={[
                styles.phraseButton, 
                { 
                  backgroundColor: isPlayingPhrase ? theme.success : theme.primary,
                  opacity: isPlayingPhrase ? 0.7 : 1,
                }
              ]}
              onPress={playPhrase}
              disabled={isPlayingPhrase}
            >
              <Play size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>
                {isPlayingPhrase ? t('phrase.playing') : t('phrase.play')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.phraseButton, { backgroundColor: theme.error }]}
              onPress={clearPhrase}
              disabled={isPlayingPhrase}
            >
              <Trash2 size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{t('phrase.clear')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Available Signs */}
      <View style={styles.signsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('phrase.available')}
        </Text>
        
        <FlatList
          data={availableSigns}
          renderItem={renderSignItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.signsGrid}
        />
      </View>

      {/* Global Video Popup */}
      {showVideoPopup && (
        <View style={styles.videoOverlay}>
          <View style={styles.videoContainer}>
            <View style={styles.videoHeader}>
              <Text style={[styles.videoTitle, { color: theme.text }]}>
                {isPlayingPhrase 
                  ? `${t('phrase.playing')} ${currentPlayingIndex !== null ? currentPlayingIndex + 1 : ''}/${selectedSigns.length}`
                  : t('phrase.playing')
                }
              </Text>
              <TouchableOpacity onPress={closeVideoPopup} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Video
              ref={videoRef}
              source={currentVideoSource}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              isLooping={false}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded && status.didJustFinish) {
                  if (!isPlayingPhrase) {
                    setCurrentPlayingIndex(null);
                    setShowVideoPopup(false);
                  }
                }
              }}
            />
            <View style={styles.videoFooter}>
              {currentPlayingIndex !== null && selectedSigns[currentPlayingIndex] && (
                <View style={styles.signLabelContainer}>
                  <Text style={[styles.signLabelArabic, { color: theme.text }]}>
                    {selectedSigns[currentPlayingIndex].arabic}
                  </Text>
                  <Text style={[styles.signLabelFrench, { color: theme.textSecondary }]}>
                    {selectedSigns[currentPlayingIndex].french}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.m,
  },
  phraseSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.l,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.m,
  },
  emptyPhrase: {
    padding: spacing.xl,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyText: {
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  selectedSignsContainer: {
    minHeight: 100,
  },
  draggableContainer: {
    gap: spacing.s,
  },
  selectedSignContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
  },
  dragHandle: {
    marginRight: spacing.s,
    padding: spacing.xs,
  },
  selectedSignInfo: {
    flex: 1,
  },
  selectedSignText: {
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
  },
  selectedSignActions: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  actionButton: {
    padding: spacing.s,
    borderRadius: borderRadius.small,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  videoContainer: {
    width: '90%',
    height: '70%',
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  phraseActions: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  phraseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    borderRadius: borderRadius.medium,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.medium,
  },
  signsSection: {
    marginBottom: spacing.xl,
  },
  signsGrid: {
    gap: spacing.s,
  },
  signItem: {
    flex: 1,
    padding: spacing.m,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: 80,
    justifyContent: 'center',
  },
  signText: {
    fontSize: typography.fontSizes.s,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  addIcon: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.m,
  },
  videoTitle: {
    fontSize: typography.fontSizes.l,
    fontFamily: typography.fontFamily.bold,
  },
  closeButton: {
    padding: spacing.s,
  },
  closeButtonText: {
    fontSize: typography.fontSizes.l,
    fontFamily: typography.fontFamily.bold,
  },
  videoFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.m,
  },
  signLabelContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.m,
    borderRadius: borderRadius.medium,
  },
  signLabelArabic: {
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.xs,
  },
  signLabelFrench: {
    fontSize: typography.fontSizes.m,
    fontFamily: typography.fontFamily.medium,
  },
}); 