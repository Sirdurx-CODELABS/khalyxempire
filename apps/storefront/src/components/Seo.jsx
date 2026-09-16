import { Helmet } from 'react-helmet-async';

export default function Seo({ title, description, path = '' }) {
  const full = title ? `${title} | Khalyx Empire` : 'Khalyx Empire';
  const desc =
    description ||
    'Khalyx Empire — fashion and lifestyle from Lagos. Footwear, traditional wear, streetwear, bags, jewelries and fragrance.';
  const url = `https://khalyx.ng${path}`;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
