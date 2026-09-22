import { useState } from 'react';
import './password-input.css';

export default function PasswordInput({ className = '', inputClassName = '', ...props }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Hide password' : 'Show password';

  return (
    <div className={`password-input ${className}`.trim()}>
      <input {...props} type={visible ? 'text' : 'password'} className={inputClassName || undefined} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
