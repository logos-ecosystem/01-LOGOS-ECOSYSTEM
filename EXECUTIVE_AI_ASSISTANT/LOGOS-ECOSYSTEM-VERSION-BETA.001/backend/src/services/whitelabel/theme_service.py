"""Dynamic Theming Service for Whitelabel Platform."""

import json
import os
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from pathlib import Path
import cssutils
import sass
from PIL import Image, ImageDraw, ImageFont
import io
import base64

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...infrastructure.cache import cache_manager
from ...shared.models.user import WhitelabelTenant, ThemeConfiguration

logger = get_logger(__name__)
settings = get_settings()
cache = cache_manager


class ColorUtils:
    """Utility functions for color manipulation."""
    
    @staticmethod
    def hex_to_rgb(hex_color: str) -> tuple:
        """Convert hex color to RGB."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    @staticmethod
    def rgb_to_hex(r: int, g: int, b: int) -> str:
        """Convert RGB to hex color."""
        return f"#{r:02x}{g:02x}{b:02x}"
    
    @staticmethod
    def darken(hex_color: str, percentage: float) -> str:
        """Darken a color by percentage."""
        r, g, b = ColorUtils.hex_to_rgb(hex_color)
        factor = 1 - (percentage / 100)
        r = int(r * factor)
        g = int(g * factor)
        b = int(b * factor)
        return ColorUtils.rgb_to_hex(r, g, b)
    
    @staticmethod
    def lighten(hex_color: str, percentage: float) -> str:
        """Lighten a color by percentage."""
        r, g, b = ColorUtils.hex_to_rgb(hex_color)
        factor = percentage / 100
        r = int(r + (255 - r) * factor)
        g = int(g + (255 - g) * factor)
        b = int(b + (255 - b) * factor)
        return ColorUtils.rgb_to_hex(r, g, b)
    
    @staticmethod
    def get_contrast_color(hex_color: str) -> str:
        """Get contrasting color (black or white) for text."""
        r, g, b = ColorUtils.hex_to_rgb(hex_color)
        # Calculate luminance
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return "#000000" if luminance > 0.5 else "#ffffff"


class ThemeService:
    """Service for managing dynamic themes."""
    
    def __init__(self):
        self.themes_dir = Path(settings.STATIC_DIR) / "themes"
        self.themes_dir.mkdir(parents=True, exist_ok=True)
        self.assets_dir = Path(settings.STATIC_DIR) / "whitelabel_assets"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.fonts_dir = self.assets_dir / "fonts"
        self.fonts_dir.mkdir(parents=True, exist_ok=True)
        
    async def create_theme(
        self,
        tenant_id: str,
        theme_config: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Create a new theme for a tenant."""
        try:
            # Validate theme configuration
            validated_config = self._validate_theme_config(theme_config)
            
            # Generate CSS
            css_content = await self._generate_css(validated_config)
            
            # Generate theme hash
            theme_hash = hashlib.md5(
                json.dumps(validated_config, sort_keys=True).encode()
            ).hexdigest()[:8]
            
            # Save CSS file
            css_filename = f"theme_{tenant_id}_{theme_hash}.css"
            css_path = self.themes_dir / css_filename
            
            with open(css_path, 'w') as f:
                f.write(css_content)
            
            # Generate favicon if needed
            favicon_path = None
            if validated_config.get('generate_favicon'):
                favicon_path = await self._generate_favicon(
                    tenant_id,
                    validated_config['colors']['primary']
                )
            
            # Save theme configuration to database
            theme_record = ThemeConfiguration(
                tenant_id=tenant_id,
                config=validated_config,
                css_path=str(css_path),
                favicon_path=favicon_path,
                theme_hash=theme_hash,
                created_at=datetime.utcnow()
            )
            
            db.add(theme_record)
            await db.commit()
            
            # Cache theme
            await cache.set(
                f"theme:{tenant_id}",
                json.dumps({
                    'config': validated_config,
                    'css_url': f"/static/themes/{css_filename}",
                    'favicon_url': favicon_path,
                    'theme_hash': theme_hash
                }),
                ttl=86400  # 24 hours
            )
            
            return {
                'theme_id': theme_record.id,
                'css_url': f"/static/themes/{css_filename}",
                'favicon_url': favicon_path,
                'theme_hash': theme_hash,
                'config': validated_config
            }
            
        except Exception as e:
            logger.error(f"Theme creation error: {e}")
            raise ValueError(f"Failed to create theme: {str(e)}")
    
    def _validate_theme_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize theme configuration."""
        default_config = {
            'colors': {
                'primary': '#3498db',
                'secondary': '#2ecc71',
                'accent': '#e74c3c',
                'background': '#ffffff',
                'surface': '#f8f9fa',
                'text': '#2c3e50',
                'text_secondary': '#7f8c8d',
                'success': '#27ae60',
                'warning': '#f39c12',
                'error': '#e74c3c',
                'info': '#3498db'
            },
            'typography': {
                'font_family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                'font_family_heading': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                'font_size_base': '16px',
                'font_weight_normal': '400',
                'font_weight_medium': '500',
                'font_weight_bold': '700',
                'line_height_base': '1.5',
                'letter_spacing': 'normal'
            },
            'spacing': {
                'unit': '8px',
                'xs': '4px',
                'sm': '8px',
                'md': '16px',
                'lg': '24px',
                'xl': '32px',
                'xxl': '48px'
            },
            'borders': {
                'radius_sm': '4px',
                'radius_md': '8px',
                'radius_lg': '12px',
                'radius_full': '9999px',
                'width': '1px',
                'color': '#e0e0e0'
            },
            'shadows': {
                'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
                'md': '0 4px 6px rgba(0, 0, 0, 0.1)',
                'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
                'xl': '0 20px 25px rgba(0, 0, 0, 0.1)'
            },
            'components': {
                'button': {
                    'padding': '12px 24px',
                    'font_weight': '500',
                    'transition': 'all 0.2s ease'
                },
                'input': {
                    'padding': '10px 16px',
                    'background': '#ffffff',
                    'border': '1px solid #e0e0e0'
                },
                'card': {
                    'padding': '24px',
                    'background': '#ffffff',
                    'border_radius': '8px',
                    'shadow': '0 4px 6px rgba(0, 0, 0, 0.1)'
                }
            },
            'animations': {
                'duration_fast': '150ms',
                'duration_normal': '300ms',
                'duration_slow': '500ms',
                'easing': 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            'generate_favicon': True,
            'custom_css': ''
        }
        
        # Merge with defaults
        validated = {**default_config, **config}
        
        # Validate colors
        for color_key, color_value in validated['colors'].items():
            if not color_value.startswith('#') or len(color_value) != 7:
                raise ValueError(f"Invalid color format for {color_key}: {color_value}")
        
        return validated
    
    async def _generate_css(self, config: Dict[str, Any]) -> str:
        """Generate CSS from theme configuration."""
        # Create SCSS template
        scss_template = f"""
// Color Variables
$primary: {config['colors']['primary']};
$secondary: {config['colors']['secondary']};
$accent: {config['colors']['accent']};
$background: {config['colors']['background']};
$surface: {config['colors']['surface']};
$text: {config['colors']['text']};
$text-secondary: {config['colors']['text_secondary']};
$success: {config['colors']['success']};
$warning: {config['colors']['warning']};
$error: {config['colors']['error']};
$info: {config['colors']['info']};

// Typography
$font-family: {config['typography']['font_family']};
$font-family-heading: {config['typography']['font_family_heading']};
$font-size-base: {config['typography']['font_size_base']};
$font-weight-normal: {config['typography']['font_weight_normal']};
$font-weight-medium: {config['typography']['font_weight_medium']};
$font-weight-bold: {config['typography']['font_weight_bold']};
$line-height-base: {config['typography']['line_height_base']};
$letter-spacing: {config['typography']['letter_spacing']};

// Spacing
$spacing-unit: {config['spacing']['unit']};
$spacing-xs: {config['spacing']['xs']};
$spacing-sm: {config['spacing']['sm']};
$spacing-md: {config['spacing']['md']};
$spacing-lg: {config['spacing']['lg']};
$spacing-xl: {config['spacing']['xl']};
$spacing-xxl: {config['spacing']['xxl']};

// Borders
$border-radius-sm: {config['borders']['radius_sm']};
$border-radius-md: {config['borders']['radius_md']};
$border-radius-lg: {config['borders']['radius_lg']};
$border-radius-full: {config['borders']['radius_full']};
$border-width: {config['borders']['width']};
$border-color: {config['borders']['color']};

// Root styles
:root {{
    // Color CSS Variables
    --color-primary: #{{$primary}};
    --color-secondary: #{{$secondary}};
    --color-accent: #{{$accent}};
    --color-background: #{{$background}};
    --color-surface: #{{$surface}};
    --color-text: #{{$text}};
    --color-text-secondary: #{{$text-secondary}};
    --color-success: #{{$success}};
    --color-warning: #{{$warning}};
    --color-error: #{{$error}};
    --color-info: #{{$info}};
    
    // Color variants
    --color-primary-dark: {ColorUtils.darken(config['colors']['primary'], 20)};
    --color-primary-light: {ColorUtils.lighten(config['colors']['primary'], 20)};
    --color-primary-contrast: {ColorUtils.get_contrast_color(config['colors']['primary'])};
    
    // Typography
    --font-family: #{{$font-family}};
    --font-family-heading: #{{$font-family-heading}};
    --font-size-base: #{{$font-size-base}};
    --font-weight-normal: #{{$font-weight-normal}};
    --font-weight-medium: #{{$font-weight-medium}};
    --font-weight-bold: #{{$font-weight-bold}};
    --line-height-base: #{{$line-height-base}};
    --letter-spacing: #{{$letter-spacing}};
    
    // Spacing
    --spacing-unit: #{{$spacing-unit}};
    --spacing-xs: #{{$spacing-xs}};
    --spacing-sm: #{{$spacing-sm}};
    --spacing-md: #{{$spacing-md}};
    --spacing-lg: #{{$spacing-lg}};
    --spacing-xl: #{{$spacing-xl}};
    --spacing-xxl: #{{$spacing-xxl}};
    
    // Borders
    --border-radius-sm: #{{$border-radius-sm}};
    --border-radius-md: #{{$border-radius-md}};
    --border-radius-lg: #{{$border-radius-lg}};
    --border-radius-full: #{{$border-radius-full}};
    --border-width: #{{$border-width}};
    --border-color: #{{$border-color}};
    
    // Shadows
    --shadow-sm: {config['shadows']['sm']};
    --shadow-md: {config['shadows']['md']};
    --shadow-lg: {config['shadows']['lg']};
    --shadow-xl: {config['shadows']['xl']};
    
    // Animations
    --duration-fast: {config['animations']['duration_fast']};
    --duration-normal: {config['animations']['duration_normal']};
    --duration-slow: {config['animations']['duration_slow']};
    --easing: {config['animations']['easing']};
}}

// Base styles
body {{
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-base);
    letter-spacing: var(--letter-spacing);
    color: var(--color-text);
    background-color: var(--color-background);
}}

// Headings
h1, h2, h3, h4, h5, h6 {{
    font-family: var(--font-family-heading);
    font-weight: var(--font-weight-bold);
    line-height: 1.2;
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--color-text);
}}

// Buttons
.btn {{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: {config['components']['button']['padding']};
    font-weight: {config['components']['button']['font_weight']};
    font-size: var(--font-size-base);
    line-height: 1;
    text-decoration: none;
    border: none;
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: {config['components']['button']['transition']};
    
    &-primary {{
        background-color: var(--color-primary);
        color: var(--color-primary-contrast);
        
        &:hover {{
            background-color: var(--color-primary-dark);
        }}
    }}
    
    &-secondary {{
        background-color: var(--color-secondary);
        color: {ColorUtils.get_contrast_color(config['colors']['secondary'])};
    }}
    
    &-outline {{
        background-color: transparent;
        border: 2px solid var(--color-primary);
        color: var(--color-primary);
        
        &:hover {{
            background-color: var(--color-primary);
            color: var(--color-primary-contrast);
        }}
    }}
}}

// Forms
.form-control {{
    display: block;
    width: 100%;
    padding: {config['components']['input']['padding']};
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-base);
    color: var(--color-text);
    background-color: {config['components']['input']['background']};
    border: {config['components']['input']['border']};
    border-radius: var(--border-radius-md);
    transition: border-color var(--duration-fast) var(--easing);
    
    &:focus {{
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba($primary, 0.1);
    }}
}}

// Cards
.card {{
    padding: {config['components']['card']['padding']};
    background-color: {config['components']['card']['background']};
    border-radius: {config['components']['card']['border_radius']};
    box-shadow: {config['components']['card']['shadow']};
    
    &-header {{
        margin-bottom: var(--spacing-md);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid var(--border-color);
    }}
    
    &-title {{
        font-size: 1.25rem;
        font-weight: var(--font-weight-bold);
        margin: 0;
    }}
}}

// Navigation
.navbar {{
    background-color: var(--color-surface);
    box-shadow: var(--shadow-sm);
    padding: var(--spacing-md) 0;
    
    &-brand {{
        font-size: 1.25rem;
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
        text-decoration: none;
    }}
    
    &-nav {{
        display: flex;
        gap: var(--spacing-lg);
        
        a {{
            color: var(--color-text);
            text-decoration: none;
            font-weight: var(--font-weight-medium);
            transition: color var(--duration-fast) var(--easing);
            
            &:hover {{
                color: var(--color-primary);
            }}
            
            &.active {{
                color: var(--color-primary);
            }}
        }}
    }}
}}

// Utilities
.text-primary {{ color: var(--color-primary); }}
.text-secondary {{ color: var(--color-secondary); }}
.text-success {{ color: var(--color-success); }}
.text-warning {{ color: var(--color-warning); }}
.text-error {{ color: var(--color-error); }}
.text-info {{ color: var(--color-info); }}

.bg-primary {{ background-color: var(--color-primary); }}
.bg-secondary {{ background-color: var(--color-secondary); }}
.bg-surface {{ background-color: var(--color-surface); }}

// Custom CSS
{config.get('custom_css', '')}
"""
        
        # Compile SCSS to CSS
        try:
            css = sass.compile(string=scss_template, output_style='compressed')
            
            # Add prefixes for better browser support
            sheet = cssutils.parseString(css)
            
            # Minify and optimize
            cssutils.ser.prefs.useMinified()
            
            return sheet.cssText.decode('utf-8')
            
        except Exception as e:
            logger.error(f"CSS compilation error: {e}")
            # Return a basic CSS if compilation fails
            return self._generate_fallback_css(config)
    
    def _generate_fallback_css(self, config: Dict[str, Any]) -> str:
        """Generate fallback CSS without SCSS compilation."""
        return f"""
:root {{
    --color-primary: {config['colors']['primary']};
    --color-secondary: {config['colors']['secondary']};
    --color-background: {config['colors']['background']};
    --color-text: {config['colors']['text']};
    --font-family: {config['typography']['font_family']};
    --font-size-base: {config['typography']['font_size_base']};
}}

body {{
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background-color: var(--color-background);
}}

.btn-primary {{
    background-color: var(--color-primary);
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}}

{config.get('custom_css', '')}
"""
    
    async def _generate_favicon(
        self,
        tenant_id: str,
        primary_color: str,
        text: Optional[str] = None
    ) -> str:
        """Generate a dynamic favicon."""
        try:
            # Create favicon image
            size = 64
            img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
            draw = ImageDraw.Draw(img)
            
            # Draw background circle
            margin = 4
            draw.ellipse(
                [margin, margin, size - margin, size - margin],
                fill=primary_color
            )
            
            # Add text if provided
            if text:
                # Use first letter
                letter = text[0].upper()
                
                # Try to load a font, fallback to default
                try:
                    font = ImageFont.truetype("arial.ttf", 32)
                except:
                    font = ImageFont.load_default()
                
                # Get text color
                text_color = ColorUtils.get_contrast_color(primary_color)
                
                # Center text
                bbox = draw.textbbox((0, 0), letter, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                position = ((size - text_width) // 2, (size - text_height) // 2 - 4)
                
                draw.text(position, letter, fill=text_color, font=font)
            
            # Save favicon
            favicon_filename = f"favicon_{tenant_id}.png"
            favicon_path = self.assets_dir / favicon_filename
            img.save(favicon_path, "PNG")
            
            # Also create ICO version
            ico_filename = f"favicon_{tenant_id}.ico"
            ico_path = self.assets_dir / ico_filename
            img.save(ico_path, "ICO", sizes=[(16, 16), (32, 32), (64, 64)])
            
            return f"/static/whitelabel_assets/{favicon_filename}"
            
        except Exception as e:
            logger.error(f"Favicon generation error: {e}")
            return None
    
    async def get_theme(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Get theme for a tenant."""
        # Check cache first
        cached = await cache.get(f"theme:{tenant_id}")
        if cached:
            return json.loads(cached)
        
        # Get from database
        result = await db.execute(
            select(ThemeConfiguration).where(
                ThemeConfiguration.tenant_id == tenant_id,
                ThemeConfiguration.is_active == True
            )
        )
        theme = result.scalar_one_or_none()
        
        if theme:
            theme_data = {
                'config': theme.config,
                'css_url': f"/static/themes/{os.path.basename(theme.css_path)}",
                'favicon_url': theme.favicon_path,
                'theme_hash': theme.theme_hash
            }
            
            # Cache for future requests
            await cache.set(
                f"theme:{tenant_id}",
                json.dumps(theme_data),
                ttl=86400
            )
            
            return theme_data
        
        return None
    
    async def update_theme(
        self,
        tenant_id: str,
        theme_config: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Update theme for a tenant."""
        # Deactivate old theme
        await db.execute(
            update(ThemeConfiguration).where(
                ThemeConfiguration.tenant_id == tenant_id
            ).values(is_active=False)
        )
        
        # Create new theme
        result = await self.create_theme(tenant_id, theme_config, db)
        
        # Clear cache
        await cache.delete(f"theme:{tenant_id}")
        
        return result
    
    async def upload_logo(
        self,
        tenant_id: str,
        logo_file: bytes,
        filename: str
    ) -> str:
        """Upload and process logo."""
        try:
            # Validate image
            img = Image.open(io.BytesIO(logo_file))
            
            # Resize if too large
            max_size = (400, 200)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to PNG for consistency
            output = io.BytesIO()
            img.save(output, format='PNG', optimize=True)
            output.seek(0)
            
            # Save logo
            logo_filename = f"logo_{tenant_id}_{hashlib.md5(output.getvalue()).hexdigest()[:8]}.png"
            logo_path = self.assets_dir / logo_filename
            
            with open(logo_path, 'wb') as f:
                f.write(output.getvalue())
            
            # Create different sizes
            sizes = {
                'small': (100, 50),
                'medium': (200, 100),
                'large': (400, 200)
            }
            
            for size_name, dimensions in sizes.items():
                sized_img = img.copy()
                sized_img.thumbnail(dimensions, Image.Resampling.LANCZOS)
                sized_filename = f"logo_{tenant_id}_{size_name}.png"
                sized_path = self.assets_dir / sized_filename
                sized_img.save(sized_path, 'PNG', optimize=True)
            
            return f"/static/whitelabel_assets/{logo_filename}"
            
        except Exception as e:
            logger.error(f"Logo upload error: {e}")
            raise ValueError(f"Failed to upload logo: {str(e)}")
    
    async def generate_email_theme(
        self,
        tenant_id: str,
        theme_config: Dict[str, Any]
    ) -> str:
        """Generate email template CSS."""
        return f"""
<style>
    .email-container {{
        font-family: {theme_config['typography']['font_family']};
        font-size: {theme_config['typography']['font_size_base']};
        line-height: {theme_config['typography']['line_height_base']};
        color: {theme_config['colors']['text']};
        background-color: {theme_config['colors']['background']};
        max-width: 600px;
        margin: 0 auto;
    }}
    
    .email-header {{
        background-color: {theme_config['colors']['primary']};
        color: {ColorUtils.get_contrast_color(theme_config['colors']['primary'])};
        padding: 24px;
        text-align: center;
    }}
    
    .email-body {{
        background-color: {theme_config['colors']['surface']};
        padding: 32px;
    }}
    
    .email-button {{
        display: inline-block;
        padding: {theme_config['components']['button']['padding']};
        background-color: {theme_config['colors']['primary']};
        color: {ColorUtils.get_contrast_color(theme_config['colors']['primary'])};
        text-decoration: none;
        border-radius: {theme_config['borders']['radius_md']};
        font-weight: {theme_config['components']['button']['font_weight']};
    }}
    
    .email-footer {{
        background-color: {theme_config['colors']['surface']};
        padding: 24px;
        text-align: center;
        font-size: 14px;
        color: {theme_config['colors']['text_secondary']};
        border-top: 1px solid {theme_config['borders']['color']};
    }}
</style>
"""
    
    async def export_theme(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Export theme configuration."""
        theme = await self.get_theme(tenant_id, db)
        if not theme:
            raise ValueError("Theme not found")
        
        return {
            'config': theme['config'],
            'export_date': datetime.utcnow().isoformat(),
            'version': '1.0'
        }
    
    async def import_theme(
        self,
        tenant_id: str,
        theme_export: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Import theme configuration."""
        if 'config' not in theme_export:
            raise ValueError("Invalid theme export format")
        
        return await self.create_theme(
            tenant_id,
            theme_export['config'],
            db
        )


# Singleton instance
theme_service = ThemeService()