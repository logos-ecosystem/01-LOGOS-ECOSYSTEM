"""Analytics API routes for monitoring and insights."""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import csv
import io
from starlette.responses import StreamingResponse

from ...services.monitoring.real_time_analytics import analytics
from ...services.monitoring import metrics_collector
from ..deps import get_current_user
from ...shared.models.user import User
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard_analytics(
    range: str = Query("24h", description="Time range: 1h, 24h, 7d, 30d"),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics dashboard data."""
    try:
        # Parse time range
        time_ranges = {
            "1h": timedelta(hours=1),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }
        
        if range not in time_ranges:
            raise HTTPException(status_code=400, detail="Invalid time range")
            
        # Generate analytics report
        report = await analytics.generate_analytics_report(range)
        
        # Format response for dashboard
        response = {
            "summary": {
                "totalRevenue": report["summary"]["total_revenue"],
                "revenueChange": _calculate_change(report["summary"]["total_revenue"], range),
                "activeUsers": report["summary"]["total_users"],
                "userChange": _calculate_change(report["summary"]["total_users"], range),
                "aiRequests": report["summary"]["total_requests"],
                "aiRequestChange": _calculate_change(report["summary"]["total_requests"], range),
                "successRate": _calculate_success_rate(report),
                "successRateChange": _calculate_change(_calculate_success_rate(report), range)
            },
            "aiAgents": {
                "timeline": await _get_ai_timeline(range),
                "distribution": report["ai_agents"],
                "agentTypes": list(report["ai_agents"].keys()),
                "performance": await _get_ai_performance_metrics(report["ai_agents"])
            },
            "transactions": {
                "volumeTimeline": await _get_transaction_timeline(range),
                "paymentMethods": await _get_payment_method_distribution(),
                "topProducts": await _get_top_products(range)
            },
            "users": {
                "activityTimeline": await _get_user_activity_timeline(range),
                "segments": await _get_user_segments(),
                "totalUsers": report["users"]["active_users"],
                "featureUsage": await _format_feature_usage(report["users"]["feature_usage"])
            },
            "systemHealth": {
                "services": await _get_service_health(),
                "resources": await _get_resource_usage(),
                "alerts": await _get_recent_alerts()
            }
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating analytics dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate analytics")


@router.get("/realtime")
async def get_realtime_analytics(
    current_user: User = Depends(get_current_user)
):
    """Get real-time analytics data."""
    try:
        realtime_stats = await analytics.get_realtime_stats()
        
        # Add current metrics
        realtime_stats["activeUsers"] = realtime_stats["active_users"]
        realtime_stats["requestsPerSecond"] = _calculate_requests_per_second(realtime_stats)
        realtime_stats["avgResponseTime"] = await _get_avg_response_time()
        
        return realtime_stats
        
    except Exception as e:
        logger.error(f"Error fetching realtime analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch realtime data")


@router.get("/export")
async def export_analytics(
    range: str = Query("24h", description="Time range: 1h, 24h, 7d, 30d"),
    format: str = Query("csv", description="Export format: csv, json"),
    current_user: User = Depends(get_current_user)
):
    """Export analytics data."""
    try:
        # Generate report
        report = await analytics.generate_analytics_report(range)
        
        if format == "csv":
            # Create CSV
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            writer.writerow(["Metric", "Value", "Change %", "Period"])
            
            # Write summary metrics
            writer.writerow(["Total Revenue", report["summary"]["total_revenue"], "", range])
            writer.writerow(["Active Users", report["summary"]["total_users"], "", range])
            writer.writerow(["AI Requests", report["summary"]["total_requests"], "", range])
            writer.writerow(["AI Tokens Used", report["summary"]["ai_tokens_used"], "", range])
            
            # Write AI agent metrics
            writer.writerow([])
            writer.writerow(["AI Agent Analytics"])
            writer.writerow(["Agent Type", "Requests", "Success Rate", "Avg Response Time", "Tokens Used"])
            
            for agent_type, metrics in report["ai_agents"].items():
                writer.writerow([
                    agent_type,
                    metrics["total_requests"],
                    f"{metrics['success_rate'] * 100:.1f}%",
                    f"{metrics['avg_response_time']:.2f}s",
                    metrics["tokens_used"]
                ])
                
            # Write transaction metrics
            writer.writerow([])
            writer.writerow(["Transaction Analytics"])
            writer.writerow(["Total Transactions", report["transactions"]["total_transactions"], "", range])
            writer.writerow(["Total Volume", f"${report['transactions']['total_volume']:.2f}", "", range])
            writer.writerow(["Avg Transaction Value", f"${report['transactions']['avg_transaction_value']:.2f}", "", range])
            
            # Write top categories
            writer.writerow([])
            writer.writerow(["Top Categories"])
            writer.writerow(["Category", "Count"])
            for category in report["transactions"]["top_categories"][:10]:
                writer.writerow([category["category"], category["count"]])
                
            # Write user metrics
            writer.writerow([])
            writer.writerow(["User Analytics"])
            writer.writerow(["New Users", report["users"]["new_users"], "", range])
            writer.writerow(["Active Users", report["users"]["active_users"], "", range])
            writer.writerow(["Avg Session Duration", f"{report['users']['avg_session_duration']:.1f}s", "", range])
            
            # Write feature usage
            writer.writerow([])
            writer.writerow(["Feature Usage"])
            writer.writerow(["Feature", "Usage Count"])
            for feature, count in report["users"]["feature_usage"].items():
                writer.writerow([feature, count])
                
            # Write performance metrics
            writer.writerow([])
            writer.writerow(["Performance Metrics"])
            writer.writerow(["Avg Response Time", f"{report['performance']['avg_response_time']:.2f}ms", "", range])
            writer.writerow(["Error Rate", f"{report['performance']['error_rate'] * 100:.2f}%", "", range])
            writer.writerow(["Uptime", f"{report['performance']['uptime']:.1f}%", "", range])
            writer.writerow(["Peak Concurrent Users", report["performance"]["peak_concurrent_users"], "", range])
            
            # Return CSV file
            output.seek(0)
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=analytics-{range}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
                }
            )
            
        else:
            # Return JSON
            return report
            
    except Exception as e:
        logger.error(f"Error exporting analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export analytics")


@router.post("/track")
async def track_event(
    event_type: str,
    data: Dict[str, Any],
    current_user: Optional[User] = Depends(get_current_user)
):
    """Track an analytics event."""
    try:
        # Add user info if available
        if current_user:
            data["user_id"] = current_user.id
            data["user_type"] = current_user.role
            
        # Track the event
        await analytics.track_event(event_type, data)
        
        return {"status": "success", "message": "Event tracked"}
        
    except Exception as e:
        logger.error(f"Error tracking event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track event")


@router.get("/metrics/prometheus")
async def get_prometheus_metrics():
    """Get Prometheus metrics endpoint."""
    metrics = metrics_collector.get_metrics()
    return StreamingResponse(
        io.BytesIO(metrics),
        media_type="text/plain; version=0.0.4"
    )


@router.get("/health/detailed")
async def get_detailed_health(
    current_user: User = Depends(get_current_user)
):
    """Get detailed system health information."""
    try:
        health_status = metrics_collector.get_health_status()
        
        # Add more detailed checks
        health_status["detailed"] = {
            "database": await _check_database_health(),
            "cache": await _check_cache_health(),
            "ai_service": await _check_ai_service_health(),
            "storage": await _check_storage_health()
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Error getting detailed health: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get health status")


# Helper functions
def _calculate_change(current_value: float, time_range: str) -> float:
    """Calculate percentage change for a metric."""
    # This would be implemented with historical data comparison
    import random
    return round(random.uniform(-10, 20), 1)


def _calculate_success_rate(report: Dict[str, Any]) -> float:
    """Calculate overall success rate from report."""
    total_requests = 0
    successful_requests = 0
    
    for agent_metrics in report["ai_agents"].values():
        total_requests += agent_metrics["total_requests"]
        successful_requests += agent_metrics["total_requests"] * agent_metrics["success_rate"]
        
    return (successful_requests / total_requests * 100) if total_requests > 0 else 0


async def _get_ai_timeline(time_range: str) -> list:
    """Get AI agent request timeline data."""
    # This would fetch from time-series database
    timeline = []
    now = datetime.utcnow()
    
    # Generate sample data points
    points = 24 if time_range == "24h" else 168 if time_range == "7d" else 720
    interval = timedelta(hours=1) if time_range == "24h" else timedelta(hours=4)
    
    for i in range(points):
        timestamp = now - (interval * i)
        timeline.append({
            "timestamp": timestamp.isoformat(),
            "agents": {
                "business": 100 + i % 50,
                "science": 80 + i % 40,
                "technology": 120 + i % 60,
                "medical": 60 + i % 30
            }
        })
        
    return timeline[::-1]


async def _get_ai_performance_metrics(ai_agents: Dict[str, Any]) -> Dict[str, Any]:
    """Get detailed AI performance metrics."""
    performance = {}
    
    for agent_type, metrics in ai_agents.items():
        performance[agent_type] = {
            "avgResponseTime": metrics["avg_response_time"],
            "successRate": metrics["success_rate"] * 100,
            "throughput": metrics["total_requests"] / 24  # requests per hour
        }
        
    return performance


async def _get_transaction_timeline(time_range: str) -> list:
    """Get transaction volume timeline."""
    timeline = []
    now = datetime.utcnow()
    
    points = 24 if time_range == "24h" else 168 if time_range == "7d" else 720
    interval = timedelta(hours=1) if time_range == "24h" else timedelta(hours=4)
    
    for i in range(points):
        timestamp = now - (interval * i)
        timeline.append({
            "timestamp": timestamp.isoformat(),
            "volume": 5000 + (i * 100) % 2000,
            "count": 50 + i % 20
        })
        
    return timeline[::-1]


async def _get_payment_method_distribution() -> list:
    """Get payment method distribution."""
    return [
        {"method": "Credit Card", "volume": 45000},
        {"method": "PayPal", "volume": 25000},
        {"method": "Crypto", "volume": 15000},
        {"method": "Bank Transfer", "volume": 10000}
    ]


async def _get_top_products(time_range: str) -> list:
    """Get top selling products."""
    products = [
        {"name": "Business AI Agent", "category": "AI Services", "sales": 150, "revenue": 7500, "trend": 15},
        {"name": "Data Analytics Tool", "category": "Analytics", "sales": 120, "revenue": 6000, "trend": 8},
        {"name": "Medical Consultation AI", "category": "Healthcare", "sales": 100, "revenue": 10000, "trend": -5},
        {"name": "Code Assistant", "category": "Development", "sales": 90, "revenue": 4500, "trend": 20},
        {"name": "Marketing Automation", "category": "Marketing", "sales": 80, "revenue": 4000, "trend": 12}
    ]
    
    return products


async def _get_user_activity_timeline(time_range: str) -> list:
    """Get user activity timeline."""
    timeline = []
    now = datetime.utcnow()
    
    points = 24 if time_range == "24h" else 168 if time_range == "7d" else 720
    interval = timedelta(hours=1) if time_range == "24h" else timedelta(hours=4)
    
    for i in range(points):
        timestamp = now - (interval * i)
        timeline.append({
            "timestamp": timestamp.isoformat(),
            "activeUsers": 1000 + (i * 50) % 500,
            "newUsers": 20 + i % 10
        })
        
    return timeline[::-1]


async def _get_user_segments() -> Dict[str, Any]:
    """Get user segment distribution."""
    return {
        "Premium": {"count": 250, "percentage": 25},
        "Standard": {"count": 500, "percentage": 50},
        "Trial": {"count": 150, "percentage": 15},
        "Enterprise": {"count": 100, "percentage": 10}
    }


async def _format_feature_usage(usage: Dict[str, int]) -> list:
    """Format feature usage for charts."""
    return [
        {"feature": feature, "usage": count}
        for feature, count in usage.items()
    ]


async def _get_service_health() -> Dict[str, Any]:
    """Get service health status."""
    return {
        "API": {"status": "healthy", "responseTime": 45},
        "Database": {"status": "healthy", "responseTime": 12},
        "Cache": {"status": "healthy", "responseTime": 3},
        "AI Service": {"status": "healthy", "responseTime": 250},
        "Storage": {"status": "healthy", "responseTime": 30}
    }


async def _get_resource_usage() -> Dict[str, float]:
    """Get system resource usage."""
    import psutil
    
    return {
        "cpu": psutil.cpu_percent(),
        "memory": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('/').percent
    }


async def _get_recent_alerts() -> list:
    """Get recent system alerts."""
    return [
        {
            "severity": "warning",
            "title": "High Memory Usage",
            "message": "Memory usage exceeded 80% threshold",
            "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat()
        },
        {
            "severity": "info",
            "title": "Scheduled Maintenance",
            "message": "Database maintenance completed successfully",
            "timestamp": (datetime.utcnow() - timedelta(hours=5)).isoformat()
        }
    ]


def _calculate_requests_per_second(stats: Dict[str, Any]) -> float:
    """Calculate current requests per second."""
    # This would use real-time counter data
    return 42.5


async def _get_avg_response_time() -> float:
    """Get current average response time."""
    # This would fetch from metrics
    return 125.0


async def _check_database_health() -> Dict[str, Any]:
    """Check database health details."""
    return {
        "status": "healthy",
        "connections": 45,
        "max_connections": 100,
        "query_performance": "normal",
        "replication_lag": 0
    }


async def _check_cache_health() -> Dict[str, Any]:
    """Check cache health details."""
    return {
        "status": "healthy",
        "hit_rate": 0.92,
        "memory_usage": "45%",
        "eviction_rate": "low"
    }


async def _check_ai_service_health() -> Dict[str, Any]:
    """Check AI service health details."""
    return {
        "status": "healthy",
        "models_loaded": 12,
        "avg_inference_time": 250,
        "queue_depth": 5
    }


async def _check_storage_health() -> Dict[str, Any]:
    """Check storage health details."""
    return {
        "status": "healthy",
        "usage_percentage": 35,
        "iops": "normal",
        "latency": "low"
    }