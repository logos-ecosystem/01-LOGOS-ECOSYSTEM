"""
ML-based anomaly detection for security threat identification
"""

import asyncio
import time
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import json

from ...shared.utils.logger import get_logger
from ...infrastructure.cache import cache_manager
from ..email import email_service

logger = get_logger(__name__)


class SecurityEvent:
    """Represents a security event for analysis"""
    
    def __init__(
        self,
        user_id: str,
        event_type: str,
        ip_address: str,
        user_agent: str,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.user_id = user_id
        self.event_type = event_type
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.timestamp = timestamp or datetime.utcnow()
        self.metadata = metadata or {}
    
    def to_feature_vector(self) -> List[float]:
        """Convert event to numerical features for ML model"""
        features = []
        
        # Time-based features
        hour = self.timestamp.hour
        day_of_week = self.timestamp.weekday()
        features.extend([hour, day_of_week])
        
        # IP-based features (simplified - in production use IP geolocation)
        ip_parts = self.ip_address.split('.')
        if len(ip_parts) == 4:
            features.extend([int(p) for p in ip_parts])
        else:
            features.extend([0, 0, 0, 0])
        
        # Event type encoding
        event_types = {
            'login': 1, 'api_call': 2, 'transaction': 3,
            'password_change': 4, 'profile_update': 5
        }
        features.append(event_types.get(self.event_type, 0))
        
        # Additional metadata features
        features.append(self.metadata.get('request_count', 0))
        features.append(self.metadata.get('failed_attempts', 0))
        features.append(self.metadata.get('session_duration', 0))
        
        return features


class AnomalyDetector:
    """Machine learning based anomaly detection system"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.threshold = 0.1  # Anomaly threshold
        self.user_profiles = defaultdict(list)
        self.blocked_users = set()
        self.alert_thresholds = {
            'low': 0.3,
            'medium': 0.5,
            'high': 0.7,
            'critical': 0.9
        }
        
    async def initialize(self):
        """Initialize or load the ML model"""
        try:
            # Try to load existing model
            self.model = joblib.load('anomaly_model.pkl')
            self.scaler = joblib.load('anomaly_scaler.pkl')
            logger.info("Loaded existing anomaly detection model")
        except:
            # Create new model
            self.model = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )
            logger.info("Created new anomaly detection model")
    
    async def train_model(self, training_data: List[SecurityEvent]):
        """Train the anomaly detection model"""
        if len(training_data) < 100:
            logger.warning("Insufficient training data")
            return
        
        # Convert events to feature vectors
        features = [event.to_feature_vector() for event in training_data]
        X = np.array(features)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model.fit(X_scaled)
        
        # Save model
        joblib.dump(self.model, 'anomaly_model.pkl')
        joblib.dump(self.scaler, 'anomaly_scaler.pkl')
        
        logger.info(f"Trained anomaly model with {len(training_data)} samples")
    
    async def analyze_event(self, event: SecurityEvent) -> Tuple[float, str]:
        """Analyze a security event and return risk score and level"""
        if not self.model:
            await self.initialize()
        
        # Extract features
        features = np.array([event.to_feature_vector()])
        
        try:
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Get anomaly score (-1 for anomaly, 1 for normal)
            prediction = self.model.predict(features_scaled)[0]
            anomaly_score = self.model.score_samples(features_scaled)[0]
            
            # Convert to risk score (0-1)
            risk_score = 1 / (1 + np.exp(anomaly_score))
            
            # Determine risk level
            risk_level = 'low'
            for level, threshold in sorted(self.alert_thresholds.items(), 
                                         key=lambda x: x[1], reverse=True):
                if risk_score >= threshold:
                    risk_level = level
                    break
            
            # Store event for user profile
            await self._update_user_profile(event, risk_score)
            
            # Check if action needed
            await self._check_and_act(event, risk_score, risk_level)
            
            return risk_score, risk_level
            
        except Exception as e:
            logger.error(f"Error analyzing event: {str(e)}")
            return 0.5, 'medium'  # Default to medium risk
    
    async def _update_user_profile(self, event: SecurityEvent, risk_score: float):
        """Update user behavior profile"""
        profile_key = f"user_profile:{event.user_id}"
        
        # Get existing profile
        profile_data = await cache_manager.get(profile_key) or {
            'events': [],
            'avg_risk': 0,
            'total_events': 0
        }
        
        # Add new event
        profile_data['events'].append({
            'timestamp': event.timestamp.isoformat(),
            'type': event.event_type,
            'risk_score': risk_score
        })
        
        # Keep only recent events (last 30 days)
        cutoff = datetime.utcnow() - timedelta(days=30)
        profile_data['events'] = [
            e for e in profile_data['events']
            if datetime.fromisoformat(e['timestamp']) > cutoff
        ]
        
        # Update statistics
        if profile_data['events']:
            scores = [e['risk_score'] for e in profile_data['events']]
            profile_data['avg_risk'] = np.mean(scores)
            profile_data['total_events'] = len(profile_data['events'])
        
        # Save profile
        await cache_manager.set(profile_key, profile_data, ttl=86400 * 30)
    
    async def _check_and_act(self, event: SecurityEvent, risk_score: float, risk_level: str):
        """Take action based on risk assessment"""
        if risk_level == 'critical':
            # Block user immediately
            await self.block_user(event.user_id, reason="Critical security threat detected")
            
            # Send alert
            await self._send_security_alert(event, risk_score, risk_level)
            
        elif risk_level == 'high':
            # Increment failed attempts
            attempts_key = f"security_attempts:{event.user_id}"
            attempts = await cache_manager.increment(attempts_key)
            
            if attempts >= 3:
                # Block after 3 high-risk events
                await self.block_user(event.user_id, reason="Multiple high-risk activities")
            
            # Send alert
            await self._send_security_alert(event, risk_score, risk_level)
    
    async def block_user(self, user_id: str, reason: str, duration: int = 3600):
        """Block a user temporarily"""
        self.blocked_users.add(user_id)
        
        # Store in cache
        block_key = f"blocked_user:{user_id}"
        await cache_manager.set(
            block_key,
            {
                'reason': reason,
                'blocked_at': datetime.utcnow().isoformat(),
                'duration': duration
            },
            ttl=duration
        )
        
        logger.warning(f"Blocked user {user_id}: {reason}")
    
    async def unblock_user(self, user_id: str):
        """Unblock a user"""
        self.blocked_users.discard(user_id)
        block_key = f"blocked_user:{user_id}"
        await cache_manager.delete(block_key)
        
        logger.info(f"Unblocked user {user_id}")
    
    async def is_user_blocked(self, user_id: str) -> bool:
        """Check if user is blocked"""
        if user_id in self.blocked_users:
            return True
        
        block_key = f"blocked_user:{user_id}"
        return await cache_manager.exists(block_key)
    
    async def _send_security_alert(self, event: SecurityEvent, risk_score: float, risk_level: str):
        """Send security alert to administrators"""
        alert_data = {
            'user_id': event.user_id,
            'event_type': event.event_type,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'ip_address': event.ip_address,
            'timestamp': event.timestamp.isoformat(),
            'metadata': event.metadata
        }
        
        # Log alert
        logger.warning(f"Security alert: {risk_level} risk - {json.dumps(alert_data)}")
        
        # Send email alert for high/critical risks
        if risk_level in ['high', 'critical']:
            # This would send to admin email
            pass  # Email implementation would go here
    
    async def get_user_risk_profile(self, user_id: str) -> Dict[str, Any]:
        """Get risk profile for a user"""
        profile_key = f"user_profile:{user_id}"
        profile = await cache_manager.get(profile_key)
        
        if not profile:
            return {
                'user_id': user_id,
                'risk_level': 'unknown',
                'avg_risk_score': 0,
                'total_events': 0,
                'recent_events': []
            }
        
        # Determine current risk level
        avg_risk = profile.get('avg_risk', 0)
        risk_level = 'low'
        for level, threshold in sorted(self.alert_thresholds.items(), 
                                     key=lambda x: x[1], reverse=True):
            if avg_risk >= threshold:
                risk_level = level
                break
        
        return {
            'user_id': user_id,
            'risk_level': risk_level,
            'avg_risk_score': avg_risk,
            'total_events': profile.get('total_events', 0),
            'recent_events': profile.get('events', [])[-10:]  # Last 10 events
        }
    
    async def get_system_threats(self) -> Dict[str, Any]:
        """Get current system-wide threat analysis"""
        # Get all blocked users
        blocked_pattern = "blocked_user:*"
        blocked_keys = await cache_manager.redis.keys(blocked_pattern)
        blocked_count = len(blocked_keys)
        
        # Get high-risk users
        high_risk_users = []
        profile_pattern = "user_profile:*"
        profile_keys = await cache_manager.redis.keys(profile_pattern)
        
        for key in profile_keys[:100]:  # Check first 100 users
            profile = await cache_manager.get(key.decode())
            if profile and profile.get('avg_risk', 0) > 0.5:
                user_id = key.decode().replace('user_profile:', '')
                high_risk_users.append({
                    'user_id': user_id,
                    'risk_score': profile['avg_risk']
                })
        
        # Sort by risk score
        high_risk_users.sort(key=lambda x: x['risk_score'], reverse=True)
        
        return {
            'blocked_users_count': blocked_count,
            'high_risk_users': high_risk_users[:10],  # Top 10
            'threat_level': self._calculate_threat_level(blocked_count, len(high_risk_users))
        }
    
    def _calculate_threat_level(self, blocked_count: int, high_risk_count: int) -> str:
        """Calculate overall system threat level"""
        score = (blocked_count * 2 + high_risk_count) / 10
        
        if score < 1:
            return 'low'
        elif score < 5:
            return 'medium'
        elif score < 10:
            return 'high'
        else:
            return 'critical'


# Global anomaly detector instance
anomaly_detector = AnomalyDetector()


# Helper function to track security events
async def track_security_event(
    user_id: str,
    event_type: str,
    ip_address: str,
    user_agent: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Tuple[float, str]:
    """Track and analyze a security event"""
    event = SecurityEvent(
        user_id=user_id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata
    )
    
    return await anomaly_detector.analyze_event(event)