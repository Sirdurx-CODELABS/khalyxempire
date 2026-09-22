import { useEffect, useState } from 'react';
import { FALLBACK_SLIDES } from './slides.js';
import './auth.css';

function mergeSlides(live) {
  const fromCatalog = (live || []).filter((s) => s?.src);
  if (fromCatalog.length >= 4) return fromCatalog.slice(0, 8);
  const seen = new Set(fromCatalog.map((s) => s.caption));
  const extra = FALLBACK_SLIDES.filter((s) => !seen.has(s.caption));
  return [...fromCatalog, ...extra].slice(0, 6);
}

function AuthCarousel() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch('/api/auth/showcase')
      .then((r) => (r.ok ? r.json() : { slides: [] }))
      .then((data) => {
        if (!ignore) setSlides(mergeSlides(data.slides));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(id);
  }, [slides.length]);

  const current = slides[index] || slides[0];

  return (
    <aside className="auth-gallery" aria-hidden="true">
      {slides.map((slide, i) => (
        <div
          key={`${slide.src}-${i}`}
          className={`auth-slide ${i === index ? 'on' : ''}`}
          style={{ backgroundImage: `url("${slide.src}")` }}
        />
      ))}
      <div className="auth-gallery-veil" />
      <div className="auth-gallery-copy">
        <small>{current?.kicker || 'Khalyx Empire'}</small>
        <strong>{current?.caption || 'From the Ground, To the Throne'}</strong>
      </div>
      <div className="auth-dots">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            className={i === index ? 'on' : ''}
            aria-label={slide.caption}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </aside>
  );
}

export function AuthShell({ badge, logoSrc, children }) {
  return (
    <div className="auth-screen">
      <AuthCarousel />
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand">
            <img src={logoSrc} alt="Khalyx Empire" />
            <p>From the Ground, To the Throne</p>
            {badge ? <span className="auth-badge">{badge}</span> : null}
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

export function AuthField({ label, hint, children }) {
  return (
    <label className="auth-field">
      {label ? <span>{label}</span> : null}
      {children}
      {hint ? <small style={{ color: '#6b6458' }}>{hint}</small> : null}
    </label>
  );
}

export function AuthButton({ loading, children, disabled, ...props }) {
  return (
    <button className="auth-btn" type="submit" {...props} disabled={Boolean(loading || disabled)}>
      {loading ? <span className="auth-spinner" aria-hidden="true" /> : null}
      {loading ? 'Please wait' : children}
    </button>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return <p className="auth-error">{children}</p>;
}

export function AuthSuccess({ title, children }) {
  return (
    <div className="auth-success">
      <div className="auth-success-mark" aria-hidden="true">
        ✓
      </div>
      {title ? <h1>{title}</h1> : null}
      <p className="auth-lead">{children}</p>
    </div>
  );
}

