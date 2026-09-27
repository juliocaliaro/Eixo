import React, { useEffect } from 'react';
import {
  Printer,
  DownloadSimple,
  ArrowLeft,
  X,
  CheckCircle,
  Clock,
  CalendarBlank,
  MapPin,
  User,
  Buildings,
  Scales,
  Camera,
  FilePdf,
  ShieldCheck,
  SealCheck,
  Check,
  NotePencil
} from '@phosphor-icons/react';
import { Obra } from '../types/obra';
import { getEtapaIcon } from '../utils/etapaIcons';
import { getTipoProjetoConfig, formatBytes } from '../utils/projetoConfig';

interface ModalPreviewRelatorioProps {
  isOpen: boolean;
  onClose: () => void;
  obra: Obra;
  autoPrint?: boolean;
}

export const ModalPreviewRelatorio: React.FC<ModalPreviewRelatorioProps> = ({
  isOpen,
  onClose,
  obra,
  autoPrint = false,
}) => {
  // Disparar a impressão nativa automaticamente caso solicitado (após breve delay para renderização completa)
  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) return null;

  // Cálculos de Indicadores da Obra
  const todasTarefas = obra.etapas.flatMap((e) => e.tarefas);
  const totalTarefas = todasTarefas.length;
  const concluidas = todasTarefas.filter((t) => t.concluida).length;
  const percentual = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

  // Contagem de Fotos e Anotações
  let totalFotos = 0;
  let totalNotas = 0;
  obra.etapas.forEach((etapa) => {
    etapa.tarefas.forEach((tarefa) => {
      if (tarefa.fotos) totalFotos += tarefa.fotos.length;
      if (tarefa.anotacoes) totalNotas += tarefa.anotacoes.length;
    });
  });
  (obra.anexosGerais || []).forEach((item) => {
    if (item.tipo === 'foto') totalFotos += 1;
    if (item.tipo === 'anotacao') totalNotas += 1;
  });

  const decisoes = obra.decisoes || [];
  const decisoesAprovadas = decisoes.filter((d) => d.status === 'aprovada');
  const projetos = obra.projetos || [];

  // Cálculos Financeiros
  const orcamentoInicial = obra.orcamentoInicial || 0;
  const totalAditivosAprovados = decisoesAprovadas
    .filter((d) => typeof d.impactoFinanceiro === 'number' && d.impactoFinanceiro > 0)
    .reduce((acc, d) => acc + (d.impactoFinanceiro || 0), 0);
  const investimentoTotal = orcamentoInicial + totalAditivosAprovados;

  // Nome da Empresa Cadastrada
  const nomeEmpresa =
    obra.empresaResponsavel && obra.empresaResponsavel.trim()
      ? obra.empresaResponsavel.trim()
      : typeof window !== 'undefined'
      ? localStorage.getItem('eixo_empresa_cadastrada') || 'Empresa Responsável'
      : 'Empresa Responsável';

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return 'Não informada';
    try {
      const [ano, mes, dia] = dataStr.split('-');
      if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
      const d = new Date(dataStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dataStr;
    }
  };

  const formatarDataHora = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const dataEmissaoHoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const horaEmissao = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relatorio-modal-overlay">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="relatorio-top-bar no-print">
        <div className="relatorio-top-bar-inner">
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.84rem' }}>
            <ArrowLeft size={16} weight="bold" />
            <span>Voltar à Obra</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Visualização para impressão A4 / PDF
            </span>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.86rem',
                boxShadow: '0 2px 8px rgba(242, 66, 13, 0.25)',
              }}
            >
              <Printer size={17} weight="bold" />
              <span>Imprimir / Salvar como PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-icon"
              title="Fechar"
              style={{ width: 34, height: 34, marginLeft: 6 }}
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Contêiner de Rolagem da Folha A4 */}
      <div className="relatorio-sheet-scroll">
        <div id="relatorio-print-container" className="relatorio-document">
          {/* ========================================================
              CABEÇALHO OFICIAL DO RELATÓRIO
             ======================================================== */}
          <header className="relatorio-doc-header print-avoid-break">
            <div className="relatorio-brand-strip">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src="/eixo-icon.jpg"
                  alt="Eixo"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    objectFit: 'cover',
                  }}
                />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#1a130a', lineHeight: 1.1 }}>
                    Eixo
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6e512b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Gestão Técnica de Obras & Reformas
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.70rem', textTransform: 'uppercase', color: '#6e512b', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Empresa Responsável
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a130a' }}>
                  {nomeEmpresa}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6e512b', marginTop: 2 }}>
                  Emissão: {dataEmissaoHoje} às {horaEmissao}
                </div>
              </div>
            </div>

            <div className="relatorio-title-banner">
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1a130a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {percentual === 100 ? 'Relatório de Conclusão da Obra' : 'Relatório Técnico de Andamento'}
              </h1>
              <div style={{ fontSize: '0.85rem', color: '#6e512b', marginTop: 4 }}>
                Consolidação oficial de cronograma executado, diário de canteiro, decisões assinadas e projetos técnicos
              </div>
            </div>

            {/* Metadados da Obra */}
            <div className="relatorio-meta-grid">
              <div className="relatorio-meta-box">
                <span className="relatorio-meta-label">Obra</span>
                <strong className="relatorio-meta-value">{obra.nome}</strong>
              </div>

              <div className="relatorio-meta-box">
                <span className="relatorio-meta-label">Cliente / Proprietário</span>
                <strong className="relatorio-meta-value">{obra.cliente}</strong>
              </div>

              <div className="relatorio-meta-box" style={{ gridColumn: 'span 2' }}>
                <span className="relatorio-meta-label">Localização</span>
                <span className="relatorio-meta-value" style={{ fontWeight: 500 }}>{obra.endereco}</span>
              </div>

              <div className="relatorio-meta-box">
                <span className="relatorio-meta-label">Previsão de Término</span>
                <strong className="relatorio-meta-value">{formatarData(obra.dataPrevista)}</strong>
              </div>

              <div className="relatorio-meta-box">
                <span className="relatorio-meta-label">Status da Obra</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    color: percentual === 100 ? '#16a34a' : '#d5aa2a',
                    fontSize: '0.88rem',
                  }}
                >
                  <CheckCircle size={15} weight="fill" />
                  <span>{percentual === 100 ? '100% Concluída' : `${percentual}% em Execução`}</span>
                </span>
              </div>

              {orcamentoInicial > 0 && (
                <div className="relatorio-meta-box" style={{ gridColumn: 'span 2' }}>
                  <span className="relatorio-meta-label">Resumo Financeiro Contratual</span>
                  <div style={{ fontSize: '0.86rem', color: '#1a130a' }}>
                    Orçamento Base: <strong>{formatarMoeda(orcamentoInicial)}</strong>
                    {totalAditivosAprovados > 0 && (
                      <span style={{ color: '#c2350a', marginLeft: 8 }}>
                        (+{formatarMoeda(totalAditivosAprovados)} em aditivos = <strong>{formatarMoeda(investimentoTotal)}</strong>)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resumo de Indicadores Técnicos */}
            <div className="relatorio-kpi-row">
              <div className="relatorio-kpi-item">
                <span className="relatorio-kpi-num">{percentual}%</span>
                <span className="relatorio-kpi-desc">Avanço Físico ({concluidas}/{totalTarefas} serviços)</span>
              </div>
              <div className="relatorio-kpi-item">
                <span className="relatorio-kpi-num">{obra.etapas.length}</span>
                <span className="relatorio-kpi-desc">Etapas Técnicas</span>
              </div>
              <div className="relatorio-kpi-item">
                <span className="relatorio-kpi-num">{decisoesAprovadas.length}</span>
                <span className="relatorio-kpi-desc">Decisões Assinadas</span>
              </div>
              <div className="relatorio-kpi-item">
                <span className="relatorio-kpi-num">{projetos.length}</span>
                <span className="relatorio-kpi-desc">Pranchas / Projetos</span>
              </div>
              <div className="relatorio-kpi-item">
                <span className="relatorio-kpi-num">{totalFotos}</span>
                <span className="relatorio-kpi-desc">Registros Fotográficos</span>
              </div>
              {orcamentoInicial > 0 && (
                <div className="relatorio-kpi-item">
                  <span className="relatorio-kpi-num" style={{ fontSize: '1.02rem' }}>{formatarMoeda(investimentoTotal)}</span>
                  <span className="relatorio-kpi-desc">Investimento Total</span>
                </div>
              )}
            </div>
          </header>

          {/* ========================================================
              CAPÍTULO 1: CRONOGRAMA FÍSICO CUMPRIDO
             ======================================================== */}
          <section className="relatorio-section">
            <div className="relatorio-section-header">
              <span className="relatorio-section-tag">Capítulo 01</span>
              <h2 className="relatorio-section-title">Cronograma Físico Cumprido & Checklist Técnico</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {obra.etapas.map((etapa, idx) => {
                const iconConfig = getEtapaIcon(etapa.nome, etapa.id);
                const tarefasEtapa = etapa.tarefas || [];
                const concluidasEtapa = tarefasEtapa.filter((t) => t.concluida).length;
                const percentualEtapa =
                  tarefasEtapa.length > 0 ? Math.round((concluidasEtapa / tarefasEtapa.length) * 100) : 0;

                return (
                  <div key={etapa.id} className="relatorio-etapa-card print-avoid-break">
                    <div className="relatorio-etapa-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="relatorio-step-num">{String(idx + 1).padStart(2, '0')}</span>
                        <strong style={{ fontSize: '0.94rem', color: '#1a130a' }}>{etapa.nome}</strong>
                        {etapa.tipoOrigem && (
                          <span className="relatorio-pill-tipo">{etapa.tipoOrigem}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6e512b', fontWeight: 600 }}>
                        {concluidasEtapa} de {tarefasEtapa.length} serviços ({percentualEtapa}%)
                      </div>
                    </div>

                    <table className="relatorio-table">
                      <thead>
                        <tr>
                          <th style={{ width: '90px' }}>Status</th>
                          <th>Serviço / Atividade Técnica</th>
                          <th style={{ width: '160px', textAlign: 'right' }}>Conclusão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tarefasEtapa.map((tarefa) => (
                          <tr key={tarefa.id} className={tarefa.concluida ? 'row-concluida' : 'row-pendente'}>
                            <td>
                              <span
                                className={`relatorio-status-badge ${
                                  tarefa.concluida ? 'badge-ok' : 'badge-pendente'
                                }`}
                              >
                                {tarefa.concluida ? '✓ Cumprido' : 'Pendente'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: tarefa.concluida ? 600 : 400, color: '#1a130a' }}>
                                {tarefa.nome}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6e512b' }}>
                              {tarefa.concluidaEm ? (
                                <span>{formatarDataHora(tarefa.concluidaEm)}</span>
                              ) : (
                                <span style={{ color: '#936c39' }}>Em andamento</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================
              CAPÍTULO 2: DIÁRIO FOTOGRÁFICO & EVIDÊNCIAS DE CANTEIRO
             ======================================================== */}
          <section className="relatorio-section">
            <div className="relatorio-section-header">
              <span className="relatorio-section-tag">Capítulo 02</span>
              <h2 className="relatorio-section-title">Diário de Obras & Evidências Fotográficas do Canteiro</h2>
              <p className="relatorio-section-desc">
                Registro comprobatório das atividades executadas, fotos de detalhes técnicos e anotações da equipe
              </p>
            </div>

            {totalFotos === 0 && totalNotas === 0 ? (
              <div className="relatorio-empty-box print-avoid-break">
                Nenhum registro fotográfico ou anotação anexada a esta obra.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {obra.etapas.map((etapa) => {
                  const tarefasComRegistro = etapa.tarefas.filter(
                    (t) => (t.fotos && t.fotos.length > 0) || (t.anotacoes && t.anotacoes.length > 0)
                  );
                  if (tarefasComRegistro.length === 0) return null;

                  return (
                    <div key={etapa.id} className="relatorio-diario-etapa print-avoid-break">
                      <div className="relatorio-diario-etapa-title">
                        <span style={{ color: '#c2350a', fontWeight: 800 }}>•</span>
                        <strong>Etapa: {etapa.nome}</strong>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tarefasComRegistro.map((tarefa) => (
                          <div key={tarefa.id} className="relatorio-diario-tarefa-box print-avoid-break">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1a130a' }}>
                                Serviço: {tarefa.nome}
                              </span>
                              {tarefa.concluidaEm && (
                                <span style={{ fontSize: '0.74rem', color: '#6e512b' }}>
                                  {formatarDataHora(tarefa.concluidaEm)}
                                </span>
                              )}
                            </div>

                            {/* Anotações Técnicas */}
                            {tarefa.anotacoes && tarefa.anotacoes.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                {tarefa.anotacoes.map((nota, nIdx) => (
                                  <div key={nIdx} className="relatorio-nota-quote">
                                    <NotePencil size={13} style={{ flexShrink: 0, marginTop: 2, color: '#936c39' }} />
                                    <span>"{nota}"</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Grade de Fotos */}
                            {tarefa.fotos && tarefa.fotos.length > 0 && (
                              <div className="relatorio-fotos-grid">
                                {tarefa.fotos.map((foto, fIdx) => (
                                  <div key={fIdx} className="relatorio-foto-item">
                                    <img src={foto} alt={`Registro ${fIdx + 1}`} className="relatorio-foto-img" />
                                    <span className="relatorio-foto-caption">Registro {fIdx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Anexos Gerais */}
                {obra.anexosGerais && obra.anexosGerais.length > 0 && (
                  <div className="relatorio-diario-etapa print-avoid-break">
                    <div className="relatorio-diario-etapa-title">
                      <span style={{ color: '#c2350a', fontWeight: 800 }}>•</span>
                      <strong>Registros Gerais da Obra</strong>
                    </div>

                    <div className="relatorio-fotos-grid">
                      {obra.anexosGerais.map((anexo) => (
                        <div key={anexo.id} className="relatorio-diario-tarefa-box print-avoid-break">
                          <strong style={{ fontSize: '0.84rem', color: '#1a130a', display: 'block', marginBottom: 4 }}>
                            {anexo.titulo}
                          </strong>
                          {anexo.tipo === 'foto' ? (
                            <img src={anexo.conteudo} alt={anexo.titulo} className="relatorio-foto-img" style={{ maxHeight: 180, width: '100%', objectFit: 'cover', borderRadius: 6 }} />
                          ) : (
                            <div className="relatorio-nota-quote">"{anexo.conteudo}"</div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#6e512b', marginTop: 4 }}>
                            {formatarData(anexo.data)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ========================================================
              CAPÍTULO 3: DECISÕES & ASSINATURA DIGITAL BILATERAL
             ======================================================== */}
          <section className="relatorio-section">
            <div className="relatorio-section-header">
              <span className="relatorio-section-tag">Capítulo 03</span>
              <h2 className="relatorio-section-title">Registro Oficial de Decisões & Aprovações Bilaterais</h2>
              <p className="relatorio-section-desc">
                Histórico de alinhamentos e alterações aprovadas com carimbos e validade de assinatura digital
              </p>
            </div>

            {(orcamentoInicial > 0 || totalAditivosAprovados > 0) && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {orcamentoInicial > 0 && (
                  <div style={{ padding: '8px 12px', background: '#f8f3ed', border: '1px solid #e2cfb6', borderRadius: 6, fontSize: '0.80rem' }}>
                    <span style={{ color: '#6e512b', display: 'block', fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: 700 }}>Orçamento Base</span>
                    <strong style={{ color: '#1a130a' }}>{formatarMoeda(orcamentoInicial)}</strong>
                  </div>
                )}
                {totalAditivosAprovados > 0 && (
                  <div style={{ padding: '8px 12px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '0.80rem' }}>
                    <span style={{ color: '#16a34a', display: 'block', fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: 700 }}>Aditivos Aprovados</span>
                    <strong style={{ color: '#16a34a' }}>+{formatarMoeda(totalAditivosAprovados)}</strong>
                  </div>
                )}
                <div style={{ padding: '8px 12px', background: '#fff1ec', border: '1px solid #fbc9b7', borderRadius: 6, fontSize: '0.80rem' }}>
                  <span style={{ color: '#c2350a', display: 'block', fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Investimento</span>
                  <strong style={{ color: '#c2350a' }}>{formatarMoeda(investimentoTotal)}</strong>
                </div>
              </div>
            )}

            {decisoes.length === 0 ? (
              <div className="relatorio-empty-box print-avoid-break">
                Nenhuma decisão formal registrada durante o período da obra.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {decisoes.map((decisao) => {
                  const isAprovada = decisao.status === 'aprovada';

                  return (
                    <div key={decisao.id} className="relatorio-decisao-card print-avoid-break">
                      <div className="relatorio-decisao-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span className="relatorio-pill-cat">{decisao.categoria.toUpperCase()}</span>
                            <span
                              className={`relatorio-status-badge ${
                                isAprovada ? 'badge-ok' : decisao.status === 'pendente' ? 'badge-pendente' : 'badge-danger'
                              }`}
                            >
                              {isAprovada ? '✓ Aprovada por Ambos' : decisao.status === 'pendente' ? 'Pendente' : 'Recusada'}
                            </span>
                          </div>
                          <strong style={{ fontSize: '0.96rem', color: '#1a130a' }}>{decisao.titulo}</strong>
                        </div>

                        {/* Impactos */}
                        <div style={{ textAlign: 'right', fontSize: '0.80rem' }}>
                          {decisao.impactoFinanceiro !== undefined && (
                            <div style={{ fontWeight: 700, color: decisao.impactoFinanceiro > 0 ? '#b91c1c' : '#16a34a' }}>
                              {decisao.impactoFinanceiro > 0 ? `+ ${formatarMoeda(decisao.impactoFinanceiro)}` : 'Sem custo adicional'}
                            </div>
                          )}
                          {decisao.impactoPrazoDias !== undefined && (
                            <div style={{ color: '#6e512b', fontSize: '0.74rem' }}>
                              {decisao.impactoPrazoDias > 0 ? `+ ${decisao.impactoPrazoDias} dias no prazo` : 'Sem alteração de prazo'}
                            </div>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.84rem', color: '#49361d', margin: '8px 0', lineHeight: 1.45 }}>
                        {decisao.descricao}
                      </p>

                      {/* Fotos da Decisão */}
                      {decisao.fotos && decisao.fotos.length > 0 && (
                        <div className="relatorio-fotos-grid" style={{ marginBottom: 10 }}>
                          {decisao.fotos.map((f, i) => (
                            <div key={i} className="relatorio-foto-item">
                              <img src={f} alt={`Amostra ${i + 1}`} className="relatorio-foto-img" style={{ maxHeight: 110 }} />
                              <span className="relatorio-foto-caption">Amostra {i + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Carimbos de Assinatura Digital Bilateral */}
                      <div className="relatorio-carimbos-row">
                        {/* Assinatura Proponente */}
                        <div className="relatorio-carimbo-box">
                          <SealCheck size={16} weight="fill" color="#16a34a" />
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#1a130a' }}>
                              {decisao.assinaturaCriador?.autor === 'construtor' ? 'Assinatura: Construtor Responsável' : 'Assinatura: Cliente'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#49361d' }}>
                              {decisao.assinaturaCriador?.nomeSignatario || decisao.criadorNome}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#6e512b' }}>
                              {formatarDataHora(decisao.assinaturaCriador?.assinadoEm || decisao.criadaEm)}
                            </div>
                          </div>
                        </div>

                        {/* Assinatura Contraparte */}
                        {decisao.assinaturaContraparte ? (
                          <div className="relatorio-carimbo-box">
                            <SealCheck size={16} weight="fill" color="#16a34a" />
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#1a130a' }}>
                                {decisao.assinaturaContraparte.autor === 'cliente' ? 'Assinatura: Cliente (Aceite)' : 'Assinatura: Construtor (Aceite)'}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#49361d' }}>
                                {decisao.assinaturaContraparte.nomeSignatario}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#6e512b' }}>
                                {formatarDataHora(decisao.assinaturaContraparte.assinadoEm)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relatorio-carimbo-box pendente">
                            <Clock size={15} color="#936c39" />
                            <div style={{ fontSize: '0.72rem', color: '#6e512b' }}>
                              Aguardando assinatura da contraparte
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ========================================================
              CAPÍTULO 4: PROJETOS TÉCNICOS & PRANCHAS EM PDF
             ======================================================== */}
          <section className="relatorio-section">
            <div className="relatorio-section-header">
              <span className="relatorio-section-tag">Capítulo 04</span>
              <h2 className="relatorio-section-title">Pranchas e Projetos Executivos em PDF</h2>
              <p className="relatorio-section-desc">
                Relação de projetos de engenharia e arquitetura vinculados ao canteiro de obras
              </p>
            </div>

            {projetos.length === 0 ? (
              <div className="relatorio-empty-box print-avoid-break">
                Nenhum projeto em PDF anexado ao repositório técnico desta obra.
              </div>
            ) : (
              <div className="relatorio-table-container print-avoid-break">
                <table className="relatorio-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Disciplina</th>
                      <th>Título da Prancha / Descrição</th>
                      <th style={{ width: '100px' }}>Revisão</th>
                      <th style={{ width: '180px' }}>Arquivo & Tamanho</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Data Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projetos.map((proj) => {
                      const config = getTipoProjetoConfig(proj.tipo, proj.tipoCustomizado);
                      return (
                        <tr key={proj.id}>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: 4,
                                background: config.bg,
                                color: config.color,
                                border: `1px solid ${config.border}`,
                              }}
                            >
                              {config.label}
                            </span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '0.84rem', color: '#1a130a', display: 'block' }}>
                              {proj.titulo}
                            </strong>
                            {proj.descricao && (
                              <span style={{ fontSize: '0.74rem', color: '#6e512b' }}>{proj.descricao}</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.76rem', color: '#49361d' }}>
                            {proj.versao || 'Original'}
                          </td>
                          <td style={{ fontSize: '0.74rem', color: '#6e512b' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <FilePdf size={13} color="#b91c1c" weight="fill" />
                              <span style={{ color: '#1a130a', fontWeight: 600 }}>{proj.arquivoNome}</span>
                            </div>
                            <div>{formatBytes(proj.tamanhoBytes)}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '0.74rem', color: '#6e512b' }}>
                            {formatarData(proj.dataUpload)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ========================================================
              CAPÍTULO 5: TERMO DE CONCLUSÃO & ENTREGA TÉCNICA
             ======================================================== */}
          <section className="relatorio-section print-avoid-break">
            <div className="relatorio-section-header">
              <span className="relatorio-section-tag">Capítulo 05</span>
              <h2 className="relatorio-section-title">Termo de Conclusão & Entrega Técnica</h2>
            </div>

            <div className="relatorio-termo-box">
              <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: '#251b0e', margin: 0 }}>
                Declaramos que os serviços e etapas constantes neste documento técnico foram executados em estrita
                observância aos projetos, especificações e alinhamentos validados bilateralmente entre as partes na plataforma Eixo.
                O presente relatório consolida o histórico integral físico, fotográfico e de decisões técnicas da obra.
              </p>

              {/* Checklist de Vistoria Final / Punch List */}
              {obra.punchList && obra.punchList.length > 0 && (
                <div style={{ margin: '18px 0', borderTop: '1px solid #e2cfb6', paddingTop: 14 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a130a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} weight="fill" color="#16a34a" />
                    <span>Checklist de Vistoria Final & Retoques (Punch List)</span>
                  </div>
                  <table className="relatorio-table">
                    <thead>
                      <tr>
                        <th style={{ width: '85px' }}>Status</th>
                        <th>Item Vistoriado / Retoque</th>
                        <th style={{ width: '130px' }}>Ambiente</th>
                        <th style={{ width: '150px', textAlign: 'right' }}>Validação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obra.punchList.map((item) => (
                        <tr key={item.id} className={item.concluido ? 'row-concluida' : 'row-pendente'}>
                          <td>
                            <span className={`relatorio-status-badge ${item.concluido ? 'badge-ok' : 'badge-pendente'}`}>
                              {item.concluido ? '✓ OK' : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            <strong style={{ fontSize: '0.82rem', color: '#1a130a' }}>{item.item}</strong>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#49361d' }}>
                            {item.ambiente || 'Geral'}
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '0.74rem', color: '#6e512b' }}>
                            {item.concluidoEm ? formatarDataHora(item.concluidoEm) : 'Pendente'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="relatorio-assinaturas-grid">
                <div className="relatorio-linha-assinatura">
                  <div className="relatorio-linha" />
                  <strong style={{ fontSize: '0.86rem', color: '#1a130a', display: 'block' }}>
                    {nomeEmpresa}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#6e512b' }}>
                    Empresa Responsável pela Execução
                  </span>
                </div>

                <div className="relatorio-linha-assinatura">
                  <div className="relatorio-linha" />
                  <strong style={{ fontSize: '0.86rem', color: '#1a130a', display: 'block' }}>
                    {obra.cliente}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#6e512b' }}>
                    Cliente / Proprietário(a)
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#6e512b', marginTop: 18, borderTop: '1px solid #e2cfb6', paddingTop: 10 }}>
                Emitido eletronicamente pela plataforma <strong>Eixo</strong> • Data: {dataEmissaoHoje}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
