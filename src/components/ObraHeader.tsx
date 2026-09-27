import React from 'react';
import { PencilSimple, MapPin, User, CalendarBlank, CheckCircle, Clock, FileText } from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';

interface ObraHeaderProps {
  obra: Obra;
  onEdit: () => void;
  onOpenRelatorio?: () => void;
  perfilAtivo?: PerfilUsuario;
}

export const ObraHeader: React.FC<ObraHeaderProps> = ({ obra, onEdit, onOpenRelatorio, perfilAtivo = 'construtor' }) => {
  const todasTarefas = obra.etapas.flatMap((e) => e.tarefas);
  const totalTarefas = todasTarefas.length;
  const concluidas = todasTarefas.filter((t) => t.concluida).length;
  const percentual = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

  const formatarData = (dataStr: string) => {
    if (!dataStr) return 'Não definida';
    try {
      const [ano, mes, dia] = dataStr.split('-');
      if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
      return dataStr;
    } catch {
      return dataStr;
    }
  };

  return (
    <div className="obra-header-panel">
      <div className="obra-header-top">
        <div className="obra-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: percentual === 100 ? '#16a34a' : 'var(--primary-accent)',
              }}
            >
              {percentual === 100 ? 'Obra Concluída' : 'Obra Ativa'}
            </span>
            <span style={{ color: 'var(--border-hairline)' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {obra.etapas.length} {obra.etapas.length === 1 ? 'etapa' : 'etapas'} no cronograma
            </span>
          </div>

          <h1 style={{ marginTop: 4 }}>{obra.nome}</h1>

          {/* Faixa de Metadados Diretos */}
          <div className="obra-meta-strip">
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
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {onOpenRelatorio && (
            <button
              onClick={onOpenRelatorio}
              className={percentual === 100 ? 'btn-primary' : 'btn-secondary'}
              title="Gerar relatório de conclusão da obra"
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FileText size={16} weight="bold" />
              <span>{percentual === 100 ? 'Relatório de Conclusão' : 'Relatório Final'}</span>
            </button>
          )}

          {perfilAtivo === 'construtor' ? (
            <button onClick={onEdit} className="btn-secondary" title="Editar dados da obra">
              <PencilSimple size={16} weight="bold" />
              <span>Editar Obra</span>
            </button>
          ) : (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--primary-accent)',
                background: 'var(--coral-glow-50)',
                border: '1px solid var(--coral-glow-200)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <User size={15} weight="bold" />
              <span>Acompanhamento do Cliente</span>
            </span>
          )}
        </div>
      </div>

      {/* Progresso Geral em Faixa Linear Integrada */}
      <div className="progress-strip-wrapper">
        <div className="progress-strip-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--text-body)' }}>
            <CheckCircle size={17} weight="fill" color="var(--primary-accent)" />
            <span>Avanço Físico</span>
          </div>
          <div>
            <strong style={{ color: 'var(--primary-accent)', fontSize: '1rem' }}>{percentual}%</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 6 }}>
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
