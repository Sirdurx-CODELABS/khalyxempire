import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { money } from '../api/client.js';

export const brandLogoSrc = `${import.meta.env.BASE_URL}brand/logo.png`;

export function BarcodeSticker({ item }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (!svgRef.current || !item.barcode) return;
    try {
      JsBarcode(svgRef.current, String(item.barcode), {
        format: 'CODE128',
        width: 1.35,
        height: 42,
        displayValue: true,
        fontSize: 11,
        margin: 2,
        lineColor: '#0d0d0d',
        background: '#ffffff'
      });
    } catch {
      svgRef.current.replaceChildren();
    }
  }, [item.barcode]);

  return (
    <article className="label-card">
      <img className="label-logo" src={brandLogoSrc} alt="Khalyx Empire" />
      <p className="label-brand">Khalyx Empire</p>
      <strong>{item.name}</strong>
      <p className="muted">
        {[item.size, item.color].filter(Boolean).join(' · ') || item.sku}
      </p>
      <svg ref={svgRef} />
      <p className="label-meta">
        {item.sku}
        {item.price ? ` · ${money(item.price)}` : ''}
      </p>
    </article>
  );
}
