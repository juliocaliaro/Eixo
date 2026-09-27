import React, { useState } from 'react';
import {
  HardHat,
  Plus,
  Buildings,
  MapPin,
  CalendarBlank,
  User,
  ArrowRight,
  Trash,
  CheckCircle,
  Clock,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { ModalConfirm } from './ModalConfirm';
import { calcularTermometroPrazo } from '../utils/cronogramaTermometro';

interface ObraListProps {
  obras: Obra[];
  onSelectObra: (obraId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteObra: (obraId: string) => void;
  onLoadDemo?: () => void;
  perfilAtivo?: PerfilUsuario;
  onOpenSettings?: () => void;
}

export const ObraList: React.FC<ObraListProps> = ({
  obras,
  onSelectObra,
  onOpenCreateModal,
  onDeleteObra,
  onLoadDemo,
  perfilAtivo = 'construtor',
  onOpenSettings,
}) => {
  const [deleteObraTarget, setDeleteObraTarget] = useState<{ id: string; nome: string } | null>(null);
  // Empty State com âncora visual fotográfica forte (conforme frontend-skill)
  if (obras.length === 0) {
    return (
      <div>
        <div className="hero-visual-anchor">
          <img
            src="https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=1600&auto=format&fit=crop&q=80"
            alt="Canteiro de obras moderno"
            className="hero-visual-bg"
          />
          <div className="hero-visual-overlay" />
          <div className="hero-visual-content">
            <span className="hero-tag">Gestão de Obras & Reformas</span>
            <h1 className="hero-title">Eixo</h1>
            <p className="hero-description">
              Acompanhamento transparente de cronogramas, evidências de canteiro e decisões com assinatura bilateral.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {perfilAtivo !== 'cliente' && (
                <button
                  onClick={onOpenCreateModal}
                  className="btn-primary"
                  style={{ padding: '12px 22px', fontSize: '0.96rem' }}
                >
                  <Plus size={20} weight="bold" />
                  <span>Cadastrar Primeira Obra</span>
                </button>
              )}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className="btn-secondary"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    padding: '12px 20px',
                    fontSize: '0.96rem',
                  }}
                >
                  <span>Explorar Obra Demonstrativa</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informações utilitárias concisas sobre o fluxo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            paddingTop: 8,
          }}
        >
          <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              1. Estruturação Rápida
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Selecione pacotes prontos de Construção ou Reforma com etapas técnicas catalogadas.
            </p>
          </div>
          <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              2. Checklist Diário
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Marque o avanço de cada serviço e registre fotos do canteiro para o cliente.
            </p>
          </div>
          <div style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              3. Medição de Avanço
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Cálculo ponderado transparente do progresso físico total da obra em tempo real.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Lista de Obras: Cardless com Divisores e Escaneabilidade Imediata
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            {perfilAtivo === 'cliente' ? 'Obras em Acompanhamento' : 'Obras em Andamento'}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {obras.length} {obras.length === 1 ? 'projeto ativo' : 'projetos ativos'}
          </p>
        </div>

        {perfilAtivo !== 'cliente' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="btn-secondary"
                title="Personalizar modelos padrão de etapas e tarefas"
              >
                <SlidersHorizontal size={17} weight="bold" />
                <span>Modelos de Obra</span>
              </button>
            )}
            <button onClick={onOpenCreateModal} className="btn-primary">
              <Plus size={18} weight="bold" />
              <span>Nova Obra</span>
            </button>
          </div>
        )}
      </div>

      <div className="cardless-section">
        {obras.map((obra) => {
          const todasTarefas = obra.etapas.flatMap((e) => e.tarefas);
          const totalTarefas = todasTarefas.length;
          const concluidas = todasTarefas.filter((t) => t.concluida).length;
          const percentual = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;
          const termometro = calcularTermometroPrazo(obra.criadaEm, obra.dataPrevista, percentual);

          return (
            <div
              key={obra.id}
              className="cardless-row"
              onClick={() => onSelectObra(obra.id)}
            >
              {/* Identificação da Obra */}
              <div style={{ minWidth: '220px', flex: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: 'var(--text-main)',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {obra.nome}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--dark-coffee-100)',
                      color: 'var(--dark-coffee-800)',
                    }}
                  >
                    {obra.etapas.length} etapas
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: termometro.bg,
                      color: termometro.cor,
                      border: `1px solid ${termometro.border}`,
                    }}
                    title={termometro.descricao}
                  >
                    {termometro.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>Cliente: <strong style={{ color: 'var(--text-body)' }}>{obra.cliente}</strong></span>
                  <span>•</span>
                  <span>{obra.endereco}</span>
                </div>
              </div>

              {/* Data Prevista */}
              <div style={{ minWidth: '130px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Previsão
                </span>
                <strong style={{ color: 'var(--text-body)' }}>
                  {obra.dataPrevista ? obra.dataPrevista.split('-').reverse().join('/') : 'Não informada'}
                </strong>
              </div>

              {/* Barra de Progresso Compacta */}
              <div style={{ minWidth: '160px', flex: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                  <strong style={{ color: 'var(--primary-accent)' }}>{percentual}%</strong>
                </div>
                <div className="progress-strip-track" style={{ height: 5 }}>
                  <div className="progress-strip-bar" style={{ width: `${percentual}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>{concluidas}/{totalTarefas} serviços</span>
                  {termometro.status !== 'concluida' && termometro.diasRestantes > 0 && (
                    <span>{termometro.diasRestantes}d restantes</span>
                  )}
                  {termometro.status === 'vencido' && termometro.diasAtraso && (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{termometro.diasAtraso}d atraso</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {perfilAtivo !== 'cliente' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteObraTarget({ id: obra.id, nome: obra.nome });
                    }}
                    className="btn-icon"
                    style={{ color: 'var(--text-muted)' }}
                    title="Excluir obra"
                  >
                    <Trash size={15} />
                  </button>
                )}
                <div style={{ color: 'var(--primary-accent)', display: 'flex', alignItems: 'center' }}>
                  <ArrowRight size={18} weight="bold" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {deleteObraTarget && (
        <ModalConfirm
          isOpen={true}
          title="Excluir Obra"
          message={`Tem certeza que deseja excluir "${deleteObraTarget.nome}"? Todos os dados, etapas e fotos serão removidos.`}
          confirmText="Sim, excluir obra"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDeleteObra(deleteObraTarget.id);
            setDeleteObraTarget(null);
          }}
          onCancel={() => setDeleteObraTarget(null)}
        />
      )}
    </div>
  );
};
