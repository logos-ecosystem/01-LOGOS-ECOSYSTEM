"""Security Monitoring Service - Real-time security event monitoring and alerting"""

from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import json
import re
from collections import defaultdict, deque
import aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings

settings = get_settings()
from ...shared.models.user import User, SecurityEvent
from ...infrastructure.cache import cache_manager
from ...infrastructure.database import get_db
from ..email import email_service
from ..websocket import websocket_manager
from .anomaly_detection import AnomalyDetector

logger = get_logger(__name__)


class SecurityEventType(Enum):
    """Types of security events"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_SUSPICIOUS = "login_suspicious"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGED = "password_changed"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    MFA_FAILED = "mfa_failed"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    PERMISSION_DENIED = "permission_denied"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_EXPORT = "data_export"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    SESSION_HIJACK_ATTEMPT = "session_hijack_attempt"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    CSRF_ATTEMPT = "csrf_attempt"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"
    MALWARE_DETECTED = "malware_detected"
    DDOS_ATTEMPT = "ddos_attempt"
    BOT_DETECTED = "bot_detected"


class SeverityLevel(Enum):
    """Security event severity levels"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatLevel(Enum):
    """Overall system threat levels"""
    NORMAL = "normal"
    ELEVATED = "elevated"
    HIGH = "high"
    SEVERE = "severe"
    CRITICAL = "critical"


@dataclass
class SecurityMetrics:
    """Security metrics for monitoring"""
    total_events: int = 0
    events_by_type: Dict[str, int] = field(default_factory=dict)
    events_by_severity: Dict[str, int] = field(default_factory=dict)
    failed_login_attempts: int = 0
    successful_logins: int = 0
    active_sessions: int = 0
    blocked_ips: int = 0
    rate_limit_violations: int = 0
    suspicious_activities: int = 0
    current_threat_level: ThreatLevel = ThreatLevel.NORMAL
    last_critical_event: Optional[datetime] = None
    events_last_hour: int = 0
    events_last_24h: int = 0
    top_threat_sources: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SecurityAlert:
    """Security alert structure"""
    id: str
    type: SecurityEventType
    severity: SeverityLevel
    title: str
    description: str
    source_ip: Optional[str]
    user_id: Optional[str]
    metadata: Dict[str, Any]
    timestamp: datetime
    resolved: bool = False
    resolution_time: Optional[datetime] = None
    notified_users: List[str] = field(default_factory=list)


class SecurityMonitor:
    """Real-time security monitoring and alerting system"""
    
    def __init__(self):
        self.cache = cache_manager
        self.anomaly_detector = AnomalyDetector()
        self.active_alerts: Dict[str, SecurityAlert] = {}
        self.event_buffer: deque = deque(maxlen=10000)
        self.metrics = SecurityMetrics()
        self.monitoring_active = False
        self._monitoring_task: Optional[asyncio.Task] = None
        
        # Configuration
        self.alert_thresholds = {
            SecurityEventType.LOGIN_FAILED: 5,  # Alert after 5 failed logins
            SecurityEventType.RATE_LIMIT_EXCEEDED: 10,  # Alert after 10 rate limit violations
            SecurityEventType.SUSPICIOUS_ACTIVITY: 3,  # Alert after 3 suspicious activities
            SecurityEventType.BRUTE_FORCE_ATTEMPT: 1,  # Alert immediately
            SecurityEventType.SQL_INJECTION_ATTEMPT: 1,  # Alert immediately
            SecurityEventType.XSS_ATTEMPT: 1,  # Alert immediately
            SecurityEventType.DATA_BREACH_ATTEMPT: 1,  # Alert immediately
        }
        
        self.severity_mapping = {
            SecurityEventType.LOGIN_SUCCESS: SeverityLevel.INFO,
            SecurityEventType.LOGIN_FAILED: SeverityLevel.LOW,
            SecurityEventType.LOGIN_SUSPICIOUS: SeverityLevel.MEDIUM,
            SecurityEventType.PASSWORD_RESET: SeverityLevel.INFO,
            SecurityEventType.PASSWORD_CHANGED: SeverityLevel.INFO,
            SecurityEventType.MFA_ENABLED: SeverityLevel.INFO,
            SecurityEventType.MFA_DISABLED: SeverityLevel.MEDIUM,
            SecurityEventType.MFA_FAILED: SeverityLevel.LOW,
            SecurityEventType.API_KEY_CREATED: SeverityLevel.INFO,
            SecurityEventType.API_KEY_REVOKED: SeverityLevel.INFO,
            SecurityEventType.PERMISSION_DENIED: SeverityLevel.MEDIUM,
            SecurityEventType.RATE_LIMIT_EXCEEDED: SeverityLevel.MEDIUM,
            SecurityEventType.SUSPICIOUS_ACTIVITY: SeverityLevel.HIGH,
            SecurityEventType.DATA_EXPORT: SeverityLevel.MEDIUM,
            SecurityEventType.ACCOUNT_LOCKED: SeverityLevel.MEDIUM,
            SecurityEventType.ACCOUNT_UNLOCKED: SeverityLevel.INFO,
            SecurityEventType.SESSION_HIJACK_ATTEMPT: SeverityLevel.CRITICAL,
            SecurityEventType.SQL_INJECTION_ATTEMPT: SeverityLevel.CRITICAL,
            SecurityEventType.XSS_ATTEMPT: SeverityLevel.HIGH,
            SecurityEventType.CSRF_ATTEMPT: SeverityLevel.HIGH,
            SecurityEventType.BRUTE_FORCE_ATTEMPT: SeverityLevel.CRITICAL,
            SecurityEventType.PRIVILEGE_ESCALATION: SeverityLevel.CRITICAL,
            SecurityEventType.UNAUTHORIZED_ACCESS: SeverityLevel.HIGH,
            SecurityEventType.DATA_BREACH_ATTEMPT: SeverityLevel.CRITICAL,
            SecurityEventType.MALWARE_DETECTED: SeverityLevel.CRITICAL,
            SecurityEventType.DDOS_ATTEMPT: SeverityLevel.CRITICAL,
            SecurityEventType.BOT_DETECTED: SeverityLevel.MEDIUM,
        }
        
        # IP reputation tracking
        self.ip_reputation: Dict[str, float] = {}
        self.blocked_ips: Set[str] = set()
        
        # Pattern detection for attacks
        self.attack_patterns = {
            'sql_injection': [
                r"(\b(union|select|insert|update|delete|drop|create)\b.*\b(from|where|table)\b)",
                r"(;|'|\"|--).*?(select|union|insert|update|delete|drop)",
                r"(\b(or|and)\b\s*\d+\s*=\s*\d+)",
            ],
            'xss': [
                r"<script[^>]*>.*?</script>",
                r"javascript:",
                r"on\w+\s*=",
                r"<iframe[^>]*>",
            ],
            'path_traversal': [
                r"\.\./",
                r"\.\\/",
                r"%2e%2e/",
                r"%252e%252e/",
            ],
            'command_injection': [
                r";\s*(ls|cat|rm|wget|curl|nc|netcat)",
                r"\|\s*(ls|cat|rm|wget|curl|nc|netcat)",
                r"`.*`",
                r"\$\(.*\)",
            ],
        }
    
    async def start_monitoring(self):
        """Start the security monitoring service"""
        if self.monitoring_active:
            logger.warning("Security monitoring already active")
            return
        
        self.monitoring_active = True
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Security monitoring service started")
    
    async def stop_monitoring(self):
        """Stop the security monitoring service"""
        self.monitoring_active = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Security monitoring service stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Process event buffer
                await self._process_event_buffer()
                
                # Update metrics
                await self._update_metrics()
                
                # Check for anomalies
                await self._check_anomalies()
                
                # Update threat level
                await self._update_threat_level()
                
                # Check alert conditions
                await self._check_alert_conditions()
                
                # Clean up old data
                await self._cleanup_old_data()
                
                # Export metrics for Prometheus
                await self._export_metrics()
                
                # Sleep for monitoring interval
                await asyncio.sleep(settings.SECURITY_MONITORING_INTERVAL or 5)
                
            except Exception as e:
                logger.error(f"Error in security monitoring loop: {str(e)}")
                await asyncio.sleep(5)
    
    async def log_security_event(
        self,
        event_type: SecurityEventType,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None
    ):
        """Log a security event"""
        try:
            # Create event record
            event = {
                'id': f"evt_{datetime.utcnow().timestamp()}_{event_type.value}",
                'type': event_type,
                'user_id': user_id,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'metadata': metadata or {},
                'timestamp': datetime.utcnow(),
                'severity': self.severity_mapping.get(event_type, SeverityLevel.INFO),
            }
            
            # Add to event buffer
            self.event_buffer.append(event)
            
            # Check for attack patterns
            if metadata:
                await self._check_attack_patterns(event, metadata)
            
            # Update IP reputation
            if ip_address:
                await self._update_ip_reputation(ip_address, event_type)
            
            # Check if immediate action needed
            if event['severity'] in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
                await self._handle_high_severity_event(event)
            
            # Store in database if provided
            if db:
                security_event = SecurityEvent(
                    event_type=event_type.value,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata=json.dumps(metadata or {}),
                    severity=event['severity'].value,
                )
                db.add(security_event)
                await db.commit()
            
            # Broadcast to WebSocket clients (admins only)
            await self._broadcast_security_event(event)
            
            logger.info(f"Security event logged: {event_type.value} - User: {user_id} - IP: {ip_address}")
            
        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")
    
    async def _check_attack_patterns(self, event: Dict[str, Any], metadata: Dict[str, Any]):
        """Check for known attack patterns in event metadata"""
        # Check all string values in metadata
        for key, value in metadata.items():
            if isinstance(value, str):
                # SQL Injection
                for pattern in self.attack_patterns['sql_injection']:
                    if re.search(pattern, value, re.IGNORECASE):
                        await self.log_security_event(
                            SecurityEventType.SQL_INJECTION_ATTEMPT,
                            user_id=event['user_id'],
                            ip_address=event['ip_address'],
                            metadata={'original_event': event['type'].value, 'pattern': pattern, 'value': value}
                        )
                        break
                
                # XSS
                for pattern in self.attack_patterns['xss']:
                    if re.search(pattern, value, re.IGNORECASE):
                        await self.log_security_event(
                            SecurityEventType.XSS_ATTEMPT,
                            user_id=event['user_id'],
                            ip_address=event['ip_address'],
                            metadata={'original_event': event['type'].value, 'pattern': pattern, 'value': value}
                        )
                        break
                
                # Path Traversal
                for pattern in self.attack_patterns['path_traversal']:
                    if re.search(pattern, value, re.IGNORECASE):
                        await self.log_security_event(
                            SecurityEventType.UNAUTHORIZED_ACCESS,
                            user_id=event['user_id'],
                            ip_address=event['ip_address'],
                            metadata={'attack_type': 'path_traversal', 'pattern': pattern, 'value': value}
                        )
                        break
                
                # Command Injection
                for pattern in self.attack_patterns['command_injection']:
                    if re.search(pattern, value, re.IGNORECASE):
                        await self.log_security_event(
                            SecurityEventType.UNAUTHORIZED_ACCESS,
                            user_id=event['user_id'],
                            ip_address=event['ip_address'],
                            metadata={'attack_type': 'command_injection', 'pattern': pattern, 'value': value}
                        )
                        break
    
    async def _update_ip_reputation(self, ip_address: str, event_type: SecurityEventType):
        """Update IP reputation based on events"""
        # Initialize reputation if not exists
        if ip_address not in self.ip_reputation:
            self.ip_reputation[ip_address] = 100.0
        
        # Adjust reputation based on event type
        reputation_impact = {
            SecurityEventType.LOGIN_SUCCESS: 1,
            SecurityEventType.LOGIN_FAILED: -5,
            SecurityEventType.LOGIN_SUSPICIOUS: -10,
            SecurityEventType.RATE_LIMIT_EXCEEDED: -10,
            SecurityEventType.SUSPICIOUS_ACTIVITY: -20,
            SecurityEventType.SQL_INJECTION_ATTEMPT: -50,
            SecurityEventType.XSS_ATTEMPT: -40,
            SecurityEventType.BRUTE_FORCE_ATTEMPT: -50,
            SecurityEventType.DATA_BREACH_ATTEMPT: -100,
            SecurityEventType.DDOS_ATTEMPT: -100,
        }
        
        impact = reputation_impact.get(event_type, 0)
        self.ip_reputation[ip_address] = max(0, min(100, self.ip_reputation[ip_address] + impact))
        
        # Block IP if reputation too low
        if self.ip_reputation[ip_address] < 20:
            self.blocked_ips.add(ip_address)
            await self._create_alert(
                SecurityEventType.SUSPICIOUS_ACTIVITY,
                SeverityLevel.HIGH,
                f"IP Blocked: {ip_address}",
                f"IP {ip_address} has been blocked due to low reputation score: {self.ip_reputation[ip_address]}",
                source_ip=ip_address
            )
    
    async def _handle_high_severity_event(self, event: Dict[str, Any]):
        """Handle high severity security events"""
        # Create immediate alert
        await self._create_alert(
            event['type'],
            event['severity'],
            f"High Severity Event: {event['type'].value}",
            f"A {event['severity'].value} severity event has occurred",
            source_ip=event.get('ip_address'),
            user_id=event.get('user_id'),
            metadata=event.get('metadata', {})
        )
        
        # Take immediate action based on event type
        if event['type'] in [SecurityEventType.BRUTE_FORCE_ATTEMPT, SecurityEventType.DATA_BREACH_ATTEMPT]:
            # Block IP immediately
            if event.get('ip_address'):
                self.blocked_ips.add(event['ip_address'])
        
        if event['type'] == SecurityEventType.SESSION_HIJACK_ATTEMPT:
            # Invalidate user sessions
            if event.get('user_id'):
                await self._invalidate_user_sessions(event['user_id'])
    
    async def _process_event_buffer(self):
        """Process events in the buffer"""
        current_time = datetime.utcnow()
        events_to_process = []
        
        # Get events from buffer
        while self.event_buffer and len(events_to_process) < 100:
            events_to_process.append(self.event_buffer.popleft())
        
        # Process events
        for event in events_to_process:
            # Update counters
            self.metrics.total_events += 1
            event_type = event['type'].value
            self.metrics.events_by_type[event_type] = self.metrics.events_by_type.get(event_type, 0) + 1
            
            severity = event['severity'].value
            self.metrics.events_by_severity[severity] = self.metrics.events_by_severity.get(severity, 0) + 1
            
            # Update specific counters
            if event['type'] == SecurityEventType.LOGIN_FAILED:
                self.metrics.failed_login_attempts += 1
            elif event['type'] == SecurityEventType.LOGIN_SUCCESS:
                self.metrics.successful_logins += 1
            elif event['type'] == SecurityEventType.RATE_LIMIT_EXCEEDED:
                self.metrics.rate_limit_violations += 1
            elif event['type'] == SecurityEventType.SUSPICIOUS_ACTIVITY:
                self.metrics.suspicious_activities += 1
            
            # Track recent events
            if (current_time - event['timestamp']).total_seconds() < 3600:
                self.metrics.events_last_hour += 1
            if (current_time - event['timestamp']).total_seconds() < 86400:
                self.metrics.events_last_24h += 1
            
            # Update last critical event
            if event['severity'] == SeverityLevel.CRITICAL:
                self.metrics.last_critical_event = event['timestamp']
    
    async def _update_metrics(self):
        """Update security metrics"""
        # Update active sessions
        active_sessions_key = "active_sessions:*"
        active_sessions = await self.cache.redis.keys(active_sessions_key)
        self.metrics.active_sessions = len(active_sessions)
        
        # Update blocked IPs count
        self.metrics.blocked_ips = len(self.blocked_ips)
        
        # Calculate top threat sources
        ip_event_count = defaultdict(int)
        for event in list(self.event_buffer):
            if event.get('ip_address') and event['severity'].value in ['high', 'critical']:
                ip_event_count[event['ip_address']] += 1
        
        self.metrics.top_threat_sources = [
            {'ip': ip, 'count': count, 'reputation': self.ip_reputation.get(ip, 100)}
            for ip, count in sorted(ip_event_count.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
    
    async def _check_anomalies(self):
        """Check for anomalous patterns"""
        # Get recent events for analysis
        recent_events = []
        current_time = datetime.utcnow()
        
        for event in list(self.event_buffer):
            if (current_time - event['timestamp']).total_seconds() < 300:  # Last 5 minutes
                recent_events.append(event)
        
        # Check for rapid-fire events from same IP
        ip_event_count = defaultdict(list)
        for event in recent_events:
            if event.get('ip_address'):
                ip_event_count[event['ip_address']].append(event)
        
        for ip, events in ip_event_count.items():
            if len(events) > 20:  # More than 20 events in 5 minutes
                await self.log_security_event(
                    SecurityEventType.SUSPICIOUS_ACTIVITY,
                    ip_address=ip,
                    metadata={'reason': 'rapid_fire_events', 'count': len(events)}
                )
        
        # Check for distributed attacks (same pattern from multiple IPs)
        pattern_ips = defaultdict(set)
        for event in recent_events:
            if event.get('metadata', {}).get('pattern'):
                pattern = event['metadata']['pattern']
                if event.get('ip_address'):
                    pattern_ips[pattern].add(event['ip_address'])
        
        for pattern, ips in pattern_ips.items():
            if len(ips) > 5:  # Same pattern from more than 5 IPs
                await self.log_security_event(
                    SecurityEventType.DDOS_ATTEMPT,
                    metadata={'reason': 'distributed_pattern', 'pattern': pattern, 'ip_count': len(ips)}
                )
    
    async def _update_threat_level(self):
        """Update overall system threat level"""
        # Calculate threat score based on recent events
        threat_score = 0
        
        # Weight events by severity
        severity_weights = {
            SeverityLevel.INFO: 0,
            SeverityLevel.LOW: 1,
            SeverityLevel.MEDIUM: 5,
            SeverityLevel.HIGH: 20,
            SeverityLevel.CRITICAL: 50,
        }
        
        # Calculate score from last hour events
        current_time = datetime.utcnow()
        for event in list(self.event_buffer):
            if (current_time - event['timestamp']).total_seconds() < 3600:
                threat_score += severity_weights.get(event['severity'], 0)
        
        # Determine threat level
        if threat_score < 10:
            new_threat_level = ThreatLevel.NORMAL
        elif threat_score < 50:
            new_threat_level = ThreatLevel.ELEVATED
        elif threat_score < 100:
            new_threat_level = ThreatLevel.HIGH
        elif threat_score < 200:
            new_threat_level = ThreatLevel.SEVERE
        else:
            new_threat_level = ThreatLevel.CRITICAL
        
        # Update if changed
        if new_threat_level != self.metrics.current_threat_level:
            old_level = self.metrics.current_threat_level
            self.metrics.current_threat_level = new_threat_level
            
            # Alert on threat level change
            await self._create_alert(
                SecurityEventType.SUSPICIOUS_ACTIVITY,
                SeverityLevel.HIGH if new_threat_level.value in ['severe', 'critical'] else SeverityLevel.MEDIUM,
                f"Threat Level Changed: {old_level.value} � {new_threat_level.value}",
                f"System threat level has changed from {old_level.value} to {new_threat_level.value}. Score: {threat_score}",
                metadata={'old_level': old_level.value, 'new_level': new_threat_level.value, 'score': threat_score}
            )
    
    async def _check_alert_conditions(self):
        """Check if any alert conditions are met"""
        # Count recent events by type
        event_counts = defaultdict(int)
        current_time = datetime.utcnow()
        
        for event in list(self.event_buffer):
            if (current_time - event['timestamp']).total_seconds() < 300:  # Last 5 minutes
                event_counts[event['type']] += 1
        
        # Check thresholds
        for event_type, threshold in self.alert_thresholds.items():
            if event_counts.get(event_type, 0) >= threshold:
                await self._create_alert(
                    event_type,
                    self.severity_mapping.get(event_type, SeverityLevel.MEDIUM),
                    f"Threshold Exceeded: {event_type.value}",
                    f"{event_counts[event_type]} {event_type.value} events in the last 5 minutes (threshold: {threshold})",
                    metadata={'count': event_counts[event_type], 'threshold': threshold}
                )
    
    async def _create_alert(
        self,
        event_type: SecurityEventType,
        severity: SeverityLevel,
        title: str,
        description: str,
        source_ip: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create a security alert"""
        alert_id = f"alert_{datetime.utcnow().timestamp()}_{event_type.value}"
        
        # Check if similar alert already exists
        for existing_alert in self.active_alerts.values():
            if (existing_alert.type == event_type and 
                existing_alert.source_ip == source_ip and
                not existing_alert.resolved and
                (datetime.utcnow() - existing_alert.timestamp).total_seconds() < 300):
                return  # Skip duplicate alert
        
        alert = SecurityAlert(
            id=alert_id,
            type=event_type,
            severity=severity,
            title=title,
            description=description,
            source_ip=source_ip,
            user_id=user_id,
            metadata=metadata or {},
            timestamp=datetime.utcnow()
        )
        
        self.active_alerts[alert_id] = alert
        
        # Send notifications
        await self._send_alert_notifications(alert)
        
        # Log alert
        logger.warning(f"Security Alert: {title} - {description}")
    
    async def _send_alert_notifications(self, alert: SecurityAlert):
        """Send alert notifications"""
        try:
            # Get admin users
            async with get_db() as db:
                result = await db.execute(
                    select(User).where(User.is_admin == True)
                )
                admins = result.scalars().all()
            
            # Send email notifications
            for admin in admins:
                if admin.email not in alert.notified_users:
                    await email_service.send_security_alert_email(
                        email=admin.email,
                        alert_title=alert.title,
                        alert_description=alert.description,
                        severity=alert.severity.value,
                        timestamp=alert.timestamp.isoformat()
                    )
                    alert.notified_users.append(admin.email)
            
            # Send WebSocket notifications
            await websocket_manager.send_to_group(
                'security_admins',
                {
                    'type': 'security_alert',
                    'alert': {
                        'id': alert.id,
                        'type': alert.type.value,
                        'severity': alert.severity.value,
                        'title': alert.title,
                        'description': alert.description,
                        'timestamp': alert.timestamp.isoformat(),
                        'metadata': alert.metadata
                    }
                }
            )
            
            # Send to external monitoring if configured
            if settings.EXTERNAL_MONITORING_WEBHOOK:
                # Send to external service (implement webhook sending)
                pass
                
        except Exception as e:
            logger.error(f"Error sending alert notifications: {str(e)}")
    
    async def _cleanup_old_data(self):
        """Clean up old security data"""
        current_time = datetime.utcnow()
        
        # Clean up resolved alerts older than 24 hours
        alerts_to_remove = []
        for alert_id, alert in self.active_alerts.items():
            if alert.resolved and (current_time - alert.resolution_time).total_seconds() > 86400:
                alerts_to_remove.append(alert_id)
        
        for alert_id in alerts_to_remove:
            del self.active_alerts[alert_id]
        
        # Clean up old IP reputation data
        ips_to_clean = []
        for ip, reputation in self.ip_reputation.items():
            if reputation >= 90:  # Good reputation
                ips_to_clean.append(ip)
        
        for ip in ips_to_clean[:100]:  # Clean up to 100 IPs per cycle
            del self.ip_reputation[ip]
    
    async def _export_metrics(self):
        """Export metrics for Prometheus"""
        try:
            # Format metrics for Prometheus
            metrics_data = {
                'security_total_events': self.metrics.total_events,
                'security_events_last_hour': self.metrics.events_last_hour,
                'security_events_last_24h': self.metrics.events_last_24h,
                'security_failed_login_attempts': self.metrics.failed_login_attempts,
                'security_successful_logins': self.metrics.successful_logins,
                'security_active_sessions': self.metrics.active_sessions,
                'security_blocked_ips': self.metrics.blocked_ips,
                'security_rate_limit_violations': self.metrics.rate_limit_violations,
                'security_suspicious_activities': self.metrics.suspicious_activities,
                'security_active_alerts': len([a for a in self.active_alerts.values() if not a.resolved]),
                'security_threat_level': list(ThreatLevel).index(self.metrics.current_threat_level),
            }
            
            # Add event type metrics
            for event_type, count in self.metrics.events_by_type.items():
                metrics_data[f'security_events_{event_type}'] = count
            
            # Add severity metrics
            for severity, count in self.metrics.events_by_severity.items():
                metrics_data[f'security_severity_{severity}'] = count
            
            # Store in cache for Prometheus to scrape
            await self.cache.set('security_metrics', metrics_data, ttl=60)
            
        except Exception as e:
            logger.error(f"Error exporting metrics: {str(e)}")
    
    async def _broadcast_security_event(self, event: Dict[str, Any]):
        """Broadcast security event to admin WebSocket clients"""
        try:
            await websocket_manager.send_to_group(
                'security_admins',
                {
                    'type': 'security_event',
                    'event': {
                        'type': event['type'].value,
                        'severity': event['severity'].value,
                        'timestamp': event['timestamp'].isoformat(),
                        'user_id': event.get('user_id'),
                        'ip_address': event.get('ip_address'),
                        'metadata': event.get('metadata', {})
                    }
                }
            )
        except Exception as e:
            logger.error(f"Error broadcasting security event: {str(e)}")
    
    async def _invalidate_user_sessions(self, user_id: str):
        """Invalidate all sessions for a user"""
        try:
            # Get all user sessions
            session_pattern = f"session:*:user:{user_id}"
            sessions = await self.cache.redis.keys(session_pattern)
            
            # Delete all sessions
            for session in sessions:
                await self.cache.redis.delete(session)
            
            logger.info(f"Invalidated {len(sessions)} sessions for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating user sessions: {str(e)}")
    
    async def get_security_dashboard(self) -> Dict[str, Any]:
        """Get security dashboard data"""
        return {
            'metrics': {
                'total_events': self.metrics.total_events,
                'events_last_hour': self.metrics.events_last_hour,
                'events_last_24h': self.metrics.events_last_24h,
                'failed_login_attempts': self.metrics.failed_login_attempts,
                'successful_logins': self.metrics.successful_logins,
                'active_sessions': self.metrics.active_sessions,
                'blocked_ips': self.metrics.blocked_ips,
                'rate_limit_violations': self.metrics.rate_limit_violations,
                'suspicious_activities': self.metrics.suspicious_activities,
                'current_threat_level': self.metrics.current_threat_level.value,
                'last_critical_event': self.metrics.last_critical_event.isoformat() if self.metrics.last_critical_event else None,
            },
            'active_alerts': [
                {
                    'id': alert.id,
                    'type': alert.type.value,
                    'severity': alert.severity.value,
                    'title': alert.title,
                    'description': alert.description,
                    'timestamp': alert.timestamp.isoformat(),
                    'resolved': alert.resolved,
                }
                for alert in self.active_alerts.values()
                if not alert.resolved
            ],
            'recent_events': [
                {
                    'type': event['type'].value,
                    'severity': event['severity'].value,
                    'timestamp': event['timestamp'].isoformat(),
                    'ip_address': event.get('ip_address'),
                }
                for event in list(self.event_buffer)[-20:]  # Last 20 events
            ],
            'top_threat_sources': self.metrics.top_threat_sources,
            'events_by_type': self.metrics.events_by_type,
            'events_by_severity': self.metrics.events_by_severity,
        }
    
    async def resolve_alert(self, alert_id: str, resolved_by: str, resolution_notes: str = ""):
        """Resolve a security alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolution_time = datetime.utcnow()
            alert.metadata['resolved_by'] = resolved_by
            alert.metadata['resolution_notes'] = resolution_notes
            
            logger.info(f"Security alert {alert_id} resolved by {resolved_by}")
            
            # Notify about resolution
            await websocket_manager.send_to_group(
                'security_admins',
                {
                    'type': 'alert_resolved',
                    'alert_id': alert_id,
                    'resolved_by': resolved_by,
                    'resolution_time': alert.resolution_time.isoformat()
                }
            )
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if an IP address is blocked"""
        return ip_address in self.blocked_ips
    
    async def unblock_ip(self, ip_address: str, unblocked_by: str):
        """Unblock an IP address"""
        if ip_address in self.blocked_ips:
            self.blocked_ips.remove(ip_address)
            self.ip_reputation[ip_address] = 50  # Reset to neutral reputation
            
            await self.log_security_event(
                SecurityEventType.ACCOUNT_UNLOCKED,
                metadata={'ip_address': ip_address, 'unblocked_by': unblocked_by}
            )
            
            logger.info(f"IP {ip_address} unblocked by {unblocked_by}")
    
    async def get_ip_reputation(self, ip_address: str) -> float:
        """Get reputation score for an IP address"""
        return self.ip_reputation.get(ip_address, 100.0)
    
    async def get_user_security_events(
        self,
        user_id: str,
        limit: int = 100,
        db: AsyncSession = None
    ) -> List[Dict[str, Any]]:
        """Get security events for a specific user"""
        if not db:
            async with get_db() as db:
                result = await db.execute(
                    select(SecurityEvent)
                    .where(SecurityEvent.user_id == user_id)
                    .order_by(SecurityEvent.created_at.desc())
                    .limit(limit)
                )
                events = result.scalars().all()
        else:
            result = await db.execute(
                select(SecurityEvent)
                .where(SecurityEvent.user_id == user_id)
                .order_by(SecurityEvent.created_at.desc())
                .limit(limit)
            )
            events = result.scalars().all()
        
        return [
            {
                'id': event.id,
                'type': event.event_type,
                'severity': event.severity,
                'timestamp': event.created_at.isoformat(),
                'ip_address': event.ip_address,
                'user_agent': event.user_agent,
                'metadata': json.loads(event.metadata) if event.metadata else {}
            }
            for event in events
        ]


# Global instance
security_monitor = SecurityMonitor()


# Helper functions for easy access
async def track_security_event(
    event_type: SecurityEventType,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db: Optional[AsyncSession] = None
):
    """Track a security event"""
    await security_monitor.log_security_event(
        event_type=event_type,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata,
        db=db
    )


def is_ip_blocked(ip_address: str) -> bool:
    """Check if IP is blocked"""
    return security_monitor.is_ip_blocked(ip_address)


async def get_security_metrics() -> Dict[str, Any]:
    """Get current security metrics"""
    return await security_monitor.get_security_dashboard()