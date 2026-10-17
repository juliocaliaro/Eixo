import React, { useState } from 'react';
import { EnvelopeSimple, X } from '@phosphor-icons/react';
import { interpretarEmails, mesclarEmails } from '../utils/emailsCliente';

interface EmailChipsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  label?: string;
}

export const EmailChipsInput: React.FC<EmailChipsInputProps> = ({ value, onChange, label = 'E-mail do cliente (opcional)' }) => {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');

  const confirmar = (): boolean => {
    if (!texto.trim()) return true;
    const { validos, invalidos } = interpretarEmails(texto);
    if (validos.length) onChange(mesclarEmails(value, validos));
    if (invalidos.length) {
      setErro(`E-mail inválido: ${invalidos.join(', ')}`);
      setTexto(invalidos.join(', '));
      return false;
    }
    setTexto('');
    setErro('');
    return true;
  };

  return (
    <div className="form-group">
      <label className="form-label">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <EnvelopeSimple size={18} color="var(--primary-accent)" weight="bold" />
          {label}
        </span>
      </label>
      <input
        type="text"
        inputMode="email"
        autoCapitalize="none"
        className="form-input"
        placeholder="cliente@email.com"
        value={texto}
        aria-invalid={!!erro}
        onChange={(e) => {
          setTexto(e.target.value);
          if (erro) setErro('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
            e.preventDefault();
            confirmar();
          } else if (e.key === 'Backspace' && !texto && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={confirmar}
      />
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {value.map((email) => (
            <span
              key={email}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 4px 3px 10px',
                borderRadius: 999,
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                fontSize: '0.78rem',
                color: 'var(--text-main)',
              }}
            >
              {email}
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remover ${email}`}
                onClick={() => onChange(value.filter((e) => e !== email))}
                style={{ width: 20, height: 20, minWidth: 20, padding: 0 }}
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
      {erro ? (
        <span style={{ fontSize: '0.74rem', color: 'var(--coral-glow-700)', marginTop: 4, display: 'block', fontWeight: 600 }}>{erro}</span>
      ) : (
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
          O cliente acessa a obra entrando com este e-mail.
        </span>
      )}
    </div>
  );
};
