import React, { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { interpretarEmails, mesclarEmails } from '../utils/emailsCliente';

interface EmailChipsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  label?: string;
}

export const EmailChipsInput: React.FC<EmailChipsInputProps> = ({ value, onChange, label = 'E-mail do cliente' }) => {
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
      <div className="field-head">
        <label className="form-label" htmlFor="email-cliente-input">
          {label}
        </label>
        <span className="field-optional">Opcional</span>
      </div>
      <input
        id="email-cliente-input"
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {value.map((email) => (
            <span key={email} className="email-chip">
              {email}
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remover ${email}`}
                onClick={() => onChange(value.filter((e) => e !== email))}
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
      {erro ? (
        <span className="field-hint" style={{ color: 'var(--coral-glow-700)', fontWeight: 600 }}>{erro}</span>
      ) : (
        <span className="field-hint">
          O cliente entra no Eixo com este e-mail.
        </span>
      )}
    </div>
  );
};
