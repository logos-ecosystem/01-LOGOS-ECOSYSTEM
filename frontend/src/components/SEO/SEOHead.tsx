import Head from 'next/head';
import { useRouter } from 'next/router';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  noindex?: boolean;
  canonical?: string;
  additionalMetaTags?: Array<{
    name: string;
    content: string;
  }>;
  jsonLd?: any;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  ogImage = '/images/og-default.png',
  ogType = 'website',
  article,
  noindex = false,
  canonical,
  additionalMetaTags = [],
  jsonLd
}) => {
  const router = useRouter();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://logos-ecosystem.ai';
  const fullUrl = `${siteUrl}${router.asPath}`;
  const canonicalUrl = canonical || fullUrl;

  // Default organization schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LOGOS ECOSYSTEM',
    description: 'AI-Native Ecosystem for Advanced AI Agents and Solutions',
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    sameAs: [
      'https://twitter.com/logos_ecosystem',
      'https://linkedin.com/company/logos-ecosystem',
      'https://github.com/logos-ecosystem'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'],
      areaServed: 'Worldwide'
    }
  };

  // Marketplace schema for marketplace pages
  const marketplaceSchema = router.pathname.includes('/marketplace') ? {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LOGOS AI Marketplace',
    url: `${siteUrl}/marketplace`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/marketplace?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  } : null;

  // Combine schemas
  const schemas = [
    organizationSchema,
    marketplaceSchema,
    jsonLd
  ].filter(Boolean);

  const structuredData = schemas.length > 1 
    ? { '@context': 'https://schema.org', '@graph': schemas }
    : schemas[0] || organizationSchema;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{`${title} | LOGOS ECOSYSTEM - AI-Native Platform`}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="author" content="LOGOS ECOSYSTEM" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots Meta */}
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      <meta name="googlebot" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="LOGOS ECOSYSTEM" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@logos_ecosystem" />
      <meta name="twitter:creator" content="@logos_ecosystem" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      
      {/* Article Meta Tags */}
      {article && ogType === 'article' && (
        <>
          {article.publishedTime && (
            <meta property="article:published_time" content={article.publishedTime} />
          )}
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          {article.author && (
            <meta property="article:author" content={article.author} />
          )}
          {article.section && (
            <meta property="article:section" content={article.section} />
          )}
          {article.tags?.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Additional Meta Tags */}
      {additionalMetaTags.map((tag, index) => (
        <meta key={index} name={tag.name} content={tag.content} />
      ))}
      
      {/* Favicons */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <meta name="theme-color" content="#1a1a2e" />
      
      {/* Alternate Languages */}
      <link rel="alternate" hrefLang="en" href={`${siteUrl}/en${router.asPath}`} />
      <link rel="alternate" hrefLang="es" href={`${siteUrl}/es${router.asPath}`} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      
      {/* Preconnect to improve performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
    </Head>
  );
};

export default SEOHead;