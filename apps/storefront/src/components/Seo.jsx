import { Helmet } from 'react-helmet-async';

const SITE = (import.meta.env.VITE_SITE_URL || 'https://khalyxempire-storefront.vercel.app').replace(/\/$/, '');
const DEFAULT_DESC =
  'Khalyx Empire — fashion and lifestyle from Lagos. Footwear, traditional wear, streetwear, bags, jewelry and fragrance.';
const OG_IMAGE = `${SITE}/og.png`;

export default function Seo({ title, description, path = '', image }) {
  const full = title && title !== 'Home' ? `${title} | Khalyx Empire` : 'Khalyx Empire';
  const desc = description || DEFAULT_DESC;
  const url = `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
  const img = image || OG_IMAGE;

  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content="Khalyx Empire" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:image:secure_url" content={img} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={full} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
