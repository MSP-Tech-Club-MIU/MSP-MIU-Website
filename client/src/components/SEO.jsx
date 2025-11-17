import { Helmet } from 'react-helmet-async';

/**
 * SEO Component for managing page meta tags, Open Graph, Twitter Cards, and structured data
 * 
 * @param {Object} props
 * @param {string} props.title - Page title (default: "MSP Tech Club - MIU")
 * @param {string} props.description - Meta description
 * @param {string} props.keywords - Meta keywords (comma-separated)
 * @param {string} props.image - Open Graph image URL
 * @param {string} props.url - Canonical URL
 * @param {string} props.type - Open Graph type (default: "website")
 * @param {Object} props.structuredData - JSON-LD structured data object
 * @param {boolean} props.noindex - Whether to prevent indexing (default: false)
 */
const SEO = ({
  title = 'MSP - MIU',
  description = 'MSP Tech Club at Misr International University (MIU). A student-led innovation community powered by Microsoft Learn Student Ambassadors. Join us to explore cutting-edge technologies, build real projects, and develop technical & leadership excellence.',
  keywords = 'MSP, Microsoft Student Partners, MIU, Misr International University, tech club, student club, technology, programming, software development, Microsoft, student ambassadors, Egypt',
  image = 'https://msp-miu.tech/assets/msp-logo-C_Z3KgzA.png',
  url = 'https://msp-miu.tech',
  type = 'website',
  structuredData = null,
  noindex = false
}) => {
  const fullTitle = title === 'MSP - MIU' || title.includes('MSP - MIU') ? title : `${title} | MSP - MIU`;
  const fullUrl = url.startsWith('http') ? url : `https://msp-miu.tech${url}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="MSP - MIU" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@mspmiu" />

      {/* Additional Meta Tags */}
      <meta name="author" content="MSP - MIU" />
      
      {/* Favicon for better WhatsApp/Telegram support */}
      <link rel="icon" type="image/png" sizes="32x32" href="/assets/msp-logo-favicon-CGgLuyyo.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/assets/msp-logo-favicon-CGgLuyyo.png" />
      <meta name="theme-color" content="#031C35" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

