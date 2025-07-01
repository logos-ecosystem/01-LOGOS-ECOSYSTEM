import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Fade,
  LinearProgress,
  Alert,
  Collapse
} from '@mui/material';
import {
  Mic,
  MicOff,
  Stop,
  VolumeUp,
  VolumeOff,
  Settings,
  Close
} from '@mui/icons-material';
import { api } from '../../services/api';

interface VoiceInterfaceProps {
  onTranscript?: (text: string) => void;
  onResponse?: (audio: string, text: string) => void;
  agentId?: string;
  autoPlay?: boolean;
  language?: string;
}

export default function VoiceInterface({
  onTranscript,
  onResponse,
  agentId,
  autoPlay = true,
  language = 'en-US'
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API for real-time transcription
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.language = language;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript && onTranscript) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        stopListening();
      };
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [language, onTranscript]);

  const startListening = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start visualization
      visualizeAudio();
      
      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsListening(false);
    setAudioLevel(0);
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscript('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.wav');
      if (agentId) {
        formData.append('agent_id', agentId);
      }
      
      const response = await api.post('/ai/voice-chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { transcription, content, audio_url } = response.data.data;
      
      if (onTranscript && transcription) {
        onTranscript(transcription);
      }
      
      if (audio_url && autoPlay) {
        playAudioResponse(audio_url);
      }
      
      if (onResponse) {
        onResponse(audio_url, content);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    
    audioElementRef.current = new Audio(audioUrl);
    audioElementRef.current.volume = volume;
    
    audioElementRef.current.onplay = () => setIsPlaying(true);
    audioElementRef.current.onended = () => setIsPlaying(false);
    audioElementRef.current.onerror = () => {
      setError('Failed to play audio response');
      setIsPlaying(false);
    };
    
    audioElementRef.current.play().catch(err => {
      console.error('Error playing audio:', err);
      setError('Failed to play audio response');
    });
  };

  const toggleMute = () => {
    const newVolume = volume === 0 ? 1 : 0;
    setVolume(newVolume);
    if (audioElementRef.current) {
      audioElementRef.current.volume = newVolume;
    }
  };

  return (
    <Paper sx={{ p: 2, position: 'relative' }}>
      <Collapse in={!!error}>
        <Alert
          severity="error"
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <Close fontSize="small" />
            </IconButton>
          }
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      </Collapse>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {/* Audio Level Indicator */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            border: '3px solid',
            borderColor: isListening ? 'primary.main' : 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.3s',
            transform: `scale(${1 + audioLevel * 0.2})`,
            '&::before': {
              content: '""',
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'primary.main',
              opacity: audioLevel * 0.3,
              animation: isListening ? 'pulse 2s infinite' : 'none',
            },
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', opacity: 0.3 },
              '50%': { transform: 'scale(1.1)', opacity: 0.1 },
              '100%': { transform: 'scale(1)', opacity: 0.3 },
            },
          }}
        >
          <IconButton
            size="large"
            color={isListening ? 'error' : 'primary'}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            sx={{ zIndex: 1 }}
          >
            {isListening ? <Stop sx={{ fontSize: 40 }} /> : <Mic sx={{ fontSize: 40 }} />}
          </IconButton>
        </Box>

        {/* Status */}
        <Box sx={{ textAlign: 'center' }}>
          {isListening && (
            <Fade in>
              <Box>
                <Typography variant="body1" color="primary">
                  Listening...
                </Typography>
                {transcript && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    "{transcript}"
                  </Typography>
                )}
              </Box>
            </Fade>
          )}
          
          {isProcessing && (
            <Fade in>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body1">Processing...</Typography>
              </Box>
            </Fade>
          )}
          
          {isPlaying && (
            <Fade in>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VolumeUp color="primary" />
                <Typography variant="body1" color="primary">
                  Playing response...
                </Typography>
              </Box>
            </Fade>
          )}
        </Box>

        {/* Audio Progress */}
        {(isListening || isProcessing || isPlaying) && (
          <Box sx={{ width: '100%' }}>
            <LinearProgress
              variant={isProcessing ? 'indeterminate' : 'determinate'}
              value={isListening ? audioLevel * 100 : 0}
            />
          </Box>
        )}

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<Mic />}
            label={language}
            size="small"
            variant="outlined"
          />
          {agentId && (
            <Chip
              label="Agent Connected"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
          <IconButton size="small" onClick={toggleMute}>
            {volume === 0 ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Box>
      </Box>

      {/* Instructions */}
      {!isListening && !isProcessing && !isPlaying && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          Click the microphone to start voice interaction
        </Typography>
      )}
    </Paper>
  );
}