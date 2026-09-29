import React, { useState, useEffect, useRef } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, X } from '@phosphor-icons/react';

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
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  minDate,
  label = 'Data Prevista de Conclusão',
  helperText = 'Informe a previsão de conclusão da obra (DD/MM/AAAA).',
  required = false,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [textoBr, setTextoBr] = useState<string>(() => isoToBr(value));
  const [avisoErro, setAvisoErro] = useState<string>('');

  // Mês e ano em visualização no calendário customizado
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return new Date(y, m, 1);
      }
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar texto quando o valor externo mudar
  useEffect(() => {
    setTextoBr(isoToBr(value));
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        setViewDate(new Date(y, m, 1));
      }
    }
  }, [value]);

  // Fechar calendário ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!isCalendarOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.stopImmediatePropagation();
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isCalendarOpen]);

  // Manipular digitação manual no input (SEM disparar clique nem abrir picker)
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
      if (ano < 1900 || ano > 2100) {
        setAvisoErro('Ano inválido.');
        return;
      }

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
        setAvisoErro('A data não pode ser anterior à data mínima permitida.');
        return;
      }

      setAvisoErro('');
      onChange(iso);
      setViewDate(new Date(ano, mes - 1, 1));
    } else if (formatado.length === 0) {
      setAvisoErro('');
      onChange('');
    }
  };

  // Navegação de mês no calendário customizado
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Selecionar dia no calendário customizado
  const handleSelectDate = (iso: string) => {
    if (minDate && iso < minDate) {
      setAvisoErro('A data não pode ser anterior à data mínima permitida.');
      return;
    }
    setAvisoErro('');
    onChange(iso);
    setTextoBr(isoToBr(iso));
    setIsCalendarOpen(false);
  };

  // Atalhos rápidos para prazos de obra (+30, +60, +90 dias)
  const handleAddDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    handleSelectDate(iso);
  };

  // Formatação amigável para exibição
  const getDataAmigavel = () => {
    if (!value) return '';
    try {
      const [ano, mes, dia] = value.split('-');
      const dataObj = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
      return dataObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoToBr(value);
    }
  };

  // Cálculo dos dias para o mês visível
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Data atual para marcação de "hoje"
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const diasDoMes = Array.from({ length: totalDays }, (_, i) => {
    const dia = i + 1;
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const isDisabled = minDate ? iso < minDate : false;
    const isSelected = value === iso;
    const isToday = todayIso === iso;

    return {
      dia,
      iso,
      isDisabled,
      isSelected,
      isToday,
    };
  });

  return (
    <div
      ref={containerRef}
      className="date-picker-custom"
      style={{
        position: 'relative',
        marginBottom: isCalendarOpen ? 24 : 16,
        transition: 'margin-bottom 0.2s ease',
      }}
    >
      {/* Rótulo com Data Amigável */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarBlank size={17} color="var(--primary-accent)" weight="bold" />
            {label}
            {required && <span style={{ color: 'var(--coral-glow-500)' }}>*</span>}
          </span>
        </label>

        {value && !avisoErro && (
          <span style={{ fontSize: '0.74rem', color: 'var(--primary-accent)', fontWeight: 600 }}>
            {getDataAmigavel()}
          </span>
        )}
      </div>

      {/* Input de Texto Livre: digitação direta com teclado sem abrir popups no Focus */}
      <div style={{ position: 'relative' }}>
        <input
          ref={textInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9/]*"
          maxLength={10}
          placeholder="DD/MM/AAAA"
          className="form-input"
          value={textoBr}
          onChange={handleTextChange}
          /* 
             IMPORTANTE: Nenhum evento de click ou showPicker no focus do input!
             O usuário pode focar, digitar, apagar e navegar livremente sem popups intrusivos.
          */
          style={{
            paddingRight: 42,
            fontSize: '15px',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.5px',
            fontWeight: textoBr ? 600 : 400,
            borderColor: avisoErro ? '#dc2626' : isCalendarOpen ? 'var(--primary-accent)' : undefined,
          }}
        />

        {/* Botão de Disparo do Calendário Customizado */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCalendarOpen((prev) => !prev);
          }}
          title={isCalendarOpen ? 'Fechar calendário' : 'Abrir calendário'}
          aria-label="Abrir calendário"
          aria-expanded={isCalendarOpen}
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            background: isCalendarOpen ? 'var(--coral-glow-50)' : 'transparent',
            border: 'none',
            color: isCalendarOpen ? 'var(--primary-accent)' : 'var(--dark-coffee-700)',
            padding: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-xs)',
            transition: 'all 0.15s ease',
          }}
        >
          <CalendarBlank size={19} weight={isCalendarOpen ? 'fill' : 'bold'} />
        </button>
      </div>

      {/* Popover do Calendário Customizado em React */}
      {isCalendarOpen && (
        <div
          role="dialog"
          aria-label="Calendário"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1050,
            width: '290px',
            background: '#ffffff',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-floating)',
            padding: '14px',
            animation: 'fadeIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header do Calendário: Navegação de Mês */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                padding: '5px 7px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.12s ease',
              }}
              title="Mês anterior"
            >
              <CaretLeft size={14} weight="bold" />
            </button>

            <span
              style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                textTransform: 'capitalize',
              }}
            >
              {NOMES_MESES[month]} {year}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                padding: '5px 7px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.12s ease',
              }}
              title="Próximo mês"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>

          {/* Cabeçalho dos Dias da Semana */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            {DIAS_SEMANA.map((diaSem) => (
              <span
                key={diaSem}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  padding: '2px 0',
                }}
              >
                {diaSem}
              </span>
            ))}
          </div>

          {/* Grid dos Dias do Mês */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
            }}
          >
            {/* Espaços em branco para os dias antes do início do mês */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} style={{ height: 32 }} />
            ))}

            {/* Células de Dias */}
            {diasDoMes.map(({ dia, iso, isDisabled, isSelected, isToday }) => (
              <button
                key={iso}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectDate(iso)}
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : isToday ? 700 : 500,
                  borderRadius: 'var(--radius-xs)',
                  border: isSelected
                    ? 'none'
                    : isToday
                      ? '1px dashed var(--primary-accent)'
                      : 'none',
                  background: isSelected
                    ? 'var(--primary-accent)'
                    : 'transparent',
                  color: isSelected
                    ? '#ffffff'
                    : isDisabled
                      ? 'var(--mauve-bark-300)'
                      : isToday
                        ? 'var(--primary-accent)'
                        : 'var(--pitch-black-950)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.35 : 1,
                  transition: 'all 0.12s ease',
                }}
                title={isDisabled ? 'Data não permitida (anterior à data mínima)' : isoToBr(iso)}
              >
                {dia}
              </button>
            ))}
          </div>

          {/* Atalhos Rápidos para Prazos de Obra */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => handleAddDays(30)}
              style={{
                fontSize: '0.70rem',
                fontWeight: 600,
                padding: '3px 7px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-body)',
                cursor: 'pointer',
              }}
              title="Prazo de 30 dias a partir de hoje"
            >
              +30 dias
            </button>
            <button
              type="button"
              onClick={() => handleAddDays(60)}
              style={{
                fontSize: '0.70rem',
                fontWeight: 600,
                padding: '3px 7px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-body)',
                cursor: 'pointer',
              }}
              title="Prazo de 60 dias a partir de hoje"
            >
              +60 dias
            </button>
            <button
              type="button"
              onClick={() => handleAddDays(90)}
              style={{
                fontSize: '0.70rem',
                fontWeight: 600,
                padding: '3px 7px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-body)',
                cursor: 'pointer',
              }}
              title="Prazo de 90 dias a partir de hoje"
            >
              +90 dias
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de Erro de Validação de Data */}
      {avisoErro && (
        <div
          role="alert"
          style={{
            fontSize: '0.78rem',
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
            fontSize: '0.76rem',
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
