import React from 'react';
import { MapPin, User, CalendarBlank, CheckCircle, FileText, CurrencyDollar } from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { progressoDaObra, rotuloRelatorio, totaisFinanceiros } from '../utils/obraMetrics';
import { formatarMoeda as formatarMoedaBR } from '../utils/moeda';
import { formatarDataBR } from '../utils/data';

interface ObraHeaderProps {
  obra: Obra;
  onEdit?: () => void;
  onOpenRelatorio?: () => void;
  perfilAtivo?: PerfilUsuario;
}

export const ObraHeader: React.FC<ObraHeaderProps> = ({ obra, onOpenRelatorio }) => {
  const { totalTarefas, concluidas, percentual, concluida: isConcluida } = progressoDaObra(obra);
  const totais = totaisFinanceiros(obra);
  const saldoAlteracoes = totais.aprovadas.saldo;
  const totalInvestimento = totais.investimentoAtualizado;

  const formatarMoeda = (val: number) => formatarMoedaBR(val, 0);
  const formatarData = (dataStr: string) => formatarDataBR(dataStr, 'Não definida');

  return (
    <div className="obra-header-panel">
      <div className="obra-header-top">
        <div className="obra-title-block">
          <h1 style={{ margin: 0 }}>{obra.nome}</h1>

          {/* Faixa de Metadados Diretos - Versão Desktop (inalterada) */}
          <div className="obra-meta-strip obra-meta-desktop">
            <div className="obra-meta-item">
              <User size={16} color="var(--primary-accent)" weight="bold" />
              <span>Cliente: <strong>{obra.cliente}</strong></span>
            </div>

            <div className="obra-meta-item">
              <MapPin size={16} color="var(--primary-accent)" weight="bold" />
              <span>{obra.endereco}</span>
            </div>

            <div className="obra-meta-item">
              <CalendarBlank size={16} color="var(--primary-accent)" weight="bold" />
              <span>Término previsto: <strong>{formatarData(obra.dataPrevista)}</strong></span>
            </div>

            {obra.orcamentoInicial !== undefined && obra.orcamentoInicial > 0 && (
              <div className="obra-meta-item">
                <CurrencyDollar size={16} color="var(--primary-accent)" weight="bold" />
                <span>
                  Orçamento: <strong>{formatarMoeda(obra.orcamentoInicial)}</strong>
                  {saldoAlteracoes !== 0 && (
                    <span
                      style={{
                        color: saldoAlteracoes > 0 ? 'var(--primary-accent)' : '#16a34a',
                        marginLeft: 5,
                        fontSize: '0.78rem',
                      }}
                    >
                      ({saldoAlteracoes > 0 ? `+${formatarMoeda(saldoAlteracoes)}` : `-${formatarMoeda(Math.abs(saldoAlteracoes))}`} = <strong>{formatarMoeda(totalInvestimento)}</strong>)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Faixa de Metadados Diretos - Versão Mobile (exclusivo <= 768px): uma linha, sem rótulos */}
          <div className="obra-meta-mobile">
            <div className="obra-meta-item">
              <User size={14} color="var(--primary-accent)" weight="bold" />
              <strong>{obra.cliente}</strong>
            </div>

            <div className="obra-meta-item">
              <CalendarBlank size={14} color="var(--primary-accent)" weight="bold" />
              <strong>{formatarData(obra.dataPrevista)}</strong>
            </div>

            {obra.orcamentoInicial !== undefined && obra.orcamentoInicial > 0 && (
              <div className="obra-meta-item">
                <CurrencyDollar size={14} color="var(--primary-accent)" weight="bold" />
                <strong>{formatarMoeda(totalInvestimento)}</strong>
                {saldoAlteracoes !== 0 && (
                  <span className="obra-meta-saldo">
                    ({saldoAlteracoes > 0 ? '+' : '-'}{formatarMoeda(Math.abs(saldoAlteracoes))})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="obra-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {onOpenRelatorio && (
            <button
              onClick={onOpenRelatorio}
              className={`obra-relatorio-btn ${isConcluida ? 'btn-primary' : 'btn-secondary'}`}
              title={`Gerar ${rotuloRelatorio(obra).toLowerCase()}`}
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FileText size={16} weight="bold" />
              <span>{rotuloRelatorio(obra)}</span>
            </button>
          )}

        </div>
      </div>

      {/* Progresso Geral em Faixa Linear Integrada */}
      <div className="progress-strip-wrapper">
        <div className="progress-strip-header">
          <div className="progress-label" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--text-body)' }}>
            <CheckCircle size={17} weight="fill" color="var(--primary-accent)" />
            <span>Avanço Físico</span>
          </div>
          <div>
            <strong className="progress-pct">{percentual}%</strong>
            <span className="progress-detail" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 6 }}>
              ({concluidas} de {totalTarefas} tarefas concluídas)
            </span>
          </div>
        </div>

        <div className="progress-strip-track">
          <div className="progress-strip-bar" style={{ width: `${percentual}%` }} />
        </div>
      </div>
    </div>
  );
};
