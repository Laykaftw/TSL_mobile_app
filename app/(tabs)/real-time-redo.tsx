import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

interface ServerStats {
  frames_collected: number;
  frames_needed: number;
  motion_detected: boolean;
  motion_score: number;
  motion_threshold: number;
  status: string;
}

interface PredictionResult {
  predicted_class: string;
  confidence: number;
  above_threshold: boolean;
}

export default function RealTimeRedoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats>({
    frames_collected: 0,
    frames_needed: 16,
    motion_detected: false,
    motion_score: 0.0,
    motion_threshold: 0.000001,
    status: 'waiting'
  });  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [maxReconnectAttempts] = useState(5);  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [actualFps, setActualFps] = useState(0);
  const [processTime, setProcessTime] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [translationText, setTranslationText] = useState<string[]>([]);const cameraRef = useRef<CameraView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<any>(null);  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const frameCompletionTimesRef = useRef<number[]>([]);
  const isCapturingRef = useRef<boolean>(false); // Prevent overlapping captures
  const router = useRouter();// WebSocket server URL - adjust as needed
  // For physical device, use your computer's IP address on the local network
  // For Android emulator, use 10.0.2.2 instead of localhost
  const getWebSocketURL = () => {
    // You need to replace this with your actual computer's IP address
    // Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find your IP
    const computerIP = '192.168.1.11'; // Replace with your computer's actual IP
    return `ws://${computerIP}:8765`;
  };
  
  const WS_URL = getWebSocketURL();  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Get available picture sizes when camera is ready
  const onCameraReady = async () => {
    if (cameraRef.current) {
      try {
        const sizes = await cameraRef.current.getAvailablePictureSizesAsync();
        console.log('📸 Available picture sizes:', sizes);
        setAvailablePictureSizes(sizes);
        
        // Find the best size close to 640x480
        const idealSize = sizes.find(size => 
          size.includes('640x480') || size.includes('480x640')
        );
        
        if (idealSize) {
          setSelectedPictureSize(idealSize);
          console.log('✅ Found ideal picture size:', idealSize);
        } else {
          // Find the smallest available size for better performance
          const smallestSize = sizes.sort((a, b) => {
            const [aW, aH] = a.split('x').map(Number);
            const [bW, bH] = b.split('x').map(Number);
            return (aW * aH) - (bW * bH);
          })[0];
          
          if (smallestSize) {
            setSelectedPictureSize(smallestSize);
            console.log('📱 Using smallest available size:', smallestSize);
          }
        }
      } catch (error) {
        console.error('Error getting picture sizes:', error);
      }
    }
  };const cleanup = () => {
    // Reset capture lock
    isCapturingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync?.();
      recordingRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };
  const connectWebSocket = () => {
    try {
      console.log('Attempting to connect to:', WS_URL);
      const ws = new WebSocket(WS_URL);
        ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempts(0); // Reset reconnect attempts on successful connection
        // Send ping to test connection
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            console.log('Received pong from server');          } else if (data.status === 'prediction') {
            // Handle prediction result
            const predictionResult = {
              predicted_class: data.predicted_class,
              confidence: data.confidence,
              above_threshold: data.above_threshold
            };
            
            setPrediction(predictionResult);            // Add high-confidence predictions to translation text
            if (predictionResult.above_threshold && 
                predictionResult.predicted_class.toLowerCase() !== 'neutral') {
              
              // Special threshold for 'hmd' sign - requires 99% confidence
              const isHmdSign = predictionResult.predicted_class.toLowerCase() === 'hmd';
              const confidenceThreshold = isHmdSign ? 0.99 : 0.95;
              
              if (predictionResult.confidence > confidenceThreshold) {
                setTranslationText(prev => {
                  const newWord = predictionResult.predicted_class;
                  // Don't add if it's the same as the last word (avoid repetition)
                  if (prev.length > 0 && prev[prev.length - 1] === newWord) {
                    return prev;
                  }
                  const newText = [...prev, newWord];
                  // Keep only last 10 words to prevent overflow
                  return newText.slice(-10);
                });
              }
            }
            
            setIsLoading(false);} else if (data.status === 'error') {
            console.error('Server error:', data.message);
            
            // Handle specific server errors
            if (data.message.includes('JSON serializable')) {
              console.log('Server JSON serialization error - continuing...');
              // Don't show alert for JSON errors, just log them
            } else {
              Alert.alert('Server Error', data.message);
            }
            
            // Don't stop loading for JSON serialization errors
            if (!data.message.includes('JSON serializable')) {
              setIsLoading(false);
            }          } else {
            // Handle server stats update
            const safeStats = {
              frames_collected: Number(data.frames_collected) || 0,
              frames_needed: Number(data.frames_needed) || 16,
              motion_detected: Boolean(data.motion_detected) || false,
              motion_score: Number(data.motion_score) || 0.0,
              motion_threshold: Number(data.motion_threshold) || 0.000001,
              status: String(data.status) || 'waiting'
            };
            
            setServerStats(safeStats);
            
            if (safeStats.status === 'ready') {
              setIsLoading(true);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        Alert.alert(
          'Connection Error', 
          `Failed to connect to server at ${WS_URL}. Please check:\n\n1. Server is running\n2. Correct IP address\n3. Same network\n4. Port 8765 is accessible`
        );
      };      ws.onclose = (event) => {
        console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);
        
        // Handle specific disconnect reasons
        if (event.code === 1009) {
          Alert.alert(
            'Frame Size Error', 
            'Image frames are too large. Try reducing camera quality or resolution.'
          );        } else if (event.code === 1001) {
          console.log('Server closed connection, attempting to reconnect...');
          // Attempt to reconnect after a short delay with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10 seconds
            setTimeout(() => {
              if (isRecording) {
                setReconnectAttempts(prev => prev + 1);
                connectWebSocket();
              }
            }, delay);
          } else {
            Alert.alert('Connection Failed', 'Unable to maintain connection to server. Please check server status.');
            setIsRecording(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
        
        // Don't stop recording on temporary disconnects, let reconnection handle it
        if (event.code !== 1001) {
          // Stop recording if disconnected for other reasons
          if (isRecording) {
            setIsRecording(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      Alert.alert('Connection Error', 'Failed to create WebSocket connection');
    }
  };
  const startRecording = async () => {
    if (!permission?.granted) {
      Alert.alert('Permissions Required', 'Camera permission is required');
      return;
    }

    if (!isConnected) {
      connectWebSocket();
      // Wait a bit for connection to establish
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          startVideoCapture();
        }
      }, 1000);
    } else {
      startVideoCapture();
    }
  };
  const [targetInterval, setTargetInterval] = useState(100); // Dynamic interval adjustment - more aggressive without resizing
  const [availablePictureSizes, setAvailablePictureSizes] = useState<string[]>([]);
  const [selectedPictureSize, setSelectedPictureSize] = useState<string>('640x480');
  const adjustFrameRate = () => {
    if (frameCompletionTimesRef.current.length >= 5) {
      const recentFps = frameCompletionTimesRef.current.length;
      const recentProcessTime = processTime;
      
      // Adjust target interval based on performance
      if (recentFps >= 8 && recentProcessTime < 100) {
        // Performance is good, try to go faster
        setTargetInterval(Math.max(50, targetInterval - 5));
      } else if (recentFps < 5 || recentProcessTime > 200) {
        // Performance is poor, slow down
        setTargetInterval(Math.min(100, targetInterval + 10));
      }
    }
  };
  const startVideoCapture = async () => {    try {
      setIsRecording(true);
      setPrediction(null);
      setIsLoading(false);      setFrameCount(0);
      setFps(0);
      setActualFps(0);
      setProcessTime(0);
      setTranslationText([]); // Clear translation text when starting
      frameTimesRef.current = [];
      frameCompletionTimesRef.current = [];
      lastFrameTimeRef.current = Date.now();// Start FPS counter with more accurate tracking
      fpsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        
        // Keep only frame times from the last second
        frameTimesRef.current = frameTimesRef.current.filter(time => time > oneSecondAgo);
        frameCompletionTimesRef.current = frameCompletionTimesRef.current.filter(time => time > oneSecondAgo);
        
        // Update attempted FPS and actual completed FPS
        setFps(frameTimesRef.current.length);
        setActualFps(frameCompletionTimesRef.current.length);
        
        // Calculate average processing time
        if (frameCompletionTimesRef.current.length > 0 && frameTimesRef.current.length > 0) {
          const recentProcessingTimes = [];
          for (let i = 0; i < Math.min(frameCompletionTimesRef.current.length, frameTimesRef.current.length); i++) {
            const startTime = frameTimesRef.current[frameTimesRef.current.length - 1 - i];
            const endTime = frameCompletionTimesRef.current[frameCompletionTimesRef.current.length - 1 - i];
            if (startTime && endTime && endTime > startTime) {
              recentProcessingTimes.push(endTime - startTime);
            }
          }
          if (recentProcessingTimes.length > 0) {
            const avgProcessTime = recentProcessingTimes.reduce((acc, time) => acc + time, 0) / recentProcessingTimes.length;
            setProcessTime(Math.round(avgProcessTime));
          }
        }
      }, 100); // Update FPS display every 100ms for smoother tracking

// Start capturing frames at higher rate for better FPS - reduced interval for more aggressive FPS
      intervalRef.current = setInterval(async () => {
        await captureFrame();
      }, targetInterval); // Capture every 60ms (16.7 FPS target) - very aggressive timing

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };const captureFrame = async () => {
    // ⏱️ TIMING: Initial checks
    const processStartTime = Date.now();
    console.log(`🎬 === FRAME ${frameCount + 1} TIMING ANALYSIS ===`);
      // Frame skip disabled - allowing overlapping captures
    // if (isCapturingRef.current) {
    //   console.log('⚠️ Frame skipped - already capturing');
    //   return;
    // }
    
    const connectionCheckStart = Date.now();
    if (!cameraRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // If WebSocket is not connected but we're still recording, try to reconnect
      if (isRecording && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        console.log('WebSocket not connected, attempting reconnection...');
        connectWebSocket();
      }
      return;
    }
    const connectionCheckEnd = Date.now();
    console.log(`⏱️ Connection check: ${connectionCheckEnd - connectionCheckStart}ms`);

    const frameStartTime = Date.now();
    isCapturingRef.current = true; // Set capture lock
    
    try {
      // ⏱️ TIMING: FPS tracking setup
      const fpsTrackingStart = Date.now();
      frameTimesRef.current.push(frameStartTime);
      setFrameCount(prev => prev + 1);
      const fpsTrackingEnd = Date.now();
      console.log(`⏱️ FPS tracking setup: ${fpsTrackingEnd - fpsTrackingStart}ms`);

      // ⏱️ TIMING: Camera capture
      const photoStartTime = Date.now();
      console.log(`📸 Starting camera takePictureAsync...`);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: false,
        imageType: 'jpg',
        exif: false,
        shutterSound: false,
      });
      
      const photoEndTime = Date.now();
      const photoCaptureTime = photoEndTime - photoStartTime;
      console.log(`⏱️ 📸 Camera capture: ${photoCaptureTime}ms`);

      if (photo.base64) {
        // ⏱️ TIMING: Size calculation
        const sizeCalcStart = Date.now();
        let estimatedSize = (photo.base64.length * 0.75) / 1024; // Size in KB
        const sizeCalcEnd = Date.now();
        console.log(`⏱️ Size calculation: ${sizeCalcEnd - sizeCalcStart}ms`);
        
        console.log(`📊 Captured ${photo.width}x${photo.height} (size: ~${estimatedSize.toFixed(0)}KB)`);
        
        if (estimatedSize <= 2048) {
          // ⏱️ TIMING: JSON stringify
          const jsonStart = Date.now();
          const jsonData = JSON.stringify({
            type: 'frame',
            data: photo.base64,
            timestamp: Date.now(),
            format: 'jpeg',
            size_kb: Math.round(estimatedSize),
            dimensions: `${photo.width}x${photo.height}`
          });
          const jsonEnd = Date.now();
          console.log(`⏱️ JSON stringify: ${jsonEnd - jsonStart}ms`);
          
          // ⏱️ TIMING: WebSocket send
          const sendStartTime = Date.now();
          wsRef.current.send(jsonData);
          const sendEndTime = Date.now();
          console.log(`⏱️ 📤 WebSocket send: ${sendEndTime - sendStartTime}ms`);
          
          // ⏱️ TIMING: Completion tracking
          const trackingStart = Date.now();
          frameCompletionTimesRef.current.push(Date.now());
          const trackingEnd = Date.now();
          console.log(`⏱️ Completion tracking: ${trackingEnd - trackingStart}ms`);
          
          // ⏱️ TOTAL TIMING SUMMARY
          const totalTime = Date.now() - frameStartTime;
          const overallTime = Date.now() - processStartTime;
          
          console.log(`📋 === TIMING BREAKDOWN ===`);
          console.log(`   Connection check: ${connectionCheckEnd - connectionCheckStart}ms`);
          console.log(`   FPS tracking: ${fpsTrackingEnd - fpsTrackingStart}ms`);
          console.log(`   📸 Camera capture: ${photoCaptureTime}ms`);
          console.log(`   Size calculation: ${sizeCalcEnd - sizeCalcStart}ms`);
          console.log(`   JSON stringify: ${jsonEnd - jsonStart}ms`);
          console.log(`   📤 WebSocket send: ${sendEndTime - sendStartTime}ms`);
          console.log(`   Completion tracking: ${trackingEnd - trackingStart}ms`);
          console.log(`🏁 TOTAL PROCESS TIME: ${totalTime}ms`);
          console.log(`🏁 OVERALL TIME: ${overallTime}ms`);
          console.log(`🎬 === END FRAME ${frameCount} ANALYSIS ===\n`);
          
        } else {
          console.warn(`Frame too large (${estimatedSize.toFixed(0)}KB), skipping`);
        }
      }
    } catch (error) {
      console.error('Error capturing/resizing frame:', error);
    } finally {
      isCapturingRef.current = false; // Release capture lock
      const finalTime = Date.now() - processStartTime;
      console.log(`⏱️ Finally block - Total elapsed: ${finalTime}ms`);
    }
  };const stopRecording = () => {
    console.log('🛑 STOPPING ALL CAPTURE PROCESSES');
    
    // Immediately stop recording state
    setIsRecording(false);
    setIsLoading(false);
    
    // Force stop any ongoing captures
    isCapturingRef.current = false;
    
    // Clear all intervals immediately
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('✅ Frame capture interval cleared');
    }
    
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
      console.log('✅ FPS tracking interval cleared');
    }
    
    // Close WebSocket connection to stop server communication
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      console.log('✅ WebSocket connection closed');
    }
    
    // Reset all states and counters
    setFps(0);
    setActualFps(0);
    setFrameCount(0);
    setProcessTime(0);
    setPrediction(null);
    frameTimesRef.current = [];
    frameCompletionTimesRef.current = [];
    
    console.log('🛑 ALL CAPTURE PROCESSES STOPPED');
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const adjustMotionThreshold = (factor: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'adjust_threshold',
        factor: factor
      }));
    }
  };

  const toggleStats = () => {
    setShowStats(prev => !prev);
  };

  const clearTranslation = () => {
    setTranslationText([]);
  };

  if (!permission) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {/* Camera View - Full Screen Background */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          animateShutter={false}
          ratio="4:3"
          pictureSize={selectedPictureSize}
          onCameraReady={onCameraReady}
        />        {/* Header - Overlay on top of camera */}
        <View style={styles.header}>
          <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.connectionText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
          <View style={{ flex: 1 }} />          {/* Prediction Result - Top Right */}
          {prediction && (
            <View style={[styles.predictionContainer, 
              { backgroundColor: prediction.above_threshold ? '#4CAF50' : '#FF9800' }
            ]}>
              <Text style={styles.predictionText}>
                {prediction.predicted_class}
              </Text>
              <Text style={styles.confidenceText}>
                {(prediction.confidence * 100).toFixed(2)}%
              </Text>
            </View>
          )}
        </View>{/* Stats Overlay */}
        {showStats && (
          <View style={styles.statsOverlay}>
            <Text style={styles.statsText}>
              FPS: {actualFps} actual | {fps} attempted
            </Text>
            <Text style={styles.statsText}>
              Process Time: {processTime}ms | Interval: {targetInterval}ms
            </Text>
            <Text style={styles.statsText}>
              Picture Size: {selectedPictureSize} | Frames: {frameCount}
            </Text>
            <Text style={styles.statsText}>
              Connected: {isConnected ? 'Yes' : 'No'} | Server: {serverStats.frames_collected}/{serverStats.frames_needed}
            </Text>
            <Text style={styles.statsText}>
              Motion: {serverStats.motion_detected ? 'Yes' : 'No'} ({serverStats.motion_score.toFixed(6)})
            </Text>
            <Text style={styles.statsText}>
              Status: {serverStats.status}
            </Text>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.statsText}>Processing...</Text>
              </View>
            )}
          </View>        )}

        {/* Translation Display - Translation App Style */}
        {translationText.length > 0 && (
          <View style={styles.translationContainer}>
            <View style={styles.translationHeader}>
              <Text style={styles.translationLabel}>Translation</Text>
              <TouchableOpacity onPress={clearTranslation} style={styles.clearButton}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.translationText}>
              {translationText.join(' ')}
            </Text>
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${(serverStats.frames_collected / serverStats.frames_needed) * 100}%` }
            ]} 
          />
        </View>        {/* Controls - Overlay at bottom */}
        <View style={styles.controlsContainer}>
          {/* Secondary Controls with Record Button in Middle */}
          <View style={styles.secondaryControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Main Record Button */}            <TouchableOpacity
              style={[styles.recordButton, isRecording ? styles.recordingButton : null]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              <Ionicons 
                name={isRecording ? "stop" : "play"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>

            {/* Stats Toggle Button */}
            <TouchableOpacity style={styles.controlButton} onPress={toggleStats}>
              <Ionicons name={showStats ? "eye-off" : "eye"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cameraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },  statsOverlay: {
    position: 'absolute',
    top: 100,  // Below the header
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    zIndex: 5,
  },
  statsText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },  predictionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 80,
    gap: 8,
  },predictionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
  },  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },recordButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  translationContainer: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 16,
    zIndex: 8,
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  translationLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  clearButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  translationText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
  },
});
