"""SEO Analytics Service for tracking and reporting SEO performance."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio
import json
import hashlib
from urllib.parse import urlparse, parse_qs

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...infrastructure.cache.multi_level import multi_level_cache

logger = get_logger(__name__)
settings = get_settings()


class SEOAnalyticsService:
    """Service for tracking and analyzing SEO performance."""
    
    def __init__(self):
        self.google_analytics_id = getattr(settings, "GOOGLE_ANALYTICS_ID", None)
        self.google_search_console_key = getattr(settings, "GOOGLE_SEARCH_CONSOLE_KEY", None)
        self.base_url = getattr(settings, "FRONTEND_URL", "https://logos-ecosystem.ai")
        
    async def track_page_view(
        self,
        url: str,
        title: str,
        referrer: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Track a page view for SEO analytics."""
        # Generate page view ID
        view_id = hashlib.md5(f"{url}{datetime.utcnow().isoformat()}{session_id}".encode()).hexdigest()
        
        # Parse URL for analytics
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        
        # Determine traffic source
        traffic_source = self._determine_traffic_source(referrer, query_params)
        
        # Create analytics event
        event = {
            "view_id": view_id,
            "timestamp": datetime.utcnow().isoformat(),
            "url": url,
            "path": parsed_url.path,
            "title": title,
            "referrer": referrer,
            "traffic_source": traffic_source,
            "user_agent": user_agent,
            "ip_address": ip_address,
            "session_id": session_id,
            "user_id": user_id,
            "query_params": dict(query_params),
            "is_bot": self._is_bot(user_agent) if user_agent else False
        }
        
        # Store in cache for batch processing
        cache_key = f"seo:analytics:pageviews:{datetime.utcnow().strftime('%Y%m%d%H')}"
        await self._append_to_cache(cache_key, event)
        
        # Send to Google Analytics if configured
        if self.google_analytics_id and not event["is_bot"]:
            asyncio.create_task(self._send_to_google_analytics(event))
        
        return {"view_id": view_id, "tracked": True}
    
    async def track_search_query(
        self,
        query: str,
        results_count: int,
        clicked_result: Optional[str] = None,
        position: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Track internal search queries for SEO insights."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "query": query.lower().strip(),
            "results_count": results_count,
            "clicked_result": clicked_result,
            "position": position,
            "session_id": session_id,
            "has_results": results_count > 0,
            "clicked": clicked_result is not None
        }
        
        # Store for analysis
        cache_key = f"seo:analytics:searches:{datetime.utcnow().strftime('%Y%m%d')}"
        await self._append_to_cache(cache_key, event)
        
        return {"tracked": True}
    
    async def track_404_error(
        self,
        url: str,
        referrer: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Track 404 errors for SEO monitoring."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "url": url,
            "referrer": referrer,
            "user_agent": user_agent,
            "is_bot": self._is_bot(user_agent) if user_agent else False
        }
        
        cache_key = f"seo:analytics:404s:{datetime.utcnow().strftime('%Y%m%d')}"
        await self._append_to_cache(cache_key, event)
        
        return {"tracked": True}
    
    async def get_analytics_summary(
        self,
        start_date: datetime,
        end_date: datetime,
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get comprehensive SEO analytics summary."""
        if not metrics:
            metrics = ["pageviews", "unique_visitors", "bounce_rate", "avg_time_on_page", 
                      "traffic_sources", "top_pages", "top_keywords", "404_errors"]
        
        summary = {}
        
        if "pageviews" in metrics:
            summary["pageviews"] = await self._get_pageview_metrics(start_date, end_date)
        
        if "unique_visitors" in metrics:
            summary["unique_visitors"] = await self._get_unique_visitors(start_date, end_date)
        
        if "bounce_rate" in metrics:
            summary["bounce_rate"] = await self._get_bounce_rate(start_date, end_date)
        
        if "traffic_sources" in metrics:
            summary["traffic_sources"] = await self._get_traffic_sources(start_date, end_date)
        
        if "top_pages" in metrics:
            summary["top_pages"] = await self._get_top_pages(start_date, end_date)
        
        if "top_keywords" in metrics:
            summary["top_keywords"] = await self._get_top_keywords(start_date, end_date)
        
        if "404_errors" in metrics:
            summary["404_errors"] = await self._get_404_errors(start_date, end_date)
        
        return summary
    
    async def get_seo_performance_report(
        self,
        url: Optional[str] = None,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """Generate comprehensive SEO performance report."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        report = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": period_days
            },
            "metrics": await self.get_analytics_summary(start_date, end_date),
            "trends": await self._calculate_trends(start_date, end_date),
            "recommendations": []
        }
        
        # Add specific page report if URL provided
        if url:
            report["page_specific"] = await self._get_page_specific_metrics(url, start_date, end_date)
        
        # Generate recommendations based on data
        report["recommendations"] = self._generate_seo_recommendations(report)
        
        return report
    
    async def get_keyword_rankings(
        self,
        keywords: List[str],
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get keyword ranking data (mock implementation - would integrate with real ranking API)."""
        # This would typically integrate with Google Search Console API
        rankings = {}
        
        for keyword in keywords:
            # Mock ranking data
            rankings[keyword] = {
                "position": hash(keyword) % 50 + 1,  # Mock position
                "impressions": hash(keyword) % 10000,
                "clicks": hash(keyword) % 100,
                "ctr": round((hash(keyword) % 100) / 1000, 3),
                "trend": "up" if hash(keyword) % 2 == 0 else "down"
            }
        
        return {
            "keywords": rankings,
            "last_updated": datetime.utcnow().isoformat()
        }
    
    async def get_backlink_profile(self) -> Dict[str, Any]:
        """Get backlink profile data (mock implementation)."""
        # This would typically integrate with backlink APIs like Ahrefs or Moz
        return {
            "total_backlinks": 1542,
            "referring_domains": 234,
            "domain_rating": 65,
            "new_backlinks_30d": 89,
            "lost_backlinks_30d": 12,
            "top_referring_domains": [
                {"domain": "techcrunch.com", "backlinks": 15, "domain_rating": 92},
                {"domain": "reddit.com", "backlinks": 134, "domain_rating": 91},
                {"domain": "github.com", "backlinks": 45, "domain_rating": 93}
            ],
            "anchor_text_distribution": {
                "brand": 45,
                "exact_match": 15,
                "partial_match": 25,
                "generic": 15
            }
        }
    
    async def get_competitor_analysis(
        self,
        competitors: List[str]
    ) -> Dict[str, Any]:
        """Analyze competitor SEO performance (mock implementation)."""
        analysis = {}
        
        for competitor in competitors:
            # Mock competitor data
            analysis[competitor] = {
                "domain_rating": hash(competitor) % 30 + 50,
                "organic_traffic": hash(competitor) % 100000,
                "keywords_ranking": hash(competitor) % 5000,
                "top_keywords": [
                    f"ai {i}" for i in ["platform", "marketplace", "models"]
                ],
                "content_gap": [
                    "AI tutorials",
                    "Case studies",
                    "Technical documentation"
                ]
            }
        
        return {
            "competitors": analysis,
            "opportunities": self._identify_opportunities(analysis),
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def _determine_traffic_source(
        self,
        referrer: Optional[str],
        query_params: Dict[str, List[str]]
    ) -> Dict[str, str]:
        """Determine traffic source from referrer and UTM parameters."""
        source = {"type": "direct", "medium": "none", "source": "direct"}
        
        # Check UTM parameters first
        if "utm_source" in query_params:
            source["source"] = query_params["utm_source"][0]
            source["medium"] = query_params.get("utm_medium", ["unknown"])[0]
            source["type"] = "campaign"
            if "utm_campaign" in query_params:
                source["campaign"] = query_params["utm_campaign"][0]
            return source
        
        # Analyze referrer
        if referrer:
            parsed_ref = urlparse(referrer)
            domain = parsed_ref.netloc.lower()
            
            # Search engines
            search_engines = {
                "google": "organic",
                "bing": "organic",
                "yahoo": "organic",
                "duckduckgo": "organic",
                "baidu": "organic"
            }
            
            for engine, medium in search_engines.items():
                if engine in domain:
                    source["type"] = "search"
                    source["medium"] = medium
                    source["source"] = engine
                    return source
            
            # Social media
            social_sites = {
                "facebook": "social",
                "twitter": "social",
                "linkedin": "social",
                "reddit": "social",
                "youtube": "social"
            }
            
            for site, medium in social_sites.items():
                if site in domain:
                    source["type"] = "social"
                    source["medium"] = medium
                    source["source"] = site
                    return source
            
            # Other referral
            source["type"] = "referral"
            source["medium"] = "referral"
            source["source"] = domain
        
        return source
    
    def _is_bot(self, user_agent: str) -> bool:
        """Check if user agent is a bot."""
        if not user_agent:
            return False
        
        bot_patterns = [
            "bot", "crawler", "spider", "scraper", "googlebot", "bingbot",
            "slurp", "duckduckbot", "baiduspider", "yandexbot", "facebookexternalhit",
            "twitterbot", "linkedinbot", "whatsapp", "applebot", "semrush",
            "ahrefs", "moz", "rogerbot", "dotbot", "curl", "wget", "python",
            "java", "ruby", "go-http-client"
        ]
        
        ua_lower = user_agent.lower()
        return any(pattern in ua_lower for pattern in bot_patterns)
    
    async def _append_to_cache(self, key: str, data: Dict[str, Any]) -> None:
        """Append data to cache list."""
        existing = await multi_level_cache.get(key) or []
        existing.append(data)
        await multi_level_cache.set(key, existing, ttl=86400)  # 24 hours
    
    async def _send_to_google_analytics(self, event: Dict[str, Any]) -> None:
        """Send event to Google Analytics."""
        if not self.google_analytics_id:
            return
        
        # Google Analytics Measurement Protocol
        ga_url = "https://www.google-analytics.com/mp/collect"
        
        payload = {
            "client_id": event.get("session_id", "anonymous"),
            "events": [{
                "name": "page_view",
                "params": {
                    "page_location": event["url"],
                    "page_title": event["title"],
                    "page_referrer": event.get("referrer", ""),
                    "user_id": event.get("user_id"),
                    "engagement_time_msec": 100
                }
            }]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    ga_url,
                    params={"measurement_id": self.google_analytics_id},
                    json=payload
                )
        except Exception as e:
            logger.error(f"Failed to send to Google Analytics: {e}")
    
    async def _get_pageview_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get pageview metrics for date range."""
        total_views = 0
        daily_views = defaultdict(int)
        
        # Aggregate from cache
        current = start_date
        while current <= end_date:
            for hour in range(24):
                cache_key = f"seo:analytics:pageviews:{current.strftime('%Y%m%d')}{hour:02d}"
                data = await multi_level_cache.get(cache_key) or []
                
                for event in data:
                    if not event.get("is_bot", False):
                        total_views += 1
                        daily_views[current.strftime('%Y-%m-%d')] += 1
            
            current += timedelta(days=1)
        
        return {
            "total": total_views,
            "daily_average": total_views / max((end_date - start_date).days, 1),
            "by_day": dict(daily_views)
        }
    
    async def _get_unique_visitors(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get unique visitor metrics."""
        unique_sessions = set()
        unique_users = set()
        
        current = start_date
        while current <= end_date:
            for hour in range(24):
                cache_key = f"seo:analytics:pageviews:{current.strftime('%Y%m%d')}{hour:02d}"
                data = await multi_level_cache.get(cache_key) or []
                
                for event in data:
                    if not event.get("is_bot", False):
                        if event.get("session_id"):
                            unique_sessions.add(event["session_id"])
                        if event.get("user_id"):
                            unique_users.add(event["user_id"])
            
            current += timedelta(days=1)
        
        return {
            "unique_sessions": len(unique_sessions),
            "unique_users": len(unique_users),
            "new_vs_returning": {
                "new": len(unique_sessions) - len(unique_users),
                "returning": len(unique_users)
            }
        }
    
    async def _get_bounce_rate(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate bounce rate."""
        session_pageviews = defaultdict(int)
        
        current = start_date
        while current <= end_date:
            for hour in range(24):
                cache_key = f"seo:analytics:pageviews:{current.strftime('%Y%m%d')}{hour:02d}"
                data = await multi_level_cache.get(cache_key) or []
                
                for event in data:
                    if not event.get("is_bot", False) and event.get("session_id"):
                        session_pageviews[event["session_id"]] += 1
            
            current += timedelta(days=1)
        
        total_sessions = len(session_pageviews)
        single_page_sessions = sum(1 for count in session_pageviews.values() if count == 1)
        
        bounce_rate = (single_page_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        return {
            "rate": round(bounce_rate, 2),
            "total_sessions": total_sessions,
            "bounced_sessions": single_page_sessions
        }
    
    async def _get_traffic_sources(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get traffic source breakdown."""
        sources = defaultdict(lambda: {"count": 0, "percentage": 0})
        total = 0
        
        current = start_date
        while current <= end_date:
            for hour in range(24):
                cache_key = f"seo:analytics:pageviews:{current.strftime('%Y%m%d')}{hour:02d}"
                data = await multi_level_cache.get(cache_key) or []
                
                for event in data:
                    if not event.get("is_bot", False):
                        source = event.get("traffic_source", {})
                        source_type = source.get("type", "direct")
                        sources[source_type]["count"] += 1
                        total += 1
            
            current += timedelta(days=1)
        
        # Calculate percentages
        for source_type in sources:
            sources[source_type]["percentage"] = round(
                sources[source_type]["count"] / total * 100, 2
            ) if total > 0 else 0
        
        return dict(sources)
    
    async def _get_top_pages(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top pages by views."""
        page_views = defaultdict(int)
        
        current = start_date
        while current <= end_date:
            for hour in range(24):
                cache_key = f"seo:analytics:pageviews:{current.strftime('%Y%m%d')}{hour:02d}"
                data = await multi_level_cache.get(cache_key) or []
                
                for event in data:
                    if not event.get("is_bot", False):
                        page_views[event.get("path", "/")] += 1
            
            current += timedelta(days=1)
        
        # Sort and limit
        top_pages = sorted(
            [{"path": path, "views": views} for path, views in page_views.items()],
            key=lambda x: x["views"],
            reverse=True
        )[:limit]
        
        return top_pages
    
    async def _get_top_keywords(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top search keywords."""
        keyword_counts = defaultdict(int)
        
        current = start_date
        while current <= end_date:
            cache_key = f"seo:analytics:searches:{current.strftime('%Y%m%d')}"
            data = await multi_level_cache.get(cache_key) or []
            
            for event in data:
                keyword_counts[event.get("query", "")] += 1
            
            current += timedelta(days=1)
        
        # Sort and limit
        top_keywords = sorted(
            [{"keyword": kw, "searches": count} for kw, count in keyword_counts.items()],
            key=lambda x: x["searches"],
            reverse=True
        )[:limit]
        
        return top_keywords
    
    async def _get_404_errors(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get 404 error data."""
        errors_by_url = defaultdict(int)
        total_errors = 0
        
        current = start_date
        while current <= end_date:
            cache_key = f"seo:analytics:404s:{current.strftime('%Y%m%d')}"
            data = await multi_level_cache.get(cache_key) or []
            
            for event in data:
                errors_by_url[event.get("url", "")] += 1
                total_errors += 1
            
            current += timedelta(days=1)
        
        # Get top 404 URLs
        top_404s = sorted(
            [{"url": url, "count": count} for url, count in errors_by_url.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        return {
            "total": total_errors,
            "unique_urls": len(errors_by_url),
            "top_urls": top_404s
        }
    
    async def _calculate_trends(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate trends comparing to previous period."""
        period_days = (end_date - start_date).days
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days)
        
        # Get metrics for both periods
        current_metrics = await self.get_analytics_summary(start_date, end_date)
        previous_metrics = await self.get_analytics_summary(prev_start, prev_end)
        
        trends = {}
        
        # Calculate percentage changes
        if "pageviews" in current_metrics and "pageviews" in previous_metrics:
            current_total = current_metrics["pageviews"]["total"]
            previous_total = previous_metrics["pageviews"]["total"]
            
            if previous_total > 0:
                change = ((current_total - previous_total) / previous_total) * 100
                trends["pageviews"] = {
                    "change_percentage": round(change, 2),
                    "direction": "up" if change > 0 else "down"
                }
        
        return trends
    
    async def _get_page_specific_metrics(
        self,
        url: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get metrics for a specific page."""
        parsed = urlparse(url)
        path = parsed.path
        
        views = 0
        unique_visitors = set()
        
        current = start_date
        while current <= end_date:
            for hour in range(24):
                cache_key = f"seo:analytics:pageviews:{current.strftime('%Y%m%d')}{hour:02d}"
                data = await multi_level_cache.get(cache_key) or []
                
                for event in data:
                    if event.get("path") == path and not event.get("is_bot", False):
                        views += 1
                        if event.get("session_id"):
                            unique_visitors.add(event["session_id"])
            
            current += timedelta(days=1)
        
        return {
            "url": url,
            "path": path,
            "total_views": views,
            "unique_visitors": len(unique_visitors),
            "average_views_per_day": views / max((end_date - start_date).days, 1)
        }
    
    def _generate_seo_recommendations(
        self,
        report: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate SEO recommendations based on analytics data."""
        recommendations = []
        
        # Check bounce rate
        bounce_rate = report["metrics"].get("bounce_rate", {}).get("rate", 0)
        if bounce_rate > 70:
            recommendations.append({
                "priority": "high",
                "category": "user_experience",
                "issue": "High bounce rate detected",
                "recommendation": "Improve page load speed and content relevance to reduce bounce rate",
                "metric": f"{bounce_rate}% bounce rate"
            })
        
        # Check 404 errors
        errors_404 = report["metrics"].get("404_errors", {})
        if errors_404.get("total", 0) > 50:
            recommendations.append({
                "priority": "high",
                "category": "technical",
                "issue": "High number of 404 errors",
                "recommendation": "Fix broken links and implement proper redirects",
                "metric": f"{errors_404['total']} 404 errors"
            })
        
        # Check traffic diversity
        traffic_sources = report["metrics"].get("traffic_sources", {})
        direct_traffic = traffic_sources.get("direct", {}).get("percentage", 0)
        if direct_traffic > 60:
            recommendations.append({
                "priority": "medium",
                "category": "traffic",
                "issue": "Over-reliance on direct traffic",
                "recommendation": "Diversify traffic sources through SEO and content marketing",
                "metric": f"{direct_traffic}% direct traffic"
            })
        
        return recommendations
    
    def _identify_opportunities(
        self,
        competitor_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Identify SEO opportunities from competitor analysis."""
        opportunities = []
        
        # Find content gaps
        all_content_gaps = set()
        for competitor, data in competitor_data.items():
            all_content_gaps.update(data.get("content_gap", []))
        
        if all_content_gaps:
            opportunities.append({
                "type": "content",
                "opportunity": "Content gaps identified",
                "action": f"Create content for: {', '.join(list(all_content_gaps)[:3])}",
                "potential_impact": "high"
            })
        
        # Find keyword opportunities
        opportunities.append({
            "type": "keywords",
            "opportunity": "Target competitor keywords",
            "action": "Research and target high-value keywords from competitor analysis",
            "potential_impact": "medium"
        })
        
        return opportunities


# Global SEO analytics service instance
seo_analytics_service = SEOAnalyticsService()


__all__ = ["seo_analytics_service", "SEOAnalyticsService"]