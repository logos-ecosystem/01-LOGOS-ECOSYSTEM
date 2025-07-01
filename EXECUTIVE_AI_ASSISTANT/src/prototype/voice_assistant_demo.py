#!/usr/bin/env python3
"""
Voice Assistant Demo
Interactive voice-controlled AI assistant for executives
"""

import asyncio
import speech_recognition as sr
import pyttsx3
import requests
import json
import sys
import os
from datetime import datetime
from typing import Optional

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.core.config import settings


class VoiceAssistant:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.engine = pyttsx3.init()
        self.api_base = f"http://localhost:{settings.PORT}/api/v1"
        self.conversation_id = None
        self.language = "en-US"
        
        # Configure TTS engine
        self.engine.setProperty('rate', 150)
        self.engine.setProperty('volume', 0.9)
        
        # Set voice
        voices = self.engine.getProperty('voices')
        if voices:
            self.engine.setProperty('voice', voices[0].id)
    
    def speak(self, text: str):
        """Convert text to speech"""
        print(f"Assistant: {text}")
        self.engine.say(text)
        self.engine.runAndWait()
    
    def listen(self) -> Optional[str]:
        """Listen for voice input"""
        with self.microphone as source:
            print("\nListening...")
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            try:
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                print("Processing...")
                
                # Recognize speech
                text = self.recognizer.recognize_google(audio, language=self.language)
                print(f"You: {text}")
                return text
                
            except sr.WaitTimeoutError:
                print("No speech detected")
                return None
            except sr.UnknownValueError:
                print("Could not understand audio")
                return None
            except sr.RequestError as e:
                print(f"Error: {e}")
                return None
    
    async def send_to_api(self, message: str) -> Optional[str]:
        """Send message to the API"""
        try:
            response = requests.post(
                f"{self.api_base}/chat/",
                json={
                    "message": message,
                    "conversation_id": self.conversation_id,
                    "language": self.language[:2],
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.conversation_id = data.get("conversation_id")
                return data.get("response")
            else:
                print(f"API Error: {response.status_code}")
                return None
                
        except requests.exceptions.ConnectionError:
            print("Error: Cannot connect to API. Make sure the server is running.")
            return None
        except Exception as e:
            print(f"Error: {str(e)}")
            return None
    
    async def run(self):
        """Main voice assistant loop"""
        self.speak("Hello! I'm your Executive AI Assistant. How can I help you today?")
        
        print("\nVoice Commands:")
        print("- Say 'exit' or 'quit' to stop")
        print("- Say 'spanish' to switch to Spanish")
        print("- Say 'english' to switch to English")
        print("- Say 'new conversation' to start fresh")
        
        while True:
            # Listen for input
            text = self.listen()
            
            if not text:
                continue
            
            # Check for commands
            lower_text = text.lower()
            
            if lower_text in ['exit', 'quit', 'goodbye']:
                self.speak("Goodbye! Have a great day!")
                break
            
            elif lower_text == 'spanish':
                self.language = "es-ES"
                self.speak("Cambiando a español. ¿En qué puedo ayudarte?")
                continue
            
            elif lower_text == 'english':
                self.language = "en-US"
                self.speak("Switching to English. How can I help you?")
                continue
            
            elif lower_text == 'new conversation':
                self.conversation_id = None
                self.speak("Starting a new conversation. What would you like to discuss?")
                continue
            
            # Send to API
            response = await self.send_to_api(text)
            
            if response:
                self.speak(response)
            else:
                self.speak("I'm sorry, I couldn't process that request. Please try again.")


def check_microphone():
    """Check if microphone is available"""
    try:
        mic = sr.Microphone()
        return True
    except Exception as e:
        print(f"Microphone Error: {str(e)}")
        print("\nPlease ensure:")
        print("1. A microphone is connected")
        print("2. PyAudio is properly installed")
        print("3. You have microphone permissions")
        return False


async def main():
    """Main entry point"""
    print("Executive AI Voice Assistant Demo")
    print("=" * 40)
    
    # Check dependencies
    if not check_microphone():
        print("\nFalling back to text mode...")
        # TODO: Implement text-based fallback
        return
    
    # Check if API is running
    try:
        response = requests.get(f"http://localhost:{settings.PORT}/api/v1/health/")
        if response.status_code != 200:
            print("Warning: API server is not responding properly")
    except:
        print("\nError: API server is not running!")
        print(f"Please start the server first:")
        print(f"  uvicorn src.backend.main:app --reload --port {settings.PORT}")
        return
    
    # Run assistant
    assistant = VoiceAssistant()
    await assistant.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped by user")
    except Exception as e:
        print(f"\nError: {str(e)}")