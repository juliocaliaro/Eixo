import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { CalendarBlank, CaretLeft, CaretRight, X } from '@phosphor-icons/react';

interface DatePickerInputProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: string; // Formato YYYY-MM-DD
  label?: string;
  helperText?: string;
  required?: boolean;
  /** Mantido por compatibilidade: no mobile o calendário agora é uma sheet e dispensa rolagem automática. */
  autoScrollOnMobile?: boolean;
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

/** Altura aproximada do popover do calendário no desktop (para decidir se abre para cima ou para baixo). */
const ALTURA_POPOVER = 360;

interface CalendarPanelProps {
  viewDate: Date;
  value: string;
  minDate?: string;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onSelect: (iso: string) => void;
  onAddDays: (days: number) => void;
}

/** Mês, grade de dias e atalhos: o mesmo conteúdo no popover (desktop) e na sheet (mobile). */
const CalendarPanel: React.FC<CalendarPanelProps> = ({ viewDate, value, minDate, onPrev, onNext, onSelect, onAddDays }) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <>
      <div className="cal-nav">
        <button type="button" className="cal-nav-btn" onClick={onPrev} aria-label="Mês anterior">
          <CaretLeft size={16} weight="bold" />
        </button>
        <span className="cal-month" aria-live="polite">
          {NOMES_MESES[month]} {year}
        </span>
        <button type="button" className="cal-nav-btn" onClick={onNext} aria-label="Próximo mês">
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      <div className="cal-grid" role="grid" aria-label={`${NOMES_MESES[month]} ${year}`}>
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="cal-dow" role="columnheader">
            {d}
          </span>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: totalDays }, (_, i) => {
          const dia = i + 1;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const desabilitado = minDate ? iso < minDate : false;
          const classe = ['cal-day', value === iso ? 'is-selected' : '', todayIso === iso ? 'is-today' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={iso}
              type="button"
              className={classe}
              disabled={desabilitado}
              aria-pressed={value === iso}
              aria-label={isoToBr(iso)}
              onClick={() => onSelect(iso)}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="cal-shortcuts">
        {[30, 60, 90].map((dias) => (
          <button key={dias} type="button" className="cal-chip" onClick={() => onAddDays(dias)}>
            +{dias} dias
          </button>
        ))}
      </div>
    </>
  );
};

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  minDate,
  label = 'Data prevista de conclusão',
  helperText = 'Informe a previsão de conclusão da obra (DD/MM/AAAA).',
  required = false,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [textoBr, setTextoBr] = useState<string>(() => isoToBr(value));
  const [avisoErro, setAvisoErro] = useState<string>('');
  const [direcao, setDirecao] = useState<'up' | 'down'>('up');

  const isMobile = useIsMobile();

  // Mês e ano em visualização no calendário
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
  const inputWrapRef = useRef<HTMLDivElement>(null);
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

  // Desktop: abre para baixo quando há espaço (dentro do corpo do modal ou da janela); senão, para cima.
  useLayoutEffect(() => {
    if (!isCalendarOpen || isMobile || !inputWrapRef.current) return;
    const rect = inputWrapRef.current.getBoundingClientRect();
    const corpo = inputWrapRef.current.closest('.modal-body');
    const limite = Math.min(corpo ? corpo.getBoundingClientRect().bottom : window.innerHeight, window.innerHeight);
    const abaixo = limite - rect.bottom;
    const acima = rect.top - (corpo ? Math.max(corpo.getBoundingClientRect().top, 0) : 0);
    setDirecao(abaixo >= ALTURA_POPOVER || abaixo >= acima ? 'down' : 'up');
  }, [isCalendarOpen, isMobile]);

  // Desktop: clique fora fecha o popover. No mobile a sheet tem backdrop próprio.
  useEffect(() => {
    if (!isCalendarOpen || isMobile) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCalendarOpen, isMobile]);

  // Escape fecha só o calendário (topo da pilha), sem fechar o modal pai. A entrada na pilha
  // também trava a rolagem da página enquanto a sheet do mobile estiver aberta.
  useEscapeKey(() => setIsCalendarOpen(false), isCalendarOpen);

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
      if (dataObj.getFullYear() !== ano || dataObj.getMonth() !== mes - 1 || dataObj.getDate() !== dia) {
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

  // Navegação de mês no calendário
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

  // Selecionar dia no calendário
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
    handleSelectDate(`${y}-${m}-${d}`);
  };

  const painel = (
    <CalendarPanel
      viewDate={viewDate}
      value={value}
      minDate={minDate}
      onPrev={handlePrevMonth}
      onNext={handleNextMonth}
      onSelect={handleSelectDate}
      onAddDays={handleAddDays}
    />
  );

  const inputId = `date-${label.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <div ref={containerRef} className="date-picker-custom">
      <label className="form-label" htmlFor={inputId}>
        {label}
        {required && <span className="field-optional"> *</span>}
      </label>

      {/* Digitação direta (DD/MM/AAAA) sem abrir popups no foco */}
      <div className="date-input-wrap" ref={inputWrapRef}>
        <input
          id={inputId}
          ref={textInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9/]*"
          maxLength={10}
          placeholder="DD/MM/AAAA"
          className={`form-input${textoBr ? ' has-value' : ''}${avisoErro ? ' is-invalid' : ''}`}
          value={textoBr}
          onChange={handleTextChange}
          aria-invalid={!!avisoErro}
        />

        <button
          type="button"
          className="date-trigger"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCalendarOpen((prev) => !prev);
          }}
          title={isCalendarOpen ? 'Fechar calendário' : 'Abrir calendário'}
          aria-label="Abrir calendário"
          aria-expanded={isCalendarOpen}
        >
          <CalendarBlank size={20} weight={isCalendarOpen ? 'fill' : 'bold'} />
        </button>

        {/* Desktop: popover ancorado no campo */}
        {isCalendarOpen && !isMobile && (
          <div className="cal-popover" data-dir={direcao} role="dialog" aria-label="Calendário">
            {painel}
          </div>
        )}
      </div>

      {avisoErro && (
        <div role="alert" className="date-error">
          {avisoErro}
        </div>
      )}

      {!avisoErro && helperText && <span className="date-hint">{helperText}</span>}

      {/* Mobile: segunda sheet, sem cobrir os campos do formulário */}
      {isCalendarOpen &&
        isMobile &&
        createPortal(
          <div
            className="modal-backdrop"
            style={{ zIndex: 'var(--z-modal-stacked)' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsCalendarOpen(false);
            }}
            // Evita que popovers de quem hospeda este campo (ex.: filtro do Diário) tratem o toque como "fora".
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="modal-card date-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">{label}</h2>
                <button type="button" className="btn-icon" onClick={() => setIsCalendarOpen(false)} aria-label="Fechar calendário">
                  <X size={18} weight="bold" />
                </button>
              </div>
              <div className="modal-body">{painel}</div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
