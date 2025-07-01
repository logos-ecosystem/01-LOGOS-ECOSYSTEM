const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://logos-ecosystem.ai';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Static pages with their priority and change frequency
const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/marketplace', priority: 0.9, changefreq: 'hourly' },
  { path: '/dashboard', priority: 0.8, changefreq: 'daily' },
  { path: '/about', priority: 0.7, changefreq: 'weekly' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.5, changefreq: 'monthly' },
  { path: '/terms', priority: 0.5, changefreq: 'monthly' },
  { path: '/auth/signin', priority: 0.6, changefreq: 'monthly' },
  { path: '/auth/signup', priority: 0.7, changefreq: 'monthly' },
  { path: '/agents', priority: 0.9, changefreq: 'daily' },
  { path: '/integrations', priority: 0.8, changefreq: 'weekly' },
  { path: '/developers', priority: 0.7, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.8, changefreq: 'weekly' },
  { path: '/blog', priority: 0.7, changefreq: 'daily' }
];

// Agent categories for dynamic pages
const agentCategories = [
  'medical', 'business', 'technology', 'science', 'education', 
  'legal', 'finance', 'engineering', 'arts', 'sports',
  'agriculture', 'automotive', 'real-estate', 'hospitality'
];

async function fetchDynamicRoutes() {
  const dynamicRoutes = [];
  
  try {
    // Fetch all agents from API
    const agentsResponse = await axios.get(`${API_URL}/api/v1/agents`);
    const agents = agentsResponse.data.data || [];
    
    // Add individual agent pages
    agents.forEach(agent => {
      dynamicRoutes.push({
        path: `/marketplace/agent/${agent.id}`,
        priority: 0.8,
        changefreq: 'weekly',
        lastmod: agent.updated_at
      });
    });
    
    // Add category pages
    agentCategories.forEach(category => {
      dynamicRoutes.push({
        path: `/marketplace/category/${category}`,
        priority: 0.7,
        changefreq: 'daily'
      });
    });
    
    // Fetch blog posts if available
    try {
      const blogResponse = await axios.get(`${API_URL}/api/v1/blog/posts`);
      const posts = blogResponse.data.data || [];
      
      posts.forEach(post => {
        dynamicRoutes.push({
          path: `/blog/${post.slug}`,
          priority: 0.6,
          changefreq: 'monthly',
          lastmod: post.updated_at
        });
      });
    } catch (error) {
      console.log('Blog posts not available');
    }
    
  } catch (error) {
    console.error('Error fetching dynamic routes:', error.message);
  }
  
  return dynamicRoutes;
}

function generateSitemapXML(pages) {
  const currentDate = new Date().toISOString();
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${pages.map(page => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${page.lastmod || currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return xml;
}

function generateRobotsTxt() {
  const robotsTxt = `# LOGOS ECOSYSTEM Robots.txt
# https://logos-ecosystem.ai

User-agent: *
Allow: /

# Directories
Allow: /marketplace/
Allow: /blog/
Allow: /agents/
Allow: /api/docs

# Disallow private areas
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/v1/private/

# Crawl-delay for responsible crawling
Crawl-delay: 1

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-agents.xml
Sitemap: ${SITE_URL}/sitemap-blog.xml`;

  return robotsTxt;
}

async function generateSitemaps() {
  console.log('🚀 Generating sitemaps...');
  
  try {
    // Fetch dynamic routes
    const dynamicRoutes = await fetchDynamicRoutes();
    
    // Combine all routes
    const allPages = [...staticPages, ...dynamicRoutes];
    
    // Generate main sitemap
    const mainSitemap = generateSitemapXML(allPages);
    fs.writeFileSync(
      path.join(__dirname, '../public/sitemap.xml'),
      mainSitemap
    );
    console.log('✅ Generated main sitemap.xml');
    
    // Generate agent-specific sitemap
    const agentPages = dynamicRoutes.filter(route => 
      route.path.includes('/marketplace/agent/') || 
      route.path.includes('/marketplace/category/')
    );
    if (agentPages.length > 0) {
      const agentSitemap = generateSitemapXML(agentPages);
      fs.writeFileSync(
        path.join(__dirname, '../public/sitemap-agents.xml'),
        agentSitemap
      );
      console.log('✅ Generated sitemap-agents.xml');
    }
    
    // Generate blog sitemap
    const blogPages = dynamicRoutes.filter(route => 
      route.path.includes('/blog/')
    );
    if (blogPages.length > 0) {
      const blogSitemap = generateSitemapXML(blogPages);
      fs.writeFileSync(
        path.join(__dirname, '../public/sitemap-blog.xml'),
        blogSitemap
      );
      console.log('✅ Generated sitemap-blog.xml');
    }
    
    // Generate robots.txt
    const robotsTxt = generateRobotsTxt();
    fs.writeFileSync(
      path.join(__dirname, '../public/robots.txt'),
      robotsTxt
    );
    console.log('✅ Generated robots.txt');
    
    // Generate sitemap index
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  ${agentPages.length > 0 ? `<sitemap>
    <loc>${SITE_URL}/sitemap-agents.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>` : ''}
  ${blogPages.length > 0 ? `<sitemap>
    <loc>${SITE_URL}/sitemap-blog.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>` : ''}
</sitemapindex>`;
    
    fs.writeFileSync(
      path.join(__dirname, '../public/sitemap-index.xml'),
      sitemapIndex
    );
    console.log('✅ Generated sitemap-index.xml');
    
    console.log('🎉 All sitemaps generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating sitemaps:', error);
    process.exit(1);
  }
}

// Run the generator
generateSitemaps();