"""Telemetry Collection and Processing for IoT Devices."""

import asyncio
import json
from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime, timedelta
from collections import deque, defaultdict
import statistics
import numpy as np
from dataclasses import dataclass, field

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...infrastructure.database.query_optimizer import get_db
from ...infrastructure.cache.multi_level import MultiLevelCache
from .models import IoTDevice, DeviceState, DeviceEvent

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class TelemetryMetric:
    """Single telemetry metric."""
    device_id: str
    metric_name: str
    value: float
    unit: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TelemetryAggregation:
    """Aggregated telemetry data."""
    device_id: str
    metric_name: str
    period: str  # 1min, 5min, 1hour, 1day
    start_time: datetime
    end_time: datetime
    count: int
    sum: float
    min: float
    max: float
    avg: float
    std_dev: Optional[float] = None
    percentiles: Dict[int, float] = field(default_factory=dict)


class TelemetryCollector:
    """Collects and processes IoT device telemetry."""
    
    def __init__(self, cache: Optional[MultiLevelCache] = None):
        """Initialize telemetry collector."""
        self.cache = cache or MultiLevelCache()
        
        # In-memory buffers
        self.metric_buffers: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.device_states: Dict[str, DeviceState] = {}
        
        # Processing configuration
        self.batch_size = 100
        self.flush_interval = 10.0  # seconds
        self.retention_periods = {
            'raw': timedelta(hours=24),
            '1min': timedelta(days=7),
            '5min': timedelta(days=30),
            '1hour': timedelta(days=90),
            '1day': timedelta(days=365)
        }
        
        # Metric processors
        self.metric_processors: Dict[str, List[Callable]] = defaultdict(list)
        self.anomaly_detectors: Dict[str, Callable] = {}
        
        # Background tasks
        self.flush_task = None
        self.aggregation_task = None
        self.cleanup_task = None
        
    async def start(self):
        """Start telemetry collection."""
        self.flush_task = asyncio.create_task(self._flush_loop())
        self.aggregation_task = asyncio.create_task(self._aggregation_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Telemetry collector started")
        
    async def stop(self):
        """Stop telemetry collection."""
        # Cancel background tasks
        for task in [self.flush_task, self.aggregation_task, self.cleanup_task]:
            if task:
                task.cancel()
                
        # Flush remaining data
        await self._flush_all()
        logger.info("Telemetry collector stopped")
        
    async def collect(self, device_id: str, metrics: Dict[str, Any],
                     timestamp: Optional[datetime] = None):
        """Collect telemetry metrics from device."""
        timestamp = timestamp or datetime.utcnow()
        
        # Process each metric
        for metric_name, value in metrics.items():
            # Create metric object
            metric = TelemetryMetric(
                device_id=device_id,
                metric_name=metric_name,
                value=self._parse_metric_value(value),
                unit=self._extract_unit(value),
                timestamp=timestamp,
                metadata=self._extract_metadata(value)
            )
            
            # Add to buffer
            buffer_key = f"{device_id}:{metric_name}"
            self.metric_buffers[buffer_key].append(metric)
            
            # Update device state
            await self._update_device_state(device_id, metric_name, metric.value)
            
            # Run processors
            await self._process_metric(metric)
            
            # Check for anomalies
            await self._detect_anomalies(metric)
            
        # Check if flush needed
        if len(self.metric_buffers[buffer_key]) >= self.batch_size:
            await self._flush_device_metrics(device_id)
            
    def _parse_metric_value(self, value: Any) -> float:
        """Parse metric value to float."""
        if isinstance(value, dict):
            return float(value.get('value', 0))
        elif isinstance(value, (int, float)):
            return float(value)
        else:
            try:
                return float(value)
            except (ValueError, TypeError):
                return 0.0
                
    def _extract_unit(self, value: Any) -> Optional[str]:
        """Extract unit from metric value."""
        if isinstance(value, dict):
            return value.get('unit')
        return None
        
    def _extract_metadata(self, value: Any) -> Dict[str, Any]:
        """Extract metadata from metric value."""
        if isinstance(value, dict):
            return {k: v for k, v in value.items() 
                   if k not in ['value', 'unit']}
        return {}
        
    async def _update_device_state(self, device_id: str, metric_name: str, value: float):
        """Update device state with latest metric."""
        if device_id not in self.device_states:
            self.device_states[device_id] = DeviceState(
                device_id=device_id,
                online=True
            )
            
        state = self.device_states[device_id]
        
        # Update common state fields
        if metric_name == 'temperature':
            state.temperature = value
        elif metric_name == 'humidity':
            state.humidity = value
        elif metric_name == 'battery_level':
            state.battery_level = int(value)
        elif metric_name == 'signal_strength':
            state.signal_strength = int(value)
        elif metric_name == 'power':
            state.power = bool(value)
        elif metric_name == 'brightness':
            state.brightness = int(value)
            
        # Update sensor data
        state.sensor_data[metric_name] = value
        state.last_updated = datetime.utcnow()
        
        # Cache device state
        await self.cache.set(
            f"device_state:{device_id}",
            state.dict(),
            ttl=300  # 5 minutes
        )
        
    async def _process_metric(self, metric: TelemetryMetric):
        """Process metric through registered processors."""
        processors = self.metric_processors.get(metric.metric_name, [])
        
        for processor in processors:
            try:
                await processor(metric)
            except Exception as e:
                logger.error(f"Metric processor error: {e}")
                
    async def _detect_anomalies(self, metric: TelemetryMetric):
        """Detect anomalies in metric."""
        detector_key = f"{metric.device_id}:{metric.metric_name}"
        
        if detector_key in self.anomaly_detectors:
            detector = self.anomaly_detectors[detector_key]
            
            try:
                is_anomaly = await detector(metric)
                
                if is_anomaly:
                    # Create anomaly event
                    event = DeviceEvent(
                        device_id=metric.device_id,
                        event_type='anomaly_detected',
                        data={
                            'metric': metric.metric_name,
                            'value': metric.value,
                            'threshold': detector.threshold if hasattr(detector, 'threshold') else None
                        },
                        severity='warning'
                    )
                    
                    # Store event
                    await self._store_event(event)
                    
            except Exception as e:
                logger.error(f"Anomaly detection error: {e}")
                
    async def _flush_loop(self):
        """Periodically flush metrics to storage."""
        try:
            while True:
                await asyncio.sleep(self.flush_interval)
                await self._flush_all()
        except asyncio.CancelledError:
            pass
            
    async def _flush_all(self):
        """Flush all buffered metrics."""
        for device_id in set(k.split(':')[0] for k in self.metric_buffers.keys()):
            await self._flush_device_metrics(device_id)
            
    async def _flush_device_metrics(self, device_id: str):
        """Flush metrics for specific device."""
        device_buffers = {k: v for k, v in self.metric_buffers.items()
                         if k.startswith(f"{device_id}:")}
        
        if not device_buffers:
            return
            
        # Batch metrics by timestamp
        batches = defaultdict(list)
        
        for buffer_key, metrics in device_buffers.items():
            while metrics:
                metric = metrics.popleft()
                batch_key = metric.timestamp.replace(second=0, microsecond=0)
                batches[batch_key].append(metric)
                
        # Store batches
        async with get_db() as db:
            for timestamp, metrics in batches.items():
                await self._store_metrics_batch(db, metrics)
                
    async def _store_metrics_batch(self, db, metrics: List[TelemetryMetric]):
        """Store batch of metrics to database."""
        # Convert to database format
        records = []
        
        for metric in metrics:
            records.append({
                'device_id': metric.device_id,
                'metric_name': metric.metric_name,
                'value': metric.value,
                'unit': metric.unit,
                'timestamp': metric.timestamp,
                'metadata': json.dumps(metric.metadata) if metric.metadata else None
            })
            
        # Bulk insert
        if records:
            await db.execute(
                """
                INSERT INTO device_telemetry 
                (device_id, metric_name, value, unit, timestamp, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                records
            )
            
    async def _aggregation_loop(self):
        """Periodically aggregate metrics."""
        try:
            while True:
                # Run aggregations at different intervals
                await asyncio.sleep(60)  # 1 minute
                await self._aggregate_metrics('1min', timedelta(minutes=1))
                
                if datetime.utcnow().minute % 5 == 0:
                    await self._aggregate_metrics('5min', timedelta(minutes=5))
                    
                if datetime.utcnow().minute == 0:
                    await self._aggregate_metrics('1hour', timedelta(hours=1))
                    
                if datetime.utcnow().hour == 0:
                    await self._aggregate_metrics('1day', timedelta(days=1))
                    
        except asyncio.CancelledError:
            pass
            
    async def _aggregate_metrics(self, period: str, interval: timedelta):
        """Aggregate metrics for specific period."""
        end_time = datetime.utcnow()
        start_time = end_time - interval
        
        async with get_db() as db:
            # Get metrics to aggregate
            metrics = await db.fetch(
                """
                SELECT device_id, metric_name, value
                FROM device_telemetry
                WHERE timestamp >= $1 AND timestamp < $2
                ORDER BY device_id, metric_name, timestamp
                """,
                start_time,
                end_time
            )
            
            # Group by device and metric
            grouped = defaultdict(list)
            for row in metrics:
                key = (row['device_id'], row['metric_name'])
                grouped[key].append(row['value'])
                
            # Calculate aggregations
            aggregations = []
            
            for (device_id, metric_name), values in grouped.items():
                if not values:
                    continue
                    
                agg = TelemetryAggregation(
                    device_id=device_id,
                    metric_name=metric_name,
                    period=period,
                    start_time=start_time,
                    end_time=end_time,
                    count=len(values),
                    sum=sum(values),
                    min=min(values),
                    max=max(values),
                    avg=statistics.mean(values)
                )
                
                # Calculate standard deviation
                if len(values) > 1:
                    agg.std_dev = statistics.stdev(values)
                    
                # Calculate percentiles
                if values:
                    sorted_values = sorted(values)
                    for p in [25, 50, 75, 90, 95, 99]:
                        idx = int(len(sorted_values) * p / 100)
                        agg.percentiles[p] = sorted_values[min(idx, len(sorted_values)-1)]
                        
                aggregations.append(agg)
                
            # Store aggregations
            await self._store_aggregations(db, aggregations)
            
    async def _store_aggregations(self, db, aggregations: List[TelemetryAggregation]):
        """Store aggregated metrics."""
        records = []
        
        for agg in aggregations:
            records.append({
                'device_id': agg.device_id,
                'metric_name': agg.metric_name,
                'period': agg.period,
                'start_time': agg.start_time,
                'end_time': agg.end_time,
                'count': agg.count,
                'sum': agg.sum,
                'min': agg.min,
                'max': agg.max,
                'avg': agg.avg,
                'std_dev': agg.std_dev,
                'percentiles': json.dumps(agg.percentiles) if agg.percentiles else None
            })
            
        if records:
            await db.execute(
                """
                INSERT INTO device_telemetry_aggregations
                (device_id, metric_name, period, start_time, end_time,
                 count, sum, min, max, avg, std_dev, percentiles)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (device_id, metric_name, period, start_time)
                DO UPDATE SET
                    count = EXCLUDED.count,
                    sum = EXCLUDED.sum,
                    min = EXCLUDED.min,
                    max = EXCLUDED.max,
                    avg = EXCLUDED.avg,
                    std_dev = EXCLUDED.std_dev,
                    percentiles = EXCLUDED.percentiles
                """,
                records
            )
            
    async def _cleanup_loop(self):
        """Periodically clean up old data."""
        try:
            while True:
                await asyncio.sleep(3600)  # 1 hour
                await self._cleanup_old_data()
        except asyncio.CancelledError:
            pass
            
    async def _cleanup_old_data(self):
        """Remove old telemetry data based on retention policies."""
        async with get_db() as db:
            # Clean raw data
            await db.execute(
                """
                DELETE FROM device_telemetry
                WHERE timestamp < $1
                """,
                datetime.utcnow() - self.retention_periods['raw']
            )
            
            # Clean aggregations
            for period, retention in self.retention_periods.items():
                if period != 'raw':
                    await db.execute(
                        """
                        DELETE FROM device_telemetry_aggregations
                        WHERE period = $1 AND end_time < $2
                        """,
                        period,
                        datetime.utcnow() - retention
                    )
                    
    async def _store_event(self, event: DeviceEvent):
        """Store device event."""
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO device_events
                (device_id, event_type, data, timestamp, severity)
                VALUES ($1, $2, $3, $4, $5)
                """,
                event.device_id,
                event.event_type,
                json.dumps(event.data),
                event.timestamp,
                event.severity
            )
            
    # Query methods
    
    async def get_latest_metrics(self, device_id: str,
                               metric_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """Get latest metrics for device."""
        # Check cache first
        cached_state = await self.cache.get(f"device_state:{device_id}")
        if cached_state:
            state = DeviceState(**cached_state)
            
            if metric_names:
                return {name: state.sensor_data.get(name) 
                       for name in metric_names 
                       if name in state.sensor_data}
            else:
                return state.sensor_data
                
        # Query database
        async with get_db() as db:
            query = """
                SELECT DISTINCT ON (metric_name) 
                    metric_name, value, unit, timestamp
                FROM device_telemetry
                WHERE device_id = $1
            """
            params = [device_id]
            
            if metric_names:
                query += " AND metric_name = ANY($2)"
                params.append(metric_names)
                
            query += " ORDER BY metric_name, timestamp DESC"
            
            rows = await db.fetch(query, *params)
            
            return {row['metric_name']: {
                'value': row['value'],
                'unit': row['unit'],
                'timestamp': row['timestamp']
            } for row in rows}
            
    async def get_metric_history(self, device_id: str, metric_name: str,
                               start_time: datetime, end_time: datetime,
                               resolution: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get metric history for device."""
        if resolution:
            # Get aggregated data
            return await self._get_aggregated_history(
                device_id, metric_name, start_time, end_time, resolution
            )
        else:
            # Get raw data
            return await self._get_raw_history(
                device_id, metric_name, start_time, end_time
            )
            
    async def _get_raw_history(self, device_id: str, metric_name: str,
                             start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Get raw metric history."""
        async with get_db() as db:
            rows = await db.fetch(
                """
                SELECT value, unit, timestamp, metadata
                FROM device_telemetry
                WHERE device_id = $1 
                    AND metric_name = $2
                    AND timestamp >= $3 
                    AND timestamp <= $4
                ORDER BY timestamp
                """,
                device_id, metric_name, start_time, end_time
            )
            
            return [{
                'value': row['value'],
                'unit': row['unit'],
                'timestamp': row['timestamp'],
                'metadata': json.loads(row['metadata']) if row['metadata'] else {}
            } for row in rows]
            
    async def _get_aggregated_history(self, device_id: str, metric_name: str,
                                    start_time: datetime, end_time: datetime,
                                    resolution: str) -> List[Dict[str, Any]]:
        """Get aggregated metric history."""
        async with get_db() as db:
            rows = await db.fetch(
                """
                SELECT start_time, end_time, count, min, max, avg, std_dev, percentiles
                FROM device_telemetry_aggregations
                WHERE device_id = $1 
                    AND metric_name = $2
                    AND period = $3
                    AND start_time >= $4 
                    AND end_time <= $5
                ORDER BY start_time
                """,
                device_id, metric_name, resolution, start_time, end_time
            )
            
            return [{
                'start_time': row['start_time'],
                'end_time': row['end_time'],
                'count': row['count'],
                'min': row['min'],
                'max': row['max'],
                'avg': row['avg'],
                'std_dev': row['std_dev'],
                'percentiles': json.loads(row['percentiles']) if row['percentiles'] else {}
            } for row in rows]
            
    # Metric processors
    
    def add_metric_processor(self, metric_name: str, processor: Callable):
        """Add processor for specific metric."""
        self.metric_processors[metric_name].append(processor)
        
    def remove_metric_processor(self, metric_name: str, processor: Callable):
        """Remove metric processor."""
        if metric_name in self.metric_processors:
            self.metric_processors[metric_name].remove(processor)
            
    def add_anomaly_detector(self, device_id: str, metric_name: str,
                           detector: Callable):
        """Add anomaly detector for device metric."""
        key = f"{device_id}:{metric_name}"
        self.anomaly_detectors[key] = detector
        
    def remove_anomaly_detector(self, device_id: str, metric_name: str):
        """Remove anomaly detector."""
        key = f"{device_id}:{metric_name}"
        if key in self.anomaly_detectors:
            del self.anomaly_detectors[key]
            
    # Built-in anomaly detectors
    
    def create_threshold_detector(self, min_value: Optional[float] = None,
                                max_value: Optional[float] = None) -> Callable:
        """Create simple threshold anomaly detector."""
        async def detector(metric: TelemetryMetric) -> bool:
            if min_value is not None and metric.value < min_value:
                return True
            if max_value is not None and metric.value > max_value:
                return True
            return False
            
        detector.threshold = {'min': min_value, 'max': max_value}
        return detector
        
    def create_zscore_detector(self, threshold: float = 3.0,
                             window_size: int = 100) -> Callable:
        """Create Z-score based anomaly detector."""
        values = deque(maxlen=window_size)
        
        async def detector(metric: TelemetryMetric) -> bool:
            values.append(metric.value)
            
            if len(values) < 10:  # Need minimum samples
                return False
                
            mean = statistics.mean(values)
            std = statistics.stdev(values) if len(values) > 1 else 0
            
            if std == 0:
                return False
                
            z_score = abs((metric.value - mean) / std)
            return z_score > threshold
            
        detector.threshold = threshold
        return detector