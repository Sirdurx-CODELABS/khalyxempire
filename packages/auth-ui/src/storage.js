export function rememberEmail(app, email, on) {
  const key = `khalyx_${app}_remember_email`;
  if (on && email) localStorage.setItem(key, email);
  else localStorage.removeItem(key);
}

export function rememberedEmail(app) {
  return localStorage.getItem(`khalyx_${app}_remember_email`) || '';
}
