import React, { useState } from 'react';
import {
  X,
  FileText,
  DownloadSimple,
  EnvelopeSimple,
  PaperPlaneTilt,
  CheckSquare,
  Square,
  ShieldCheck,
  CheckCircle,
  CalendarCheck
} from '@phosphor-icons/react';
import { Obra } from '../types/obra';

interface ModalRelatorioObraProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  showToast: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ModalRelatorioObra: React.FC<ModalRelatorioObraProps> = ({
  isOpen,
  onClose,
  obra,
  showToast,
}) => {
  const [metodo, setMetodo] = useState<'download' | 'email'>('download');
  const [emailDestino, setEmailDestino] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');
  const [emailError, setEmailError] = useState('');

  // Seções a incluir
  const [incluirCronograma, setIncluirCronograma] = useState(true);
  const [incluirDiario, setIncluirDiario] = useState(true);
  const [incluirDecisoes, setIncluirDecisoes] = useState(true);
  const [incluirProjetos, setIncluirProjetos] = useState(true);
  const [incluirTermoEntrega, setIncluirTermoEntrega] = useState(true);

  if (!isOpen) return null;

  // Estatísticas rápidas da obra
  const totalTarefas = obra.etapas.flatMap((e) => e.tarefas).length;
  const concluidas = obra.etapas.flatMap((e) => e.tarefas).filter((t) => t.concluida).length;
  const percentual = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;
  const totalFotos = obra.etapas.flatMap((e) => e.tarefas).reduce((acc, t) => acc + (t.fotos?.length || 0), 0);
  const totalDecisoes = (obra.decisoes || []).length;
  const totalProjetos = (obra.projetos || []).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (metodo === 'email') {
      const emailLimpo = emailDestino.trim();
      if (!emailLimpo) {
        setEmailError('Por favor, informe o e-mail de destino.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLimpo)) {
        setEmailError('Por favor, insira um endereço de e-mail válido.');
        return;
      }
      setEmailError('');

      // Input pronto: confirmação do recebimento dos parâmetros
      showToast(
        'Solicitação de envio registrada!',
        `O envio do dossiê para ${emailLimpo} foi configurado com sucesso. (Fase 1 pronta)`,
        'success'
      );
      onClose();
    } else {
      // Input pronto para download
      showToast(
        'Solicitação de download registrada!',
        'Os parâmetros do relatório de conclusão foram configurados com sucesso. (Fase 1 pronta)',
        'success'
      );
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-relatorio-title"
      >
        {/* Header do Modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'var(--coral-glow-50)',
                color: 'var(--primary-accent)',
                padding: 8,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} weight="bold" />
            </div>
            <div>
              <h2 id="modal-relatorio-title" style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
                Relatório de Conclusão da Obra
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Dossiê consolidado de entrega técnica para o cliente ou arquivo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumo da Obra */}
        <div
          style={{
            background: 'var(--dark-coffee-50)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {obra.nome}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cliente: {obra.cliente} • {obra.etapas.length} etapas ({percentual}% concluído)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: percentual === 100 ? '#16a34a' : 'var(--primary-accent)',
                background: percentual === 100 ? '#dcfce7' : 'var(--coral-glow-100)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {percentual === 100 ? (
                <>
                  <CheckCircle size={14} weight="bold" /> Obra Concluída
                </>
              ) : (
                <>
                  <CalendarCheck size={14} weight="bold" /> {percentual}% Executado
                </>
              )}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Seletor do Modo de Destino */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
              Como deseja disponibilizar o relatório?
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setMetodo('download')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: metodo === 'download' ? '2px solid var(--primary-accent)' : '1px solid var(--border-hairline)',
                  background: metodo === 'download' ? 'var(--coral-glow-50)' : '#ffffff',
                  color: metodo === 'download' ? 'var(--primary-accent)' : 'var(--text-main)',
                  fontWeight: metodo === 'download' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <DownloadSimple size={18} weight={metodo === 'download' ? 'bold' : 'regular'} />
                <span>Disponibilizar Download</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodo('email')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: metodo === 'email' ? '2px solid var(--primary-accent)' : '1px solid var(--border-hairline)',
                  background: metodo === 'email' ? 'var(--coral-glow-50)' : '#ffffff',
                  color: metodo === 'email' ? 'var(--primary-accent)' : 'var(--text-main)',
                  fontWeight: metodo === 'email' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <EnvelopeSimple size={18} weight={metodo === 'email' ? 'bold' : 'regular'} />
                <span>Encaminhar por E-mail</span>
              </button>
            </div>
          </div>

          {/* Campo de E-mail (quando metodo === 'email') */}
          {metodo === 'email' && (
            <div style={{ marginBottom: 18, animation: 'fadeIn 0.2s ease-in-out' }}>
              <label
                htmlFor="relatorio-email-input"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}
              >
                E-mail do Destinatário *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="relatorio-email-input"
                  type="email"
                  value={emailDestino}
                  onChange={(e) => {
                    setEmailDestino(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="exemplo@cliente.com.br"
                  className="input-field"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    borderColor: emailError ? '#dc2626' : undefined,
                  }}
                  autoFocus
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <EnvelopeSimple size={16} />
                </div>
              </div>

              {emailError ? (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4, display: 'block' }}>
                  {emailError}
                </span>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  O destinatário receberá o relatório técnico completo da obra.
                </span>
              )}

              {/* Mensagem Opcional no E-mail */}
              <div style={{ marginTop: 12 }}>
                <label
                  htmlFor="relatorio-mensagem-input"
                  style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, marginBottom: 5, color: 'var(--text-main)' }}
                >
                  Mensagem adicional para o e-mail (opcional)
                </label>
                <textarea
                  id="relatorio-mensagem-input"
                  rows={2}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Ex: Segue o relatório final de entrega da sua obra com o diário fotográfico e termo de aceite..."
                  className="input-field"
                  style={{ width: '100%', resize: 'none', fontSize: '0.82rem' }}
                />
              </div>
            </div>
          )}

          {/* Responsável Técnico (Opcional) */}
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="relatorio-responsavel-input"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}
            >
              Responsável Técnico / CREA-CAU (opcional)
            </label>
            <input
              id="relatorio-responsavel-input"
              type="text"
              value={responsavelTecnico}
              onChange={(e) => setResponsavelTecnico(e.target.value)}
              placeholder="Ex: Eng. Responsável da Obra - CREA 12345/SP"
              className="input-field"
              style={{ width: '100%', fontSize: '0.84rem' }}
            />
          </div>

          {/* Seleção do Conteúdo do Dossiê */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
              Seções a incluir no Dossiê
            </label>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'var(--dark-coffee-50)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
              }}
            >
              {/* Item 1: Cronograma */}
              <div
                onClick={() => setIncluirCronograma(!incluirCronograma)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {incluirCronograma ? (
                    <CheckSquare size={18} weight="fill" color="var(--primary-accent)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                  <span>Cronograma físico com datas de conclusão</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {obra.etapas.length} etapas
                </span>
              </div>

              {/* Item 2: Diário Fotográfico */}
              <div
                onClick={() => setIncluirDiario(!incluirDiario)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {incluirDiario ? (
                    <CheckSquare size={18} weight="fill" color="var(--primary-accent)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                  <span>Diário fotográfico com observações</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {totalFotos} fotos
                </span>
              </div>

              {/* Item 3: Decisões e Aprovações */}
              <div
                onClick={() => setIncluirDecisoes(!incluirDecisoes)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {incluirDecisoes ? (
                    <CheckSquare size={18} weight="fill" color="var(--primary-accent)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                  <span>Decisões e aprovações com assinaturas digitais</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {totalDecisoes} decisões
                </span>
              </div>

              {/* Item 4: Projetos Técnicos */}
              <div
                onClick={() => setIncluirProjetos(!incluirProjetos)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {incluirProjetos ? (
                    <CheckSquare size={18} weight="fill" color="var(--primary-accent)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                  <span>Índice e revisões de projetos técnicos (PDF)</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {totalProjetos} pranchas
                </span>
              </div>

              {/* Item 5: Termo de Entrega */}
              <div
                onClick={() => setIncluirTermoEntrega(!incluirTermoEntrega)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {incluirTermoEntrega ? (
                    <CheckSquare size={18} weight="fill" color="var(--primary-accent)" />
                  ) : (
                    <Square size={18} color="var(--text-muted)" />
                  )}
                  <span>Termo de entrega de chaves e encerramento</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Assinatura
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação do Modal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 14,
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px' }}>
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '8px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {metodo === 'download' ? (
                <>
                  <DownloadSimple size={16} weight="bold" />
                  <span>Baixar Dossiê</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={16} weight="bold" />
                  <span>Encaminhar Dossiê</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
