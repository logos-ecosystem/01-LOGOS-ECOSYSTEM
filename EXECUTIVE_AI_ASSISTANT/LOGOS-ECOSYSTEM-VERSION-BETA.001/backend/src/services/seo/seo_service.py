"""Enhanced SEO service combining all SEO functionality."""

from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import json
import hashlib
import re
from urllib.parse import urlparse, urljoin
import xml.etree.ElementTree as ET
from collections import defaultdict

from pydantic import BaseModel, HttpUrl
from fastapi import Request

from ...shared.utils.config import get_settings
from ...shared.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class MetaTag(BaseModel):
    """Model for meta tag data."""
    name: Optional[str] = None
    property: Optional[str] = None
    content: str
    httpEquiv: Optional[str] = None


class StructuredData(BaseModel):
    """Model for structured data."""
    context: str = "https://schema.org"
    type: str
    data: Dict[str, Any]


class HreflangTag(BaseModel):
    """Model for hreflang tag."""
    lang: str
    url: str


class RichSnippet(BaseModel):
    """Model for rich snippet data."""
    type: str  # e.g., "FAQ", "HowTo", "Recipe", "Article"
    data: Dict[str, Any]


class SEOAnalytics(BaseModel):
    """Model for SEO analytics data."""
    page_url: str
    title_length: int
    description_length: int
    keywords_count: int
    structured_data_types: List[str]
    open_graph_complete: bool
    twitter_card_complete: bool
    canonical_url: Optional[str]
    hreflang_count: int
    load_time_estimate: float


class EnhancedSEOManager:
    """Enhanced SEO manager with comprehensive optimization features."""
    
    def __init__(self):
        self.base_url = getattr(settings, 'FRONTEND_URL', 'https://logos-ecosystem.ai')
        self.site_name = "LOGOS AI Ecosystem"
        self.default_description = "AI-Native ecosystem platform with marketplace, advanced AI models, and secure wallet system"
        self.default_keywords = [
            "AI", "artificial intelligence", "marketplace", "AI models",
            "machine learning", "Claude", "AI ecosystem", "AI platform",
            "deep learning", "neural networks", "AI services", "AI tools"
        ]
        self.supported_languages = ["en", "es", "fr", "de", "ja", "zh", "ko", "pt"]
        self.default_language = "en"
        
        # Social media profiles
        self.social_profiles = {
            "twitter": "@logos_ai",
            "facebook": "https://facebook.com/logos.ai",
            "linkedin": "https://linkedin.com/company/logos-ai",
            "instagram": "@logos_ai_ecosystem",
            "youtube": "https://youtube.com/c/logos-ai",
            "github": "https://github.com/logos-ai"
        }
    
    def generate_comprehensive_meta_tags(
        self,
        title: str,
        description: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        image: Optional[str] = None,
        video: Optional[str] = None,
        url: Optional[str] = None,
        type: str = "website",
        author: Optional[str] = None,
        published_time: Optional[datetime] = None,
        modified_time: Optional[datetime] = None,
        section: Optional[str] = None,
        tags: Optional[List[str]] = None,
        locale: str = "en_US",
        alternate_locales: Optional[List[str]] = None,
        canonical_url: Optional[str] = None,
        robots: Optional[str] = None,
        twitter_creator: Optional[str] = None,
        article_data: Optional[Dict[str, Any]] = None,
        product_data: Optional[Dict[str, Any]] = None
    ) -> List[MetaTag]:
        """Generate comprehensive meta tags including Open Graph and Twitter Cards."""
        meta_tags = []
        
        # Basic meta tags
        meta_tags.extend([
            MetaTag(name="title", content=f"{title} | {self.site_name}"),
            MetaTag(name="description", content=description or self.default_description),
            MetaTag(name="keywords", content=", ".join(keywords or self.default_keywords)),
            MetaTag(name="author", content=author or self.site_name),
            MetaTag(name="viewport", content="width=device-width, initial-scale=1.0"),
            MetaTag(httpEquiv="Content-Type", content="text/html; charset=UTF-8"),
            MetaTag(name="robots", content=robots or "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"),
            MetaTag(name="googlebot", content="index, follow"),
            MetaTag(name="bingbot", content="index, follow"),
            MetaTag(name="generator", content="LOGOS AI Ecosystem Platform"),
            MetaTag(name="rating", content="general"),
            MetaTag(name="referrer", content="no-referrer-when-downgrade"),
        ])
        
        # Canonical URL
        if canonical_url:
            meta_tags.append(MetaTag(name="canonical", content=canonical_url))
        
        # Open Graph tags
        meta_tags.extend([
            MetaTag(property="og:title", content=title),
            MetaTag(property="og:description", content=description or self.default_description),
            MetaTag(property="og:type", content=type),
            MetaTag(property="og:url", content=url or self.base_url),
            MetaTag(property="og:site_name", content=self.site_name),
            MetaTag(property="og:locale", content=locale),
            MetaTag(property="og:determiner", content="the"),
        ])
        
        # Alternate locales for Open Graph
        if alternate_locales:
            for alt_locale in alternate_locales:
                meta_tags.append(MetaTag(property="og:locale:alternate", content=alt_locale))
        
        # Open Graph image tags
        if image:
            meta_tags.extend([
                MetaTag(property="og:image", content=image),
                MetaTag(property="og:image:secure_url", content=image),
                MetaTag(property="og:image:type", content="image/jpeg"),
                MetaTag(property="og:image:width", content="1200"),
                MetaTag(property="og:image:height", content="630"),
                MetaTag(property="og:image:alt", content=title),
            ])
        
        # Open Graph video tags
        if video:
            meta_tags.extend([
                MetaTag(property="og:video", content=video),
                MetaTag(property="og:video:secure_url", content=video),
                MetaTag(property="og:video:type", content="video/mp4"),
                MetaTag(property="og:video:width", content="1920"),
                MetaTag(property="og:video:height", content="1080"),
            ])
        
        # Twitter Card tags
        twitter_card_type = "summary_large_image" if image else "summary"
        meta_tags.extend([
            MetaTag(name="twitter:card", content=twitter_card_type),
            MetaTag(name="twitter:site", content=self.social_profiles["twitter"]),
            MetaTag(name="twitter:creator", content=twitter_creator or self.social_profiles["twitter"]),
            MetaTag(name="twitter:title", content=title),
            MetaTag(name="twitter:description", content=description or self.default_description),
            MetaTag(name="twitter:domain", content=urlparse(self.base_url).netloc),
        ])
        
        if image:
            meta_tags.extend([
                MetaTag(name="twitter:image", content=image),
                MetaTag(name="twitter:image:alt", content=title),
            ])
        
        # Article-specific tags
        if type == "article" and article_data:
            if published_time:
                meta_tags.append(MetaTag(property="article:published_time", content=published_time.isoformat()))
            if modified_time:
                meta_tags.append(MetaTag(property="article:modified_time", content=modified_time.isoformat()))
            if author:
                meta_tags.append(MetaTag(property="article:author", content=author))
            if section:
                meta_tags.append(MetaTag(property="article:section", content=section))
            if tags:
                for tag in tags:
                    meta_tags.append(MetaTag(property="article:tag", content=tag))
        
        # Product-specific tags
        if type == "product" and product_data:
            if product_data.get("price"):
                meta_tags.append(MetaTag(property="product:price:amount", content=str(product_data["price"])))
                meta_tags.append(MetaTag(property="product:price:currency", content=product_data.get("currency", "USD")))
            if product_data.get("availability"):
                meta_tags.append(MetaTag(property="product:availability", content=product_data["availability"]))
            if product_data.get("condition"):
                meta_tags.append(MetaTag(property="product:condition", content=product_data["condition"]))
        
        # Additional SEO tags
        meta_tags.extend([
            MetaTag(name="theme-color", content="#1a1a1a"),
            MetaTag(name="mobile-web-app-capable", content="yes"),
            MetaTag(name="apple-mobile-web-app-capable", content="yes"),
            MetaTag(name="apple-mobile-web-app-status-bar-style", content="black-translucent"),
            MetaTag(name="apple-mobile-web-app-title", content=self.site_name),
            MetaTag(name="application-name", content=self.site_name),
            MetaTag(name="msapplication-TileColor", content="#1a1a1a"),
            MetaTag(name="msapplication-config", content="/browserconfig.xml"),
        ])
        
        return meta_tags
    
    def generate_schema_org_data(
        self,
        page_type: str,
        data: Dict[str, Any]
    ) -> List[StructuredData]:
        """Generate comprehensive Schema.org structured data."""
        structured_data = []
        
        # Organization schema (included on all pages)
        structured_data.append(self._generate_organization_schema())
        
        # Website schema with search action
        structured_data.append(self._generate_website_schema())
        
        # Page-specific schemas
        if page_type == "marketplace_item":
            structured_data.append(self._generate_product_schema(data))
            if data.get("reviews"):
                structured_data.append(self._generate_review_schema(data))
        elif page_type == "user_profile":
            structured_data.append(self._generate_person_schema(data))
        elif page_type == "article":
            structured_data.append(self._generate_article_schema(data))
        elif page_type == "faq":
            structured_data.append(self._generate_faq_schema(data))
        elif page_type == "how_to":
            structured_data.append(self._generate_how_to_schema(data))
        elif page_type == "course":
            structured_data.append(self._generate_course_schema(data))
        elif page_type == "event":
            structured_data.append(self._generate_event_schema(data))
        elif page_type == "software_application":
            structured_data.append(self._generate_software_app_schema(data))
        
        # Breadcrumbs if provided
        if data.get("breadcrumbs"):
            structured_data.append(self._generate_breadcrumb_schema(data["breadcrumbs"]))
        
        return structured_data
    
    def _generate_organization_schema(self) -> StructuredData:
        """Generate comprehensive Organization schema."""
        return StructuredData(
            type="Organization",
            data={
                "name": self.site_name,
                "alternateName": "LOGOS AI",
                "url": self.base_url,
                "logo": {
                    "@type": "ImageObject",
                    "url": f"{self.base_url}/logo.png",
                    "width": 600,
                    "height": 600
                },
                "sameAs": [
                    self.social_profiles["facebook"],
                    self.social_profiles["linkedin"],
                    self.social_profiles["youtube"],
                    self.social_profiles["github"],
                    f"https://twitter.com/{self.social_profiles['twitter'][1:]}",
                    f"https://instagram.com/{self.social_profiles['instagram'][1:]}"
                ],
                "contactPoint": [{
                    "@type": "ContactPoint",
                    "contactType": "customer service",
                    "email": "support@logos-ecosystem.ai",
                    "availableLanguage": ["English", "Spanish", "French", "German", "Japanese", "Chinese", "Korean", "Portuguese"]
                }, {
                    "@type": "ContactPoint",
                    "contactType": "technical support",
                    "email": "tech@logos-ecosystem.ai",
                    "availableLanguage": "English"
                }],
                "address": {
                    "@type": "PostalAddress",
                    "addressCountry": "US"
                },
                "foundingDate": "2024",
                "founders": [{
                    "@type": "Person",
                    "name": "LOGOS AI Team"
                }],
                "areaServed": "Worldwide",
                "brand": {
                    "@type": "Brand",
                    "name": "LOGOS AI",
                    "logo": f"{self.base_url}/logo.png"
                }
            }
        )
    
    def _generate_website_schema(self) -> StructuredData:
        """Generate Website schema with search action."""
        return StructuredData(
            type="WebSite",
            data={
                "name": self.site_name,
                "alternateName": "LOGOS AI",
                "url": self.base_url,
                "potentialAction": [{
                    "@type": "SearchAction",
                    "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": f"{self.base_url}/search?q={{search_term_string}}"
                    },
                    "query-input": "required name=search_term_string"
                }],
                "inLanguage": ["en", "es", "fr", "de", "ja", "zh", "ko", "pt"]
            }
        )
    
    def _generate_product_schema(self, item: Dict[str, Any]) -> StructuredData:
        """Generate comprehensive Product schema."""
        product_data = {
            "name": item.get("title"),
            "description": item.get("description"),
            "image": item.get("images", [item.get("thumbnail_url")]),
            "brand": {
                "@type": "Brand",
                "name": item.get("brand", "LOGOS User")
            },
            "mpn": item.get("id"),
            "sku": item.get("sku", item.get("id")),
            "offers": {
                "@type": "Offer",
                "url": f"{self.base_url}/marketplace/item/{item.get('id')}",
                "priceCurrency": item.get("currency", "USD"),
                "price": str(item.get("price", 0)),
                "priceValidUntil": (datetime.now().replace(year=datetime.now().year + 1)).isoformat(),
                "availability": "https://schema.org/InStock" if item.get("status") == "active" else "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Person",
                    "name": item.get("owner_username")
                },
                "shippingDetails": {
                    "@type": "OfferShippingDetails",
                    "shippingRate": {
                        "@type": "MonetaryAmount",
                        "value": "0",
                        "currency": "USD"
                    },
                    "deliveryTime": {
                        "@type": "ShippingDeliveryTime",
                        "handlingTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 0,
                            "maxValue": 0,
                            "unitCode": "DAY"
                        },
                        "transitTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 0,
                            "maxValue": 0,
                            "unitCode": "DAY"
                        }
                    }
                }
            },
            "category": item.get("category"),
            "keywords": item.get("tags", [])
        }
        
        # Add aggregate rating if available
        if item.get("review_count", 0) > 0:
            product_data["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": str(item.get("rating", 0)),
                "bestRating": "5",
                "worstRating": "1",
                "ratingCount": str(item.get("review_count", 0))
            }
        
        return StructuredData(type="Product", data=product_data)
    
    def _generate_person_schema(self, user: Dict[str, Any]) -> StructuredData:
        """Generate Person schema for user profiles."""
        return StructuredData(
            type="Person",
            data={
                "name": user.get("full_name") or user.get("username"),
                "alternateName": user.get("username"),
                "description": user.get("bio"),
                "image": user.get("avatar_url"),
                "url": f"{self.base_url}/users/{user.get('username')}"
            }
        )
    
    def _generate_article_schema(self, article: Dict[str, Any]) -> StructuredData:
        """Generate Article schema."""
        return StructuredData(
            type="Article",
            data={
                "headline": article.get("title"),
                "description": article.get("description"),
                "image": article.get("featured_image"),
                "author": {
                    "@type": "Person",
                    "name": article.get("author_name"),
                    "url": f"{self.base_url}/users/{article.get('author_username')}"
                },
                "publisher": self._generate_organization_schema().data,
                "datePublished": article.get("published_date", datetime.now()).isoformat(),
                "dateModified": article.get("modified_date", datetime.now()).isoformat(),
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": f"{self.base_url}/articles/{article.get('id')}"
                },
                "wordCount": article.get("word_count", 0),
                "articleSection": article.get("section"),
                "keywords": article.get("tags", [])
            }
        )
    
    def _generate_faq_schema(self, data: Dict[str, Any]) -> StructuredData:
        """Generate FAQ schema for rich snippets."""
        faq_items = []
        for item in data.get("questions", []):
            faq_items.append({
                "@type": "Question",
                "name": item["question"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item["answer"]
                }
            })
        
        return StructuredData(
            type="FAQPage",
            data={"mainEntity": faq_items}
        )
    
    def _generate_how_to_schema(self, data: Dict[str, Any]) -> StructuredData:
        """Generate HowTo schema for rich snippets."""
        steps = []
        for i, step in enumerate(data.get("steps", []), 1):
            steps.append({
                "@type": "HowToStep",
                "name": step.get("name", f"Step {i}"),
                "text": step["text"],
                "image": step.get("image"),
                "url": f"{data.get('url')}#step{i}"
            })
        
        return StructuredData(
            type="HowTo",
            data={
                "name": data.get("title"),
                "description": data.get("description"),
                "image": data.get("image"),
                "totalTime": data.get("total_time"),
                "estimatedCost": data.get("estimated_cost"),
                "supply": data.get("supplies", []),
                "tool": data.get("tools", []),
                "step": steps
            }
        )
    
    def _generate_breadcrumb_schema(self, breadcrumbs: List[Dict[str, str]]) -> StructuredData:
        """Generate BreadcrumbList schema."""
        items = []
        for i, crumb in enumerate(breadcrumbs, 1):
            items.append({
                "@type": "ListItem",
                "position": i,
                "name": crumb["name"],
                "item": crumb["url"]
            })
        
        return StructuredData(
            type="BreadcrumbList",
            data={"itemListElement": items}
        )
    
    def _generate_course_schema(self, data: Dict[str, Any]) -> StructuredData:
        """Generate Course schema."""
        return StructuredData(
            type="Course",
            data={
                "name": data.get("title"),
                "description": data.get("description"),
                "provider": {
                    "@type": "Organization",
                    "name": self.site_name,
                    "sameAs": self.base_url
                },
                "educationalCredentialAwarded": data.get("credential"),
                "hasCourseInstance": {
                    "@type": "CourseInstance",
                    "courseMode": data.get("mode", "online"),
                    "duration": data.get("duration"),
                    "startDate": data.get("start_date"),
                    "endDate": data.get("end_date"),
                    "offers": {
                        "@type": "Offer",
                        "price": str(data.get("price", 0)),
                        "priceCurrency": data.get("currency", "USD"),
                        "availability": "https://schema.org/InStock"
                    }
                }
            }
        )
    
    def _generate_event_schema(self, data: Dict[str, Any]) -> StructuredData:
        """Generate Event schema."""
        return StructuredData(
            type="Event",
            data={
                "name": data.get("name"),
                "startDate": data.get("start_date"),
                "endDate": data.get("end_date"),
                "eventAttendanceMode": data.get("attendance_mode", "https://schema.org/OnlineEventAttendanceMode"),
                "eventStatus": "https://schema.org/EventScheduled",
                "location": data.get("location", {
                    "@type": "VirtualLocation",
                    "url": self.base_url
                }),
                "image": data.get("image"),
                "description": data.get("description"),
                "offers": {
                    "@type": "Offer",
                    "url": data.get("ticket_url"),
                    "price": str(data.get("price", 0)),
                    "priceCurrency": data.get("currency", "USD"),
                    "availability": "https://schema.org/InStock"
                },
                "performer": data.get("performers", []),
                "organizer": {
                    "@type": "Organization",
                    "name": self.site_name,
                    "url": self.base_url
                }
            }
        )
    
    def _generate_software_app_schema(self, data: Dict[str, Any]) -> StructuredData:
        """Generate SoftwareApplication schema."""
        return StructuredData(
            type="SoftwareApplication",
            data={
                "name": data.get("name"),
                "operatingSystem": data.get("os", "Web"),
                "applicationCategory": data.get("category", "BusinessApplication"),
                "offers": {
                    "@type": "Offer",
                    "price": str(data.get("price", 0)),
                    "priceCurrency": data.get("currency", "USD")
                },
                "aggregateRating": data.get("rating"),
                "screenshot": data.get("screenshots", []),
                "featureList": data.get("features", []),
                "softwareVersion": data.get("version"),
                "softwareRequirements": data.get("requirements"),
                "permissions": data.get("permissions", [])
            }
        )
    
    def _generate_review_schema(self, data: Dict[str, Any]) -> StructuredData:
        """Generate Review schema."""
        reviews = []
        for review in data.get("reviews", []):
            reviews.append({
                "@type": "Review",
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": str(review.get("rating")),
                    "bestRating": "5",
                    "worstRating": "1"
                },
                "author": {
                    "@type": "Person",
                    "name": review.get("author_name")
                },
                "datePublished": review.get("date", datetime.now()).isoformat(),
                "reviewBody": review.get("text")
            })
        
        return StructuredData(
            type="Review",
            data={"review": reviews}
        )
    
    def generate_hreflang_tags(
        self,
        current_url: str,
        current_lang: str = "en",
        alternate_urls: Optional[Dict[str, str]] = None
    ) -> List[HreflangTag]:
        """Generate hreflang tags for internationalization."""
        hreflang_tags = []
        
        # Add current language
        hreflang_tags.append(HreflangTag(lang=current_lang, url=current_url))
        
        # Add x-default (typically English)
        hreflang_tags.append(HreflangTag(lang="x-default", url=current_url.replace(f"/{current_lang}/", "/en/")))
        
        # Add alternate languages
        if alternate_urls:
            for lang, url in alternate_urls.items():
                hreflang_tags.append(HreflangTag(lang=lang, url=url))
        else:
            # Generate default alternate URLs based on pattern
            for lang in self.supported_languages:
                if lang != current_lang:
                    alt_url = current_url.replace(f"/{current_lang}/", f"/{lang}/")
                    hreflang_tags.append(HreflangTag(lang=lang, url=alt_url))
        
        return hreflang_tags
    
    def generate_dynamic_sitemap(
        self,
        urls: List[Dict[str, Any]],
        sitemap_type: str = "urlset"
    ) -> str:
        """Generate dynamic XML sitemap with advanced features."""
        namespaces = {
            "": "http://www.sitemaps.org/schemas/sitemap/0.9",
            "image": "http://www.google.com/schemas/sitemap-image/1.1",
            "video": "http://www.google.com/schemas/sitemap-video/1.1",
            "news": "http://www.google.com/schemas/sitemap-news/0.9",
            "xhtml": "http://www.w3.org/1999/xhtml"
        }
        
        if sitemap_type == "sitemapindex":
            root = ET.Element("sitemapindex", xmlns=namespaces[""])
            for url_data in urls:
                sitemap = ET.SubElement(root, "sitemap")
                ET.SubElement(sitemap, "loc").text = url_data["loc"]
                ET.SubElement(sitemap, "lastmod").text = url_data.get("lastmod", datetime.now().strftime("%Y-%m-%d"))
        else:
            root = ET.Element("urlset", xmlns=namespaces[""])
            for ns_prefix, ns_uri in namespaces.items():
                if ns_prefix:
                    root.set(f"xmlns:{ns_prefix}", ns_uri)
            
            for url_data in urls:
                url = ET.SubElement(root, "url")
                ET.SubElement(url, "loc").text = url_data["loc"]
                ET.SubElement(url, "lastmod").text = url_data.get("lastmod", datetime.now().strftime("%Y-%m-%d"))
                ET.SubElement(url, "changefreq").text = url_data.get("changefreq", "weekly")
                ET.SubElement(url, "priority").text = str(url_data.get("priority", 0.5))
                
                # Add image sitemap data
                if "images" in url_data:
                    for img in url_data["images"]:
                        image = ET.SubElement(url, "{http://www.google.com/schemas/sitemap-image/1.1}image")
                        ET.SubElement(image, "{http://www.google.com/schemas/sitemap-image/1.1}loc").text = img["loc"]
                        if "title" in img:
                            ET.SubElement(image, "{http://www.google.com/schemas/sitemap-image/1.1}title").text = img["title"]
                        if "caption" in img:
                            ET.SubElement(image, "{http://www.google.com/schemas/sitemap-image/1.1}caption").text = img["caption"]
                
                # Add video sitemap data
                if "videos" in url_data:
                    for vid in url_data["videos"]:
                        video = ET.SubElement(url, "{http://www.google.com/schemas/sitemap-video/1.1}video")
                        ET.SubElement(video, "{http://www.google.com/schemas/sitemap-video/1.1}thumbnail_loc").text = vid["thumbnail"]
                        ET.SubElement(video, "{http://www.google.com/schemas/sitemap-video/1.1}title").text = vid["title"]
                        ET.SubElement(video, "{http://www.google.com/schemas/sitemap-video/1.1}description").text = vid["description"]
                        ET.SubElement(video, "{http://www.google.com/schemas/sitemap-video/1.1}content_loc").text = vid["content_loc"]
                        if "duration" in vid:
                            ET.SubElement(video, "{http://www.google.com/schemas/sitemap-video/1.1}duration").text = str(vid["duration"])
                
                # Add hreflang links
                if "alternates" in url_data:
                    for alt in url_data["alternates"]:
                        link = ET.SubElement(url, "{http://www.w3.org/1999/xhtml}link")
                        link.set("rel", "alternate")
                        link.set("hreflang", alt["lang"])
                        link.set("href", alt["url"])
        
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='unicode', method='xml')
    
    def generate_robots_txt(
        self,
        additional_rules: Optional[Dict[str, List[str]]] = None
    ) -> str:
        """Generate comprehensive robots.txt with advanced directives."""
        robots_content = """# LOGOS AI Ecosystem Robots.txt
# Generated: {timestamp}

# Default crawler rules
User-agent: *
Allow: /
Crawl-delay: 1

# Search engine specific rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1

# API endpoints
Disallow: /api/
Disallow: /graphql/
Disallow: /.well-known/

# User private pages
Disallow: /dashboard/
Disallow: /settings/
Disallow: /wallet/
Disallow: /profile/edit/
Disallow: /messages/

# Authentication pages
Disallow: /auth/
Disallow: /login
Disallow: /register
Disallow: /logout
Disallow: /reset-password

# Temporary or development URLs
Disallow: /tmp/
Disallow: /temp/
Disallow: /dev/
Disallow: /test/
Disallow: /staging/

# File types
Disallow: /*.json$
Disallow: /*.xml$ 
Allow: /sitemap*.xml$
Allow: /opensearch.xml$

# Query parameters to ignore
Disallow: /*?sort=
Disallow: /*?filter=
Disallow: /*?page=
Disallow: /*?session=
Disallow: /*?token=
Disallow: /*?utm_

# Allow search engines to access public content
Allow: /marketplace/
Allow: /ai/
Allow: /blog/
Allow: /about/
Allow: /help/
Allow: /docs/
Allow: /pricing/

# Image and media files
Allow: /images/
Allow: /media/
Allow: /static/
User-agent: Googlebot-Image
Allow: /images/
Allow: /media/

# Specific bot rules
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

# Bad bots
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

{additional_rules}

# Sitemaps
Sitemap: {base_url}/sitemap.xml
Sitemap: {base_url}/sitemap-static.xml
Sitemap: {base_url}/sitemap-marketplace.xml
Sitemap: {base_url}/sitemap-users.xml
Sitemap: {base_url}/sitemap-ai-models.xml
Sitemap: {base_url}/sitemap-blog.xml
Sitemap: {base_url}/sitemap-images.xml
Sitemap: {base_url}/sitemap-videos.xml

# Host
Host: {base_url}
""".format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            base_url=self.base_url,
            additional_rules=self._format_additional_rules(additional_rules) if additional_rules else ""
        )
        
        return robots_content
    
    def _format_additional_rules(self, rules: Dict[str, List[str]]) -> str:
        """Format additional rules for robots.txt."""
        formatted = []
        for user_agent, directives in rules.items():
            formatted.append(f"\nUser-agent: {user_agent}")
            formatted.extend(directives)
        return "\n".join(formatted)
    
    def generate_canonical_url(
        self,
        request: Request,
        path: str,
        params_to_keep: Optional[List[str]] = None
    ) -> str:
        """Generate canonical URL with parameter handling."""
        base_canonical = urljoin(self.base_url, path)
        
        # Handle query parameters
        if params_to_keep and request.query_params:
            kept_params = []
            for param in params_to_keep:
                if param in request.query_params:
                    kept_params.append(f"{param}={request.query_params[param]}")
            
            if kept_params:
                base_canonical += "?" + "&".join(sorted(kept_params))
        
        return base_canonical
    
    def analyze_seo_performance(
        self,
        url: str,
        title: str,
        description: str,
        content: str,
        structured_data: List[StructuredData],
        meta_tags: List[MetaTag]
    ) -> SEOAnalytics:
        """Analyze SEO performance and provide recommendations."""
        # Calculate metrics
        title_length = len(title)
        description_length = len(description)
        keywords_count = len(re.findall(r'\b\w+\b', content))
        
        # Check Open Graph completeness
        og_required = {"og:title", "og:description", "og:image", "og:url"}
        og_present = {tag.property for tag in meta_tags if tag.property and tag.property.startswith("og:")}
        og_complete = og_required.issubset(og_present)
        
        # Check Twitter Card completeness
        twitter_required = {"twitter:card", "twitter:title", "twitter:description", "twitter:image"}
        twitter_present = {tag.name for tag in meta_tags if tag.name and tag.name.startswith("twitter:")}
        twitter_complete = twitter_required.issubset(twitter_present)
        
        # Get structured data types
        sd_types = [sd.type for sd in structured_data]
        
        # Find canonical URL
        canonical = next((tag.content for tag in meta_tags if tag.name == "canonical"), None)
        
        # Count hreflang tags
        hreflang_count = sum(1 for tag in meta_tags if tag.name == "alternate" and "hreflang" in str(tag))
        
        # Estimate load time (simplified)
        content_size = len(content.encode('utf-8'))
        load_time_estimate = content_size / (1024 * 1024) * 2  # Rough estimate: 2s per MB
        
        return SEOAnalytics(
            page_url=url,
            title_length=title_length,
            description_length=description_length,
            keywords_count=keywords_count,
            structured_data_types=sd_types,
            open_graph_complete=og_complete,
            twitter_card_complete=twitter_complete,
            canonical_url=canonical,
            hreflang_count=hreflang_count,
            load_time_estimate=load_time_estimate
        )
    
    def generate_rich_snippets(
        self,
        snippet_type: str,
        data: Dict[str, Any]
    ) -> RichSnippet:
        """Generate data for rich snippets."""
        if snippet_type == "FAQ":
            return RichSnippet(type="FAQ", data=self._generate_faq_schema(data).data)
        elif snippet_type == "HowTo":
            return RichSnippet(type="HowTo", data=self._generate_how_to_schema(data).data)
        elif snippet_type == "Recipe":
            return self._generate_recipe_snippet(data)
        elif snippet_type == "Review":
            return self._generate_review_snippet(data)
        elif snippet_type == "Event":
            return self._generate_event_snippet(data)
        elif snippet_type == "JobPosting":
            return self._generate_job_snippet(data)
        else:
            raise ValueError(f"Unsupported rich snippet type: {snippet_type}")
    
    def _generate_recipe_snippet(self, data: Dict[str, Any]) -> RichSnippet:
        """Generate Recipe rich snippet."""
        return RichSnippet(
            type="Recipe",
            data={
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": data.get("name"),
                "image": data.get("images", []),
                "author": {
                    "@type": "Person",
                    "name": data.get("author")
                },
                "datePublished": data.get("published_date", datetime.now()).isoformat(),
                "description": data.get("description"),
                "prepTime": data.get("prep_time"),
                "cookTime": data.get("cook_time"),
                "totalTime": data.get("total_time"),
                "keywords": data.get("keywords"),
                "recipeYield": data.get("yield"),
                "recipeCategory": data.get("category"),
                "recipeCuisine": data.get("cuisine"),
                "nutrition": data.get("nutrition"),
                "recipeIngredient": data.get("ingredients", []),
                "recipeInstructions": data.get("instructions", []),
                "aggregateRating": data.get("rating")
            }
        )
    
    def _generate_review_snippet(self, data: Dict[str, Any]) -> RichSnippet:
        """Generate Review rich snippet."""
        return RichSnippet(
            type="Review",
            data=self._generate_review_schema(data).data
        )
    
    def _generate_event_snippet(self, data: Dict[str, Any]) -> RichSnippet:
        """Generate Event rich snippet."""
        return RichSnippet(
            type="Event",
            data=self._generate_event_schema(data).data
        )
    
    def _generate_job_snippet(self, data: Dict[str, Any]) -> RichSnippet:
        """Generate JobPosting rich snippet."""
        return RichSnippet(
            type="JobPosting",
            data={
                "@context": "https://schema.org",
                "@type": "JobPosting",
                "title": data.get("title"),
                "description": data.get("description"),
                "datePosted": data.get("posted_date", datetime.now()).isoformat(),
                "validThrough": data.get("valid_through"),
                "employmentType": data.get("employment_type"),
                "hiringOrganization": {
                    "@type": "Organization",
                    "name": self.site_name,
                    "sameAs": self.base_url
                },
                "jobLocation": data.get("location"),
                "baseSalary": data.get("salary"),
                "identifier": {
                    "@type": "PropertyValue",
                    "name": self.site_name,
                    "value": data.get("id")
                }
            }
        )
    
    def generate_breadcrumbs(self, path: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate breadcrumb structured data."""
        items = []
        for i, crumb in enumerate(path, 1):
            items.append({
                "@type": "ListItem",
                "position": i,
                "name": crumb["name"],
                "item": crumb["url"]
            })
        
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": items
        }


# Global enhanced SEO manager instance
enhanced_seo_manager = EnhancedSEOManager()


def get_enhanced_page_metadata(
    page_type: str,
    data: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
) -> Dict[str, Any]:
    """Get comprehensive metadata for a page with all SEO enhancements."""
    data = data or {}
    
    # Define page-specific metadata with enhanced details
    page_configs = {
        "home": {
            "title": "AI-Native Ecosystem Platform",
            "description": "Discover, create, and trade AI models and services in our comprehensive AI ecosystem. Access cutting-edge AI technology powered by Claude and other leading models.",
            "keywords": ["AI platform", "AI marketplace", "machine learning", "AI ecosystem", "Claude AI", "AI models", "AI services", "deep learning"],
            "type": "website"
        },
        "marketplace": {
            "title": "AI Marketplace - Buy & Sell AI Models",
            "description": "Browse and purchase AI models, prompts, datasets, and services from our curated marketplace. Find the perfect AI solution for your needs.",
            "keywords": ["AI marketplace", "AI models", "machine learning models", "AI services", "buy AI models", "sell AI models", "AI prompts"],
            "type": "website"
        },
        "marketplace_item": {
            "title": data.get("title", "AI Product"),
            "description": data.get("description", "High-quality AI product available in our marketplace"),
            "keywords": data.get("tags", []) + ["AI product", "AI marketplace"],
            "type": "product"
        },
        "ai_chat": {
            "title": "AI Chat Assistant - Powered by Claude",
            "description": "Chat with advanced AI models powered by Claude and other leading AI technologies. Get intelligent responses for any query.",
            "keywords": ["AI chat", "Claude", "AI assistant", "conversational AI", "chatbot", "AI conversation", "Claude AI"],
            "type": "website"
        },
        "user_profile": {
            "title": f"{data.get('username', 'User')} - AI Creator Profile",
            "description": f"View {data.get('username', 'User')}'s profile, AI models, and contributions to the LOGOS AI ecosystem.",
            "keywords": ["AI creator", "user profile", "AI developer", data.get('username', '')],
            "type": "profile"
        },
        "blog": {
            "title": data.get("title", "AI Insights Blog"),
            "description": data.get("excerpt", "Latest insights, tutorials, and news about AI technology and the LOGOS ecosystem."),
            "keywords": data.get("tags", []) + ["AI blog", "AI insights", "AI tutorials"],
            "type": "article"
        }
    }
    
    config = page_configs.get(page_type, page_configs["home"])
    
    # Generate canonical URL
    canonical_url = None
    if request:
        canonical_url = enhanced_seo_manager.generate_canonical_url(
            request,
            request.url.path,
            params_to_keep=["category", "sort"] if page_type == "marketplace" else None
        )
    
    # Generate comprehensive meta tags
    meta_tags = enhanced_seo_manager.generate_comprehensive_meta_tags(
        title=config.get("title"),
        description=config.get("description"),
        keywords=config.get("keywords"),
        image=data.get("image"),
        url=data.get("url") or canonical_url,
        type=config.get("type", "website"),
        author=data.get("author"),
        published_time=data.get("published_time"),
        modified_time=data.get("modified_time"),
        section=data.get("section"),
        tags=data.get("tags"),
        locale=data.get("locale", "en_US"),
        alternate_locales=data.get("alternate_locales"),
        canonical_url=canonical_url,
        twitter_creator=data.get("twitter_creator"),
        article_data=data if page_type == "blog" else None,
        product_data=data if page_type == "marketplace_item" else None
    )
    
    # Generate structured data
    structured_data = enhanced_seo_manager.generate_schema_org_data(page_type, data)
    
    # Generate hreflang tags
    hreflang_tags = []
    if data.get("multilingual"):
        hreflang_tags = enhanced_seo_manager.generate_hreflang_tags(
            current_url=canonical_url or data.get("url", ""),
            current_lang=data.get("lang", "en"),
            alternate_urls=data.get("alternate_urls")
        )
    
    # Analyze SEO performance
    seo_analytics = None
    if data.get("analyze_seo"):
        seo_analytics = enhanced_seo_manager.analyze_seo_performance(
            url=canonical_url or data.get("url", ""),
            title=config.get("title"),
            description=config.get("description"),
            content=data.get("content", ""),
            structured_data=structured_data,
            meta_tags=meta_tags
        )
    
    return {
        "meta_tags": [tag.model_dump() for tag in meta_tags],
        "structured_data": [sd.model_dump() for sd in structured_data],
        "hreflang_tags": [ht.model_dump() for ht in hreflang_tags],
        "canonical_url": canonical_url,
        "seo_analytics": seo_analytics.model_dump() if seo_analytics else None,
        "page_config": config
    }


__all__ = [
    "enhanced_seo_manager",
    "get_enhanced_page_metadata",
    "MetaTag",
    "StructuredData",
    "HreflangTag",
    "RichSnippet",
    "SEOAnalytics"
]