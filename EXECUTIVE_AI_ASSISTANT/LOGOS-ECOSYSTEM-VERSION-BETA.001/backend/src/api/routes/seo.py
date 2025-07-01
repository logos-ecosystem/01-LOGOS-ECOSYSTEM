"""Enhanced SEO routes with comprehensive optimization features."""

from fastapi import APIRouter, Response, Depends, Query, Request
from typing import Dict, Any, Optional, List, Union
from sqlalchemy.orm import Session
from datetime import datetime
import xml.etree.ElementTree as ET

from ..deps import get_db
from ...services.seo import enhanced_seo_manager, get_enhanced_page_metadata
from ...shared.models.marketplace import MarketplaceItem
from ...shared.models.user import User
from ...shared.models.ai import AIModel
from ...shared.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/meta/{page}")
async def get_page_meta(
    page: str,
    request: Request,
    item_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    model_id: Optional[str] = Query(None),
    lang: str = Query("en", description="Language code"),
    analyze: bool = Query(False, description="Include SEO analysis"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get comprehensive SEO meta tags for a specific page."""
    data = {"lang": lang, "analyze_seo": analyze}
    
    # If it's a marketplace item page, fetch item data
    if page == "marketplace_item" and item_id:
        item = db.query(MarketplaceItem).filter(MarketplaceItem.id == item_id).first()
        if item:
            data.update({
                "title": item.title,
                "description": item.description,
                "image": item.thumbnail_url,
                "images": [item.thumbnail_url] + (item.images if hasattr(item, 'images') else []),
                "price": item.price,
                "currency": item.currency,
                "category": item.category,
                "tags": item.tags if hasattr(item, 'tags') else [],
                "owner_username": item.owner.username if item.owner else "Unknown",
                "rating": item.rating,
                "review_count": item.review_count,
                "status": item.status,
                "url": f"{enhanced_seo_manager.base_url}/marketplace/item/{item.id}",
                "published_time": item.created_at,
                "modified_time": item.updated_at
            })
    
    # If it's a user profile page
    elif page == "user_profile" and user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            data.update({
                "username": user.username,
                "full_name": user.full_name,
                "bio": user.bio if hasattr(user, 'bio') else None,
                "avatar_url": user.avatar_url if hasattr(user, 'avatar_url') else None,
                "url": f"{enhanced_seo_manager.base_url}/users/{user.username}"
            })
    
    # If it's an AI model page
    elif page == "ai_model" and model_id:
        model = db.query(AIModel).filter(AIModel.id == model_id).first()
        if model:
            data.update({
                "title": model.name,
                "description": model.description,
                "category": "AI Model",
                "tags": model.tags if hasattr(model, 'tags') else [],
                "url": f"{enhanced_seo_manager.base_url}/ai/models/{model.id}"
            })
    
    return get_enhanced_page_metadata(page, data, request)


@router.get("/sitemap.xml")
async def get_sitemap(db: Session = Depends(get_db)) -> Response:
    """Generate and return main XML sitemap index."""
    sitemaps = [
        {"loc": f"{enhanced_seo_manager.base_url}/sitemap-static.xml"},
        {"loc": f"{enhanced_seo_manager.base_url}/sitemap-marketplace.xml"},
        {"loc": f"{enhanced_seo_manager.base_url}/sitemap-users.xml"},
        {"loc": f"{enhanced_seo_manager.base_url}/sitemap-ai-models.xml"},
        {"loc": f"{enhanced_seo_manager.base_url}/sitemap-blog.xml"},
    ]
    
    sitemap_xml = enhanced_seo_manager.generate_dynamic_sitemap(sitemaps, sitemap_type="sitemapindex")
    
    return Response(
        content=sitemap_xml,
        media_type="application/xml",
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Robots-Tag": "noindex"
        }
    )


@router.get("/sitemap-static.xml")
async def get_static_sitemap() -> Response:
    """Generate static pages sitemap."""
    urls = [
        {"loc": enhanced_seo_manager.base_url, "priority": 1.0, "changefreq": "daily"},
        {"loc": f"{enhanced_seo_manager.base_url}/about", "priority": 0.8, "changefreq": "weekly"},
        {"loc": f"{enhanced_seo_manager.base_url}/marketplace", "priority": 0.9, "changefreq": "daily"},
        {"loc": f"{enhanced_seo_manager.base_url}/ai", "priority": 0.9, "changefreq": "daily"},
        {"loc": f"{enhanced_seo_manager.base_url}/pricing", "priority": 0.7, "changefreq": "weekly"},
        {"loc": f"{enhanced_seo_manager.base_url}/blog", "priority": 0.7, "changefreq": "daily"},
        {"loc": f"{enhanced_seo_manager.base_url}/help", "priority": 0.6, "changefreq": "weekly"},
        {"loc": f"{enhanced_seo_manager.base_url}/docs", "priority": 0.6, "changefreq": "weekly"},
        {"loc": f"{enhanced_seo_manager.base_url}/terms", "priority": 0.5, "changefreq": "monthly"},
        {"loc": f"{enhanced_seo_manager.base_url}/privacy", "priority": 0.5, "changefreq": "monthly"},
    ]
    
    # Add language variations
    enhanced_urls = []
    for url in urls:
        enhanced_urls.append(url)
        # Add hreflang alternates
        alternates = []
        for lang in enhanced_seo_manager.supported_languages:
            alternates.append({
                "lang": lang,
                "url": url["loc"].replace(enhanced_seo_manager.base_url, f"{enhanced_seo_manager.base_url}/{lang}")
            })
        url["alternates"] = alternates
    
    sitemap_xml = enhanced_seo_manager.generate_dynamic_sitemap(enhanced_urls)
    
    return Response(
        content=sitemap_xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.get("/sitemap-marketplace.xml")
async def get_marketplace_sitemap(
    db: Session = Depends(get_db),
    offset: int = Query(0),
    limit: int = Query(50000)
) -> Response:
    """Generate marketplace items sitemap."""
    items = db.query(MarketplaceItem).filter(
        MarketplaceItem.status == "active"
    ).offset(offset).limit(limit).all()
    
    urls = []
    for item in items:
        url_data = {
            "loc": f"{enhanced_seo_manager.base_url}/marketplace/item/{item.id}",
            "lastmod": item.updated_at.strftime("%Y-%m-%d") if item.updated_at else datetime.now().strftime("%Y-%m-%d"),
            "priority": 0.8,
            "changefreq": "weekly"
        }
        
        # Add images if available
        if item.thumbnail_url:
            url_data["images"] = [{
                "loc": item.thumbnail_url,
                "title": item.title,
                "caption": item.description[:100] if item.description else None
            }]
        
        urls.append(url_data)
    
    sitemap_xml = enhanced_seo_manager.generate_dynamic_sitemap(urls)
    
    return Response(
        content=sitemap_xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.get("/sitemap-users.xml")
async def get_users_sitemap(
    db: Session = Depends(get_db),
    offset: int = Query(0),
    limit: int = Query(50000)
) -> Response:
    """Generate user profiles sitemap."""
    users = db.query(User).filter(
        User.is_active == True
    ).offset(offset).limit(limit).all()
    
    urls = []
    for user in users:
        urls.append({
            "loc": f"{enhanced_seo_manager.base_url}/users/{user.username}",
            "lastmod": user.updated_at.strftime("%Y-%m-%d") if hasattr(user, 'updated_at') and user.updated_at else datetime.now().strftime("%Y-%m-%d"),
            "priority": 0.6,
            "changefreq": "monthly"
        })
    
    sitemap_xml = enhanced_seo_manager.generate_dynamic_sitemap(urls)
    
    return Response(
        content=sitemap_xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.get("/sitemap-ai-models.xml")
async def get_ai_models_sitemap(
    db: Session = Depends(get_db),
    offset: int = Query(0),
    limit: int = Query(50000)
) -> Response:
    """Generate AI models sitemap."""
    models = db.query(AIModel).filter(
        AIModel.is_active == True
    ).offset(offset).limit(limit).all()
    
    urls = []
    for model in models:
        urls.append({
            "loc": f"{enhanced_seo_manager.base_url}/ai/models/{model.id}",
            "lastmod": model.updated_at.strftime("%Y-%m-%d") if model.updated_at else datetime.now().strftime("%Y-%m-%d"),
            "priority": 0.7,
            "changefreq": "weekly"
        })
    
    sitemap_xml = enhanced_seo_manager.generate_dynamic_sitemap(urls)
    
    return Response(
        content=sitemap_xml,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.get("/robots.txt")
async def get_robots_txt() -> Response:
    """Generate and return robots.txt file."""
    robots_content = enhanced_seo_manager.generate_robots_txt()
    
    return Response(
        content=robots_content,
        media_type="text/plain",
        headers={
            "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
            "X-Content-Type-Options": "nosniff"
        }
    )


@router.get("/opensearch.xml")
async def get_opensearch_xml() -> Response:
    """Generate OpenSearch description document."""
    opensearch_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
    <ShortName>LOGOS AI</ShortName>
    <Description>Search the LOGOS AI Ecosystem - AI models, services, and marketplace</Description>
    <Tags>AI artificial intelligence marketplace models</Tags>
    <Contact>support@logos-ecosystem.ai</Contact>
    <Url type="text/html" template="{enhanced_seo_manager.base_url}/search?q={{searchTerms}}"/>
    <Url type="application/opensearchdescription+xml" rel="self" template="{enhanced_seo_manager.base_url}/opensearch.xml"/>
    <LongName>LOGOS AI Ecosystem Search</LongName>
    <Image height="64" width="64" type="image/png">{enhanced_seo_manager.base_url}/icon-64.png</Image>
    <Image height="16" width="16" type="image/x-icon">{enhanced_seo_manager.base_url}/favicon.ico</Image>
    <Query role="example" searchTerms="AI model"/>
    <Developer>LOGOS AI Team</Developer>
    <Attribution>Search data Copyright {datetime.now().year}, LOGOS AI Ecosystem, All Rights Reserved</Attribution>
    <SyndicationRight>open</SyndicationRight>
    <AdultContent>false</AdultContent>
    <Language>en-us</Language>
    <OutputEncoding>UTF-8</OutputEncoding>
    <InputEncoding>UTF-8</InputEncoding>
</OpenSearchDescription>"""
    
    return Response(
        content=opensearch_xml,
        media_type="application/opensearchdescription+xml",
        headers={"Cache-Control": "public, max-age=604800"}  # Cache for 7 days
    )


@router.post("/rich-snippets/{snippet_type}")
async def generate_rich_snippet(
    snippet_type: str,
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate rich snippet data for various content types."""
    try:
        rich_snippet = enhanced_seo_manager.generate_rich_snippets(snippet_type, data)
        return {"success": True, "snippet": rich_snippet.model_dump()}
    except ValueError as e:
        return {"success": False, "error": str(e)}


@router.get("/breadcrumbs")
async def generate_breadcrumbs(
    path: str = Query(..., description="Current page path"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generate breadcrumb navigation data."""
    # Parse the path and create breadcrumb trail
    path_parts = path.strip("/").split("/")
    breadcrumbs = [{"name": "Home", "url": enhanced_seo_manager.base_url}]
    
    current_path = ""
    for i, part in enumerate(path_parts):
        current_path += f"/{part}"
        
        # Determine the display name for this part
        display_name = part.replace("-", " ").title()
        
        # Special handling for known sections
        if part == "marketplace":
            display_name = "Marketplace"
        elif part == "ai":
            display_name = "AI Services"
        elif part == "users":
            display_name = "Users"
        elif part == "blog":
            display_name = "Blog"
        
        breadcrumbs.append({
            "name": display_name,
            "url": f"{enhanced_seo_manager.base_url}{current_path}"
        })
    
    # Generate structured data for breadcrumbs
    breadcrumb_schema = enhanced_seo_manager.generate_breadcrumbs(breadcrumbs)
    
    return {
        "breadcrumbs": breadcrumbs,
        "structured_data": breadcrumb_schema
    }


@router.get("/page-analysis")
async def analyze_page_seo(
    url: str = Query(..., description="Page URL to analyze"),
    title: str = Query(..., description="Page title"),
    description: str = Query(..., description="Page description"),
    content: str = Query("", description="Page content"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Analyze SEO performance of a page."""
    # Get current metadata
    meta_result = get_enhanced_page_metadata("custom", {
        "title": title,
        "description": description,
        "url": url,
        "content": content,
        "analyze_seo": True
    })
    
    # Extract analytics
    analytics = meta_result.get("seo_analytics")
    
    # Generate recommendations
    recommendations = []
    
    if analytics:
        # Title recommendations
        if analytics["title_length"] < 30:
            recommendations.append({
                "type": "warning",
                "category": "title",
                "message": "Title is too short. Aim for 30-60 characters."
            })
        elif analytics["title_length"] > 60:
            recommendations.append({
                "type": "warning",
                "category": "title",
                "message": "Title is too long. Keep it under 60 characters."
            })
        
        # Description recommendations
        if analytics["description_length"] < 120:
            recommendations.append({
                "type": "warning",
                "category": "description",
                "message": "Description is too short. Aim for 120-160 characters."
            })
        elif analytics["description_length"] > 160:
            recommendations.append({
                "type": "warning",
                "category": "description",
                "message": "Description is too long. Keep it under 160 characters."
            })
        
        # Open Graph recommendations
        if not analytics["open_graph_complete"]:
            recommendations.append({
                "type": "error",
                "category": "open_graph",
                "message": "Missing required Open Graph tags for optimal social sharing."
            })
        
        # Twitter Card recommendations
        if not analytics["twitter_card_complete"]:
            recommendations.append({
                "type": "error",
                "category": "twitter_card",
                "message": "Missing required Twitter Card tags for optimal Twitter sharing."
            })
        
        # Structured data recommendations
        if len(analytics["structured_data_types"]) < 2:
            recommendations.append({
                "type": "info",
                "category": "structured_data",
                "message": "Consider adding more structured data types for better search visibility."
            })
        
        # Performance recommendations
        if analytics["load_time_estimate"] > 3.0:
            recommendations.append({
                "type": "warning",
                "category": "performance",
                "message": f"Estimated load time ({analytics['load_time_estimate']:.1f}s) is high. Consider optimizing content size."
            })
    
    return {
        "analytics": analytics,
        "recommendations": recommendations,
        "score": calculate_seo_score(analytics) if analytics else 0
    }


def calculate_seo_score(analytics: Dict[str, Any]) -> int:
    """Calculate an SEO score based on various factors."""
    score = 100
    
    # Title length
    if analytics["title_length"] < 30 or analytics["title_length"] > 60:
        score -= 10
    
    # Description length
    if analytics["description_length"] < 120 or analytics["description_length"] > 160:
        score -= 10
    
    # Open Graph
    if not analytics["open_graph_complete"]:
        score -= 15
    
    # Twitter Card
    if not analytics["twitter_card_complete"]:
        score -= 15
    
    # Structured data
    if len(analytics["structured_data_types"]) < 2:
        score -= 10
    
    # Performance
    if analytics["load_time_estimate"] > 3.0:
        score -= 20
    elif analytics["load_time_estimate"] > 2.0:
        score -= 10
    
    # Canonical URL
    if not analytics["canonical_url"]:
        score -= 5
    
    # Internationalization
    if analytics["hreflang_count"] == 0:
        score -= 5
    
    return max(0, score)