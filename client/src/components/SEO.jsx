import { Helmet } from 'react-helmet-async';
import useSiteContent from '../hooks/useSiteContent';

const SEO = ({
  title = 'MSP - MIU',
  description = 'MSP Tech Club at Misr International University (MIU). A student-led innovation community powered by Microsoft Learn Student Ambassadors. Join us to explore cutting-edge technologies, build real projects, and develop technical & leadership excellence.',
  keywords = 'MSP, Microsoft Student Partners, MIU, Misr International University, tech club, student club, technology, programming, software development, Microsoft, student ambassadors, Egypt',
  image,
  url,
  type = 'website',
  structuredData = null,
  noindex = false
}) => {
  const { data } = useSiteContent(['seo'], {
    seo: {
      siteUrl: 'https://msp-miu.tech',
      twitterHandle: '@mspmiu',
      defaultOgImage: 'https://msp-miu.tech/assets/msp-logo-wiNKhlUf.png'
    }
  });
  const seo = data.seo || {};
  const siteUrl = seo.siteUrl || 'https://msp-miu.tech';
  const resolvedImage = image || seo.defaultOgImage || `${siteUrl}/assets/msp-logo-wiNKhlUf.png`;
  const resolvedUrl = url || siteUrl;
  const fullTitle = title === 'MSP - MIU' || title.includes('MSP - MIU') ? title : `${title} | MSP - MIU`;
  const fullUrl = resolvedUrl.startsWith('http') ? resolvedUrl : `${siteUrl}${resolvedUrl}`;
  const twitter = seo.twitterHandle || '@mspmiu';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:secure_url" content={resolvedImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content="MSP - MIU Logo" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="1200" />
      <meta property="og:site_name" content="MSP - MIU" />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:site" content={twitter} />

      <meta name="author" content="MSP - MIU" />

      <link rel="icon" type="image/png" sizes="32x32" href="/assets/msp-logo-favicon.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/assets/msp-logo-favicon.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/assets/msp-logo-favicon.png" />
      <link rel="shortcut icon" href="/assets/msp-logo-favicon.png" />
      <meta name="theme-color" content="#031C35" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
