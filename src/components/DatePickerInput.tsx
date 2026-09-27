import React, { useState, useEffect, useRef } from 'react';
import { CalendarBlank, PencilSimple, Check } from '@phosphor-icons/react';

interface DatePickerInputProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: string; // Formato YYYY-MM-DD
  label?: string;
  helperText?: string;
  required?: boolean;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
function isoToBr(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

/**
 * Converte data brasileira (DD/MM/AAAA) para formato ISO (YYYY-MM-DD)
 */
function brToIso(br: string): string {
  if (!br) return '';
  const parts = br.split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  if (d.length !== 2 || m.length !== 2 || y.length !== 4) return '';
  return `${y}-${m}-${d}`;
}

/**
 * Formata texto digitado aplicando máscara DD/MM/AAAA automaticamente
 */
function formatarMascaraData(raw: string): string {
  // Mantém apenas dígitos
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  minDate,
  label = 'Data Prevista de Conclusão',
  helperText = 'Permitido apenas datas futuras (a partir de amanhã).',
  required = false,
}) => {
  const [modo, setModo] = useState<'digitar' | 'calendario'>('digitar');
  const [textoBr, setTextoBr] = useState<string>(() => isoToBr(value));
  const [avisoErro, setAvisoErro] = useState<string>('');

  const dateInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar se o valor externo mudar
  useEffect(() => {
    setTextoBr(isoToBr(value));
  }, [value]);

  // Manipular digitação livre com máscara
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatado = formatarMascaraData(raw);
    setTextoBr(formatado);
    setAvisoErro('');

    if (formatado.length === 10) {
      const [dStr, mStr, yStr] = formatado.split('/');
      const dia = parseInt(dStr, 10);
      const mes = parseInt(mStr, 10);
      const ano = parseInt(yStr, 10);

      // Validação de calendário
      if (mes < 1 || mes > 12) {
        setAvisoErro('Mês inválido (deve ser de 01 a 12).');
        return;
      }
      if (dia < 1 || dia > 31) {
        setAvisoErro('Dia inválido.');
        return;
      }
      if (ano < 2024 || ano > 2100) {
        setAvisoErro('Ano inválido.');
        return;
      }

      // Validar dias do mês (incluindo ano bissexto)
      const dataObj = new Date(ano, mes - 1, dia);
      if (
        dataObj.getFullYear() !== ano ||
        dataObj.getMonth() !== mes - 1 ||
        dataObj.getDate() !== dia
      ) {
        setAvisoErro('Data inexistente no calendário.');
        return;
      }

      const iso = brToIso(formatado);
      if (minDate && iso < minDate) {
        setAvisoErro('A data deve ser futura (a partir de amanhã).');
        return;
      }

      // Data válida!
      setAvisoErro('');
      onChange(iso);
    } else if (formatado.length === 0) {
      setAvisoErro('');
      onChange('');
    }
  };

  // Abrir seletor nativo de calendário
  const handleAbrirCalendario = () => {
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype && typeof dateInputRef.current.showPicker === 'function') {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
          dateInputRef.current.click();
        }
      } catch {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  const handleDateNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoIso = e.target.value;
    if (minDate && novoIso && novoIso < minDate) {
      setAvisoErro('A data deve ser futura (a partir de amanhã).');
      return;
    }
    setAvisoErro('');
    onChange(novoIso);
    setTextoBr(isoToBr(novoIso));
  };

  // Formatação amigável para exibição
  const getDataAmigavel = () => {
    if (!value) return 'Nenhuma data selecionada';
    try {
      const [ano, mes, dia] = value.split('-');
      const dataObj = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
      return dataObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoToBr(value);
    }
  };

  return (
    <div className="date-picker-composite" style={{ marginBottom: 16 }}>
      {/* Rótulo e Alternador de Modo (Digitar vs Calendário) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarBlank size={17} color="var(--primary-accent)" weight="bold" />
            {label}
            {required && <span style={{ color: 'var(--coral-glow-500)' }}>*</span>}
          </span>
        </label>

        {/* Abas Pill: Opção de Digitar ou Selecionar no Calendário */}
        <div
          role="tablist"
          aria-label="Forma de preenchimento da data"
          style={{
            display: 'inline-flex',
            background: 'var(--dark-coffee-100)',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'digitar'}
            onClick={() => {
              setModo('digitar');
              setTimeout(() => textInputRef.current?.focus(), 50);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              background: modo === 'digitar' ? '#ffffff' : 'transparent',
              color: modo === 'digitar' ? 'var(--pitch-black-950)' : 'var(--dark-coffee-700)',
              boxShadow: modo === 'digitar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <PencilSimple size={14} weight={modo === 'digitar' ? 'bold' : 'regular'} />
            <span>Digitar</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={modo === 'calendario'}
            onClick={() => {
              setModo('calendario');
              setTimeout(() => handleAbrirCalendario(), 80);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              cursor: 'pointer',
              background: modo === 'calendario' ? '#ffffff' : 'transparent',
              color: modo === 'calendario' ? 'var(--pitch-black-950)' : 'var(--dark-coffee-700)',
              boxShadow: modo === 'calendario' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarBlank size={14} weight={modo === 'calendario' ? 'bold' : 'regular'} />
            <span>Calendário</span>
          </button>
        </div>
      </div>

      {/* Input invisível nativo para disparo do calendário em ambos os modos */}
      <input
        ref={dateInputRef}
        type="date"
        min={minDate}
        value={value}
        onChange={handleDateNativeChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
        }}
      />

      {/* MODO 1: Digitação direta com máscara e teclado numérico no mobile */}
      {modo === 'digitar' && (
        <div style={{ position: 'relative' }}>
          <input
            ref={textInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9/]*"
            maxLength={10}
            placeholder="DD/MM/AAAA (ex: 25/12/2026)"
            className="form-input"
            value={textoBr}
            onChange={handleTextChange}
            style={{
              paddingRight: 44,
              fontSize: '16px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.5px',
              fontWeight: textoBr ? 600 : 400,
            }}
          />
          {/* Botão de atalho para calendário direto dentro do input */}
          <button
            type="button"
            onClick={handleAbrirCalendario}
            title="Escolher no calendário visual"
            aria-label="Abrir seletor de calendário"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-accent)',
              padding: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <CalendarBlank size={20} weight="bold" />
          </button>
        </div>
      )}

      {/* MODO 2: Seleção no Calendário com botão card touch amigável */}
      {modo === 'calendario' && (
        <div>
          <button
            type="button"
            onClick={handleAbrirCalendario}
            className="form-input"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              cursor: 'pointer',
              background: '#ffffff',
              padding: '11px 14px',
              fontSize: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  background: 'var(--coral-glow-50)',
                  color: 'var(--primary-accent)',
                  padding: 6,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarBlank size={18} weight="bold" />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: value ? 700 : 500,
                    color: value ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.95rem',
                  }}
                >
                  {value ? getDataAmigavel() : 'Toque para abrir o calendário'}
                </div>
                {value && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Formato: {isoToBr(value)}
                  </div>
                )}
              </div>
            </div>

            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--primary-accent)',
                padding: '4px 8px',
                borderRadius: 4,
                background: 'var(--coral-glow-50)',
                flexShrink: 0,
              }}
            >
              Alterar
            </span>
          </button>
        </div>
      )}

      {/* Mensagem de Erro de Validação de Data */}
      {avisoErro && (
        <div
          role="alert"
          style={{
            fontSize: '0.8rem',
            color: 'var(--coral-glow-600)',
            fontWeight: 600,
            marginTop: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span>•</span>
          <span>{avisoErro}</span>
        </div>
      )}

      {/* Helper text padrão */}
      {!avisoErro && helperText && (
        <span
          style={{
            display: 'block',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginTop: 5,
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
};
