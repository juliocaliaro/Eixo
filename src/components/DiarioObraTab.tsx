import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  CheckCircle,
  Clock,
  SealCheck,
  XCircle,
  Camera,
  NotePencil,
  Kanban,
  MagnifyingGlass,
  Plus,
  ArrowRight,
  CurrencyDollar,
  X,
  Eye,
  CalendarBlank,
  Buildings,
  ShareNetwork,
  Scales,
  Funnel,
  Check,
  Package,
  Receipt,
  CaretDown,
} from '@phosphor-icons/react';
import { Obra, Tarefa, Etapa, Decisao, AnexoItem, PerfilUsuario, PunchListItem, RegistroMaterial, RegistroNota } from '../types/obra';
import { getEtapaIcon } from '../utils/etapaIcons';
import { formatarMoeda } from '../utils/moeda';

export interface DiarioEntry {
  id: string;
  dataHora: string; // ISO string
  dataKey: string; // YYYY-MM-DD
  tipo:
    | 'servico_concluido'
    | 'etapa_concluida'
    | 'decisao_criada'
    | 'decisao_aprovada'
    | 'decisao_recusada'
    | 'evidencia_tarefa'
    | 'anexo_geral'
    | 'vistoria_concluida'
    | 'material_registrado'
    | 'nota_registrada';
  categoria: 'etapa' | 'decisao' | 'evidencia' | 'financeiro' | 'material' | 'nota';
  titulo: string;
  subtitulo?: string;
  descricao?: string;
  autorNome?: string;
  autorPerfil?: PerfilUsuario;
  impactoFinanceiro?: number;
  valorAditivo?: number;
  valorSupressivo?: number;
  fotos?: string[];
  anotacoes?: string[];
  etapaId?: string;
  etapaNome?: string;
  tarefaId?: string;
  decisaoId?: string;
}

interface DiarioObraTabProps {
  obra: Obra;
  perfilAtivo?: PerfilUsuario;
  onAddAnexoGeral?: (anexo: Omit<AnexoItem, 'id' | 'data'>) => void;
  onDeleteAnexo?: (anexoId: string) => void;
  onNavigateToTask?: (etapaId: string, tarefaId: string) => void;
  onNavigateToDecisoes?: () => void;
  onUpdateTaskMedia?: (etapaId: string, tarefaId: string, fotos: string[], anotacoes: string[]) => void;
}

export const DiarioObraTab: React.FC<DiarioObraTabProps> = ({
  obra,
  perfilAtivo = 'construtor',
  onAddAnexoGeral,
  onNavigateToTask,
  onNavigateToDecisoes,
  onUpdateTaskMedia,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState<'todos' | 'hoje' | '7dias' | '30dias' | 'intervalo'>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);

  // Accordion Mobile
  const [expandedMobileIds, setExpandedMobileIds] = useState<Record<string, boolean>>({});

  const toggleMobileExpand = (id: string) => {
    setExpandedMobileIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Lightbox
  const [selectedImageModal, setSelectedImageModal] = useState<{
    url: string;
    titulo: string;
    subtitulo?: string;
  } | null>(null);

  // Modal Novo Registro de Diário
  const [isNovoRegistroOpen, setIsNovoRegistroOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState<'foto' | 'anotacao'>('foto');
  const [novoDestino, setNovoDestino] = useState<'geral' | 'tarefa'>('geral');
  const [novaEtapaId, setNovaEtapaId] = useState<string>(obra.etapas[0]?.id || '');
  const [novaTarefaId, setNovaTarefaId] = useState<string>('');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novaFotoPreview, setNovaFotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fechar popups de busca e filtro ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (filterContainerRef.current && !filterContainerRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listener para fechar modais, popups e lightbox via tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImageModal) setSelectedImageModal(null);
        if (isNovoRegistroOpen) setIsNovoRegistroOpen(false);
        if (isFilterOpen) setIsFilterOpen(false);
        if (isSearchOpen) setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageModal, isNovoRegistroOpen, isFilterOpen, isSearchOpen]);

  // Função auxiliar para extrair chave de data YYYY-MM-DD
  const extrairDataKey = (isoStr?: string): string => {
    if (!isoStr) return new Date().toISOString().split('T')[0];
    try {
      if (isoStr.includes('T')) return isoStr.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return isoStr;
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return new Date().toISOString().split('T')[0];
  };

  // Função para formatar o cabeçalho do dia
  const formatarHeaderDia = (dataKey: string): string => {
    try {
      const [ano, mes, dia] = dataKey.split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, dia);

      const hoje = new Date();
      const hojeKey = hoje.toISOString().split('T')[0];

      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const ontemKey = ontem.toISOString().split('T')[0];

      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      };
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', options);

      if (dataKey === hojeKey) {
        return `Hoje • ${dataFormatada}`;
      }
      if (dataKey === ontemKey) {
        return `Ontem • ${dataFormatada}`;
      }

      const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
      const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
      return `${dataFormatada} (${diaSemanaCap})`;
    } catch {
      return dataKey;
    }
  };

  const formatarHora = (isoStr?: string): string => {
    if (!isoStr) return '--:--';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // 1. Consolidação e Normalização de Todos os Lançamentos do Diário de Obra
  const todosLancamentos: DiarioEntry[] = useMemo(() => {
    const entries: DiarioEntry[] = [];
    const obraCriadaEm = obra.criadaEm || new Date().toISOString();

    // A) Serviços Concluídos e Evidências das Etapas
    (obra.etapas || []).forEach((etapa) => {
      (etapa.tarefas || []).forEach((tarefa) => {
        const temFotos = Boolean(tarefa.fotos && tarefa.fotos.length > 0);
        const temNotas = Boolean(tarefa.anotacoes && tarefa.anotacoes.length > 0);

        if (tarefa.concluida) {
          const timestamp = tarefa.concluidaEm || obraCriadaEm;
          entries.push({
            id: `entry_task_done_${tarefa.id}`,
            dataHora: timestamp,
            dataKey: extrairDataKey(timestamp),
            tipo: 'servico_concluido',
            categoria: 'etapa',
            titulo: tarefa.nome,
            subtitulo: `Etapa: ${etapa.nome}`,
            fotos: tarefa.fotos,
            anotacoes: tarefa.anotacoes,
            etapaId: etapa.id,
            etapaNome: etapa.nome,
            tarefaId: tarefa.id,
          });
        } else if (temFotos || temNotas) {
          // Tarefa em andamento com registros fotográficos ou notas de campo
          const timestamp = obraCriadaEm;
          entries.push({
            id: `entry_task_evid_${tarefa.id}`,
            dataHora: timestamp,
            dataKey: extrairDataKey(timestamp),
            tipo: 'evidencia_tarefa',
            categoria: 'evidencia',
            titulo: `Registro de Campo: ${tarefa.nome}`,
            subtitulo: `Etapa: ${etapa.nome} (Em andamento)`,
            fotos: tarefa.fotos,
            anotacoes: tarefa.anotacoes,
            etapaId: etapa.id,
            etapaNome: etapa.nome,
            tarefaId: tarefa.id,
          });
        }
      });

      // Etapa Concluída por Completo
      if (etapa.concluidaEm) {
        entries.push({
          id: `entry_etapa_done_${etapa.id}`,
          dataHora: etapa.concluidaEm,
          dataKey: extrairDataKey(etapa.concluidaEm),
          tipo: 'etapa_concluida',
          categoria: 'etapa',
          titulo: `Etapa Finalizada: ${etapa.nome}`,
          subtitulo: `${(etapa.tarefas || []).length} serviços concluídos`,
          etapaId: etapa.id,
          etapaNome: etapa.nome,
        });
      }
    });

    // B) Decisões & Aprovações Bilaterais
    (obra.decisoes || []).forEach((decisao) => {
      const temImpactoFinanceiro =
        decisao.valorAditivo !== undefined ||
        decisao.valorSupressivo !== undefined ||
        (decisao.impactoFinanceiro !== undefined && decisao.impactoFinanceiro !== 0);

      // Decisão Aprovada & Assinada
      if (decisao.status === 'aprovada') {
        const timestamp = decisao.assinaturaContraparte?.assinadoEm || decisao.criadaEm;
        entries.push({
          id: `entry_decisao_app_${decisao.id}`,
          dataHora: timestamp,
          dataKey: extrairDataKey(timestamp),
          tipo: 'decisao_aprovada',
          categoria: temImpactoFinanceiro ? 'financeiro' : 'decisao',
          titulo: decisao.titulo,
          subtitulo: `Aprovada por Ambos • Criada por ${decisao.criadorNome} (${decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente'})`,
          descricao: decisao.descricao,
          autorNome: decisao.criadorNome,
          autorPerfil: decisao.criadaPor,
          impactoFinanceiro: decisao.impactoFinanceiro,
          valorAditivo: decisao.valorAditivo,
          valorSupressivo: decisao.valorSupressivo,
          fotos: decisao.fotos,
          decisaoId: decisao.id,
        });
      } else if (decisao.status === 'recusada') {
        const timestamp = decisao.criadaEm;
        entries.push({
          id: `entry_decisao_rec_${decisao.id}`,
          dataHora: timestamp,
          dataKey: extrairDataKey(timestamp),
          tipo: 'decisao_recusada',
          categoria: 'decisao',
          titulo: `Decisão Recusada: ${decisao.titulo}`,
          subtitulo: `Solicitado ajuste pela contraparte`,
          descricao: decisao.descricao,
          autorNome: decisao.criadorNome,
          autorPerfil: decisao.criadaPor,
          fotos: decisao.fotos,
          decisaoId: decisao.id,
        });
      } else {
        // Decisão Pendente de Assinatura
        entries.push({
          id: `entry_decisao_pen_${decisao.id}`,
          dataHora: decisao.criadaEm,
          dataKey: extrairDataKey(decisao.criadaEm),
          tipo: 'decisao_criada',
          categoria: temImpactoFinanceiro ? 'financeiro' : 'decisao',
          titulo: `Proposta de Decisão: ${decisao.titulo}`,
          subtitulo: `Registrada por ${decisao.criadorNome} (${decisao.criadaPor === 'construtor' ? 'Construtor' : 'Cliente'}) • Aguardando Assinatura`,
          descricao: decisao.descricao,
          autorNome: decisao.criadorNome,
          autorPerfil: decisao.criadaPor,
          impactoFinanceiro: decisao.impactoFinanceiro,
          valorAditivo: decisao.valorAditivo,
          valorSupressivo: decisao.valorSupressivo,
          fotos: decisao.fotos,
          decisaoId: decisao.id,
        });
      }
    });

    // C) Anotações e Fotos Gerais do Diário
    (obra.anexosGerais || []).forEach((anexo) => {
      const timestamp = anexo.data || obraCriadaEm;
      entries.push({
        id: `entry_anexo_geral_${anexo.id}`,
        dataHora: timestamp,
        dataKey: extrairDataKey(timestamp),
        tipo: 'anexo_geral',
        categoria: 'evidencia',
        titulo: anexo.titulo || (anexo.tipo === 'foto' ? 'Foto Geral da Obra' : 'Nota de Diário'),
        subtitulo: 'Registro Geral de Canteiro',
        descricao: anexo.tipo === 'anotacao' ? anexo.conteudo : undefined,
        fotos: anexo.tipo === 'foto' ? [anexo.conteudo] : undefined,
      });
    });

    // D) Itens de Vistoria Final Concluídos
    (obra.punchList || []).forEach((item) => {
      if (item.concluido && item.concluidoEm) {
        entries.push({
          id: `entry_punch_${item.id}`,
          dataHora: item.concluidoEm,
          dataKey: extrairDataKey(item.concluidoEm),
          tipo: 'vistoria_concluida',
          categoria: 'etapa',
          titulo: `Vistoria Final: ${item.item}`,
          subtitulo: `Ambiente: ${item.ambiente || 'Geral'} • Validado`,
        });
      }
    });

    // E) Registros de Notas
    (obra.notas || []).forEach((nota) => {
      const timestamp = nota.criadoEm || obraCriadaEm;
      entries.push({
        id: `entry_nota_${nota.id}`,
        dataHora: timestamp,
        dataKey: extrairDataKey(timestamp),
        tipo: 'nota_registrada',
        categoria: 'nota',
        titulo: nota.titulo || 'Nota Fiscal / Recibo',
        subtitulo: 'Nota Anexada',
        descricao: nota.observacoes,
        fotos: nota.fotos,
      });
    });

    // Compatibilidade com materiais legados existentes
    (obra.materiais || []).forEach((material) => {
      const timestamp = material.criadoEm || obraCriadaEm;
      entries.push({
        id: `entry_material_${material.id}`,
        dataHora: timestamp,
        dataKey: extrairDataKey(timestamp),
        tipo: 'nota_registrada',
        categoria: 'nota',
        titulo: material.nome,
        subtitulo: material.status !== 'Materiais' ? material.status : 'Nota Anexada',
        descricao: material.observacoes,
        fotos: material.fotos,
      });
    });

    return entries;
  }, [obra]);

  // 2. Filtragem dos Lançamentos (Período e Busca Textual)
  const lancamentosFiltrados = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return todosLancamentos.filter((entry) => {
      // Filtro de Período (Hoje, 7 dias, 30 dias, Intervalo)
      if (periodoFiltro === 'hoje') {
        const hojeKey = new Date().toISOString().split('T')[0];
        if (entry.dataKey !== hojeKey) return false;
      } else if (periodoFiltro === '7dias') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const d7Key = d7.toISOString().split('T')[0];
        if (entry.dataKey < d7Key) return false;
      } else if (periodoFiltro === '30dias') {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const d30Key = d30.toISOString().split('T')[0];
        if (entry.dataKey < d30Key) return false;
      } else if (periodoFiltro === 'intervalo') {
        if (dataInicio && entry.dataKey < dataInicio) return false;
        if (dataFim && entry.dataKey > dataFim) return false;
      }

      // Filtro de Busca Textual
      if (cleanSearch) {
        const matchesTitulo = entry.titulo.toLowerCase().includes(cleanSearch);
        const matchesSubtitulo = (entry.subtitulo || '').toLowerCase().includes(cleanSearch);
        const matchesDescricao = (entry.descricao || '').toLowerCase().includes(cleanSearch);
        const matchesAutor = (entry.autorNome || '').toLowerCase().includes(cleanSearch);
        const matchesAnotacoes = (entry.anotacoes || []).some((a) => a.toLowerCase().includes(cleanSearch));

        if (!matchesTitulo && !matchesSubtitulo && !matchesDescricao && !matchesAutor && !matchesAnotacoes) {
          return false;
        }
      }

      return true;
    });
  }, [todosLancamentos, searchTerm, periodoFiltro, dataInicio, dataFim]);

  // Helpers do filtro de período
  const isPeriodoAtivo = periodoFiltro !== 'todos' || Boolean(dataInicio || dataFim);

  const labelPeriodoAtivo = useMemo(() => {
    if (periodoFiltro === 'hoje') return 'Hoje';
    if (periodoFiltro === '7dias') return 'Últimos 7 dias';
    if (periodoFiltro === '30dias') return 'Últimos 30 dias';
    if (periodoFiltro === 'intervalo') {
      if (dataInicio && dataFim) {
        const dI = dataInicio.split('-').reverse().slice(0, 2).join('/');
        const dF = dataFim.split('-').reverse().slice(0, 2).join('/');
        return `${dI} a ${dF}`;
      }
      if (dataInicio) {
        return `A partir de ${dataInicio.split('-').reverse().slice(0, 2).join('/')}`;
      }
      if (dataFim) {
        return `Até ${dataFim.split('-').reverse().slice(0, 2).join('/')}`;
      }
      return 'Intervalo';
    }
    return '';
  }, [periodoFiltro, dataInicio, dataFim]);

  // 3. Agrupamento por Dia (Extrato Bancário) ordenado do mais recente ao mais antigo
  const extratoPorDia = useMemo(() => {
    const grupos: Record<string, DiarioEntry[]> = {};

    lancamentosFiltrados.forEach((entry) => {
      if (!grupos[entry.dataKey]) {
        grupos[entry.dataKey] = [];
      }
      grupos[entry.dataKey].push(entry);
    });

    // Ordenar dias em ordem decrescente (mais recente no topo)
    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

    return chavesOrdenadas.map((diaKey) => {
      // Ordenar lançamentos do dia por horário decrescente
      const entriesDoDia = grupos[diaKey].sort((a, b) => {
        try {
          const timeA = new Date(a.dataHora).getTime();
          const timeB = new Date(b.dataHora).getTime();
          return timeB - timeA;
        } catch {
          return 0;
        }
      });

      // Cálculo de Saldo Financeiro do Dia (se houver decisões aprovadas/propostas no dia)
      const saldoDia = entriesDoDia.reduce((acc, item) => {
        if (item.tipo === 'decisao_aprovada') {
          const aditivo = item.valorAditivo || (item.impactoFinanceiro && item.impactoFinanceiro > 0 ? item.impactoFinanceiro : 0);
          const supressivo = item.valorSupressivo ? -Math.abs(item.valorSupressivo) : (item.impactoFinanceiro && item.impactoFinanceiro < 0 ? item.impactoFinanceiro : 0);
          return acc + aditivo + supressivo;
        }
        return acc;
      }, 0);

      return {
        diaKey,
        headerTexto: formatarHeaderDia(diaKey),
        entries: entriesDoDia,
        saldoDia,
      };
    });
  }, [lancamentosFiltrados]);

  // Submissão do Modal de Novo Registro
  const handleSalvarNovoRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (novoTipo === 'foto' && !novaFotoPreview) {
      setFormError('Selecione uma imagem para registrar.');
      return;
    }
    if (novoTipo === 'anotacao' && !novoConteudo.trim()) {
      setFormError('Escreva a anotação técnica antes de salvar.');
      return;
    }

    if (novoDestino === 'tarefa' && novaEtapaId && novaTarefaId && onUpdateTaskMedia) {
      const etapa = obra.etapas.find((et) => et.id === novaEtapaId);
      const tarefa = etapa?.tarefas.find((t) => t.id === novaTarefaId);
      if (etapa && tarefa) {
        const fotosAtuais = tarefa.fotos ? [...tarefa.fotos] : [];
        const notasAtuais = tarefa.anotacoes ? [...tarefa.anotacoes] : [];

        if (novoTipo === 'foto' && novaFotoPreview) {
          fotosAtuais.push(novaFotoPreview);
        } else if (novoTipo === 'anotacao' && novoConteudo.trim()) {
          notasAtuais.push(novoConteudo.trim());
        }

        onUpdateTaskMedia(etapa.id, tarefa.id, fotosAtuais, notasAtuais);
      }
    } else if (onAddAnexoGeral) {
      onAddAnexoGeral({
        titulo: novoTitulo.trim() || (novoTipo === 'foto' ? 'Foto de Canteiro' : 'Anotação Técnica'),
        tipo: novoTipo,
        conteudo: novoTipo === 'foto' ? (novaFotoPreview as string) : novoConteudo.trim(),
      });
    }

    setIsNovoRegistroOpen(false);
    setNovoTitulo('');
    setNovoConteudo('');
    setNovaFotoPreview(null);
    setFormError(null);
  };

  const handleFotoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNovaFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ========================================================
          CABEÇALHO MINIMALISTA: DIÁRIO DE OBRA COM BUSCA E FILTRO
         ======================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Diário de Obra
          </h2>

          {isPeriodoAtivo && (
            <span
              style={{
                fontSize: '0.76rem',
                color: 'var(--primary-accent)',
                background: 'var(--coral-glow-50)',
                border: '1px solid var(--border-hairline)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <CalendarBlank size={13} weight="bold" />
              <span>{labelPeriodoAtivo}</span>
              <button
                type="button"
                onClick={() => {
                  setPeriodoFiltro('todos');
                  setDataInicio('');
                  setDataFim('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-accent)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Limpar filtro de período"
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          )}
        </div>

        {/* Controles da Direita: Busca, Filtro de Período e Botão Novo Registro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* BOTÃO LUPA (POPUP DE BUSCA) */}
          <div style={{ position: 'relative' }} ref={searchContainerRef}>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className="btn-icon"
              style={{
                width: 38,
                height: 38,
                border: '1px solid var(--border-hairline)',
                background: isSearchOpen || searchTerm ? 'var(--dark-coffee-100)' : '#ffffff',
                color: searchTerm ? 'var(--primary-accent)' : 'var(--text-body)',
                position: 'relative',
              }}
              title="Pesquisar no diário"
            >
              <MagnifyingGlass size={18} weight={searchTerm ? 'bold' : 'regular'} />
              {searchTerm && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--primary-accent)',
                  }}
                />
              )}
            </button>

            {/* Popup Flutuante de Busca */}
            {isSearchOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 300,
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-floating)',
                  padding: '12px',
                  zIndex: 200,
                  animation: 'modalIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <MagnifyingGlass
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 10 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar no diário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    style={{ paddingLeft: 34, paddingRight: searchTerm ? 30 : 10, fontSize: '0.86rem', paddingBlock: '8px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsSearchOpen(false);
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="btn-icon"
                      style={{ position: 'absolute', right: 6, padding: 4 }}
                      title="Limpar busca"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOTÃO FILTRO DE PERÍODO (POPUP FLUTUANTE) */}
          <div style={{ position: 'relative' }} ref={filterContainerRef}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSearchOpen(false);
              }}
              className="btn-icon"
              style={{
                width: 38,
                height: 38,
                border: '1px solid var(--border-hairline)',
                background: isFilterOpen || isPeriodoAtivo ? 'var(--dark-coffee-100)' : '#ffffff',
                color: isPeriodoAtivo ? 'var(--primary-accent)' : 'var(--text-body)',
                position: 'relative',
              }}
              title="Filtrar por período"
            >
              <Funnel size={18} weight={isPeriodoAtivo ? 'fill' : 'regular'} />
              {isPeriodoAtivo && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--primary-accent)',
                  }}
                />
              )}
            </button>

            {/* Popup Flutuante de Período */}
            {isFilterOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 290,
                  background: '#ffffff',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-floating)',
                  padding: '14px',
                  zIndex: 200,
                  animation: 'modalIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                    paddingBottom: 6,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Filtrar Período
                  </span>
                  {isPeriodoAtivo && (
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodoFiltro('todos');
                        setDataInicio('');
                        setDataFim('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-accent)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { id: 'todos', label: 'Todo o período' },
                    { id: 'hoje', label: 'Hoje' },
                    { id: '7dias', label: 'Últimos 7 dias' },
                    { id: '30dias', label: 'Últimos 30 dias' },
                    { id: 'intervalo', label: 'Selecionar intervalo' },
                  ].map((opcao) => {
                    const isSelected = periodoFiltro === opcao.id;
                    return (
                      <button
                        key={opcao.id}
                        type="button"
                        onClick={() => {
                          setPeriodoFiltro(opcao.id as any);
                          if (opcao.id !== 'intervalo') {
                            setIsFilterOpen(false);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: isSelected ? 'var(--dark-coffee-50)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? 'var(--primary-accent)' : 'var(--text-body)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <span>{opcao.label}</span>
                        {isSelected && <Check size={14} weight="bold" color="var(--primary-accent)" />}
                      </button>
                    );
                  })}

                  {/* Campos de Intervalo De / Até */}
                  {periodoFiltro === 'intervalo' && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '10px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-hairline)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>
                          Data inicial (De):
                        </label>
                        <input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '6px 8px',
                            fontSize: '0.80rem',
                            color: 'var(--text-main)',
                            background: '#ffffff',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 3 }}>
                          Data final (Até):
                        </label>
                        <input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '6px 8px',
                            fontSize: '0.80rem',
                            color: 'var(--text-main)',
                            background: '#ffffff',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão Novo Registro (Construtor) */}
          {perfilAtivo === 'construtor' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsNovoRegistroOpen(true)}
                className="btn-primary"
                style={{
                  height: 38,
                  padding: '0 14px',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={15} weight="bold" />
                <span>Novo Registro</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          FEED DO DIÁRIO: ESTRUTURA DE EXTRATO BANCÁRIO POR DIA
         ======================================================== */}
      {extratoPorDia.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
          }}
        >
          <BookOpen size={40} weight="light" style={{ opacity: 0.4, marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Nenhum lançamento encontrado
          </h3>
          <p style={{ fontSize: '0.85rem', maxWidth: 420, margin: '0 auto', lineHeight: 1.4 }}>
            {searchTerm || isPeriodoAtivo
              ? 'Nenhum registro corresponde aos filtros selecionados. Tente limpar os critérios de busca.'
              : 'Conforme as etapas forem cumpridas e as decisões forem registradas, o extrato diário será gerado automaticamente.'}
          </p>
          {(searchTerm || isPeriodoAtivo) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setPeriodoFiltro('todos');
                setDataInicio('');
                setDataFim('');
              }}
              className="btn-secondary"
              style={{ marginTop: 16, padding: '6px 14px', fontSize: '0.80rem' }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {extratoPorDia.map((grupo) => (
            <div key={grupo.diaKey} className="diario-extrato-dia-block">
              {/* Cabeçalho do Dia (Divisor estilo Extrato Bancário) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--dark-coffee-50)',
                  borderLeft: '3px solid var(--primary-accent)',
                  borderRadius: 'var(--radius-xs)',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarBlank size={16} weight="bold" color="var(--primary-accent)" />
                  <strong style={{ fontSize: '0.90rem', color: 'var(--text-main)' }}>
                    {grupo.headerTexto}
                  </strong>
                  <span
                    className="diario-contador-desktop"
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 600,
                      background: 'var(--dark-coffee-100)',
                      color: 'var(--dark-coffee-800)',
                      padding: '1px 6px',
                      borderRadius: 10,
                    }}
                  >
                    {grupo.entries.length} {grupo.entries.length === 1 ? 'registro' : 'registros'}
                  </span>

                </div>

                {grupo.saldoDia !== 0 && (
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: grupo.saldoDia > 0 ? 'var(--primary-accent)' : '#16a34a',
                    }}
                  >
                    Movimentação no dia: {grupo.saldoDia > 0 ? `+${formatarMoeda(grupo.saldoDia)}` : `-${formatarMoeda(Math.abs(grupo.saldoDia))}`}
                  </span>
                )}
              </div>

              {/* Linhas de Lançamento do Dia (Cardless com divisores) */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  overflow: 'hidden',
                }}
              >
                {grupo.entries.map((entry, idx) => {
                  const isUltimo = idx === grupo.entries.length - 1;
                  const horaStr = formatarHora(entry.dataHora);

                  // Definição de Ícone e Cores por Tipo
                  let iconBg = 'var(--dark-coffee-100)';
                  let iconColor = 'var(--text-body)';
                  let tagLabel = 'REGISTRO';
                  let tagBg = 'var(--dark-coffee-50)';
                  let tagColor = 'var(--dark-coffee-800)';
                  let IconComponent = NotePencil;

                  if (entry.tipo === 'servico_concluido') {
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    tagLabel = 'SERVIÇO CUMPRIDO';
                    tagBg = '#dcfce7';
                    tagColor = '#15803d';
                    IconComponent = CheckCircle;
                  } else if (entry.tipo === 'etapa_concluida') {
                    iconBg = 'var(--dark-coffee-200)';
                    iconColor = 'var(--dark-coffee-900)';
                    tagLabel = 'ETAPA FINALIZADA';
                    tagBg = 'var(--dark-coffee-100)';
                    tagColor = 'var(--dark-coffee-900)';
                    IconComponent = Kanban;
                  } else if (entry.tipo === 'decisao_aprovada') {
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    tagLabel = 'DECISÃO APROVADA';
                    tagBg = '#dcfce7';
                    tagColor = '#15803d';
                    IconComponent = SealCheck;
                  } else if (entry.tipo === 'decisao_criada') {
                    iconBg = '#fef3c7';
                    iconColor = '#b45309';
                    tagLabel = 'DECISÃO PROPOSTA';
                    tagBg = '#fef3c7';
                    tagColor = '#b45309';
                    IconComponent = Clock;
                  } else if (entry.tipo === 'decisao_recusada') {
                    iconBg = '#fee2e2';
                    iconColor = '#b91c1c';
                    tagLabel = 'DECISÃO RECUSADA';
                    tagBg = '#fee2e2';
                    tagColor = '#b91c1c';
                    IconComponent = XCircle;
                  } else if (entry.tipo === 'evidencia_tarefa' || entry.tipo === 'anexo_geral') {
                    iconBg = 'var(--coral-glow-50)';
                    iconColor = 'var(--primary-accent)';
                    tagLabel = entry.fotos && entry.fotos.length > 0 ? 'FOTO DE CAMPO' : 'NOTA TÉCNICA';
                    tagBg = 'var(--coral-glow-50)';
                    tagColor = 'var(--primary-accent)';
                    IconComponent = entry.fotos && entry.fotos.length > 0 ? Camera : NotePencil;
                  } else if (entry.tipo === 'vistoria_concluida') {
                    iconBg = '#dcfce7';
                    iconColor = '#15803d';
                    tagLabel = 'VISTORIA FINAL';
                    tagBg = '#dcfce7';
                    tagColor = '#15803d';
                    IconComponent = CheckCircle;
                  } else if (entry.tipo === 'nota_registrada' || entry.tipo === 'material_registrado') {
                    iconBg = 'var(--dark-coffee-100)';
                    iconColor = 'var(--dark-coffee-800)';
                    tagLabel = 'NOTA';
                    tagBg = 'var(--dark-coffee-100)';
                    tagColor = 'var(--dark-coffee-800)';
                    IconComponent = Receipt;
                  }

                  const temAditivo = entry.valorAditivo !== undefined && entry.valorAditivo > 0;
                  const temSupressivo = entry.valorSupressivo !== undefined && entry.valorSupressivo > 0;

                  const isExpandedMobile = Boolean(expandedMobileIds[entry.id]);

                  const etapaNomeEncontrada =
                    entry.etapaNome ||
                    (entry.etapaId ? obra.etapas.find((e) => e.id === entry.etapaId)?.nome : undefined) ||
                    (entry.subtitulo && entry.subtitulo.startsWith('Etapa:')
                      ? entry.subtitulo.replace(/^Etapa:\s*/, '').replace(/\s*\(.*\)$/, '')
                      : undefined);

                  let mobileTituloPrincipal = entry.titulo;
                  let mobileSubtitulo = entry.subtitulo || '';

                  if (etapaNomeEncontrada) {
                    mobileTituloPrincipal = etapaNomeEncontrada;
                    if (entry.tipo === 'evidencia_tarefa') {
                      mobileSubtitulo = entry.titulo.replace(/^Registro de Campo:\s*/, '');
                    } else if (entry.tipo === 'etapa_concluida') {
                      mobileSubtitulo = entry.subtitulo || 'Etapa finalizada com sucesso';
                    } else {
                      mobileSubtitulo = entry.titulo;
                    }
                  } else if (entry.tipo.startsWith('decisao_')) {
                    mobileTituloPrincipal =
                      entry.tipo === 'decisao_aprovada'
                        ? 'Decisão Aprovada'
                        : entry.tipo === 'decisao_recusada'
                        ? 'Decisão Recusada'
                        : 'Decisão e Aprovação';
                    mobileSubtitulo = entry.titulo.replace(/^(Decisão Recusada:\s*|Proposta de Decisão:\s*)/, '');
                  } else if (entry.tipo === 'vistoria_concluida') {
                    mobileTituloPrincipal = 'Vistoria Final';
                    mobileSubtitulo = entry.titulo.replace(/^Vistoria Final:\s*/, '');
                  } else if (entry.tipo === 'nota_registrada' || entry.tipo === 'material_registrado') {
                    mobileTituloPrincipal = 'Registro de Nota';
                    mobileSubtitulo = entry.titulo;
                  } else if (entry.tipo === 'anexo_geral') {
                    mobileTituloPrincipal = 'Diário de Canteiro';
                    mobileSubtitulo = entry.titulo;
                  }

                  return (
                    <div key={entry.id} style={{ borderBottom: isUltimo ? 'none' : '1px solid var(--border-hairline)' }}>
                      {/* Versão Desktop (Inalterada, aberta integralmente) */}
                      <div className="diario-card-desktop">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 14,
                            padding: '12px 16px',
                            transition: 'background 0.15s ease',
                          }}
                          className="diario-extrato-row"
                        >
                          {/* Horário do Extrato */}
                          <div
                            style={{
                              width: 48,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              paddingTop: 4,
                              flexShrink: 0,
                              fontFamily: 'monospace',
                            }}
                          >
                            {horaStr}
                          </div>

                          {/* Ícone com container temático */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-xs)',
                              background: iconBg,
                              color: iconColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            <IconComponent size={17} weight="bold" />
                          </div>

                          {/* Corpo do Lançamento */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  padding: '1px 6px',
                                  borderRadius: 3,
                                  background: tagBg,
                                  color: tagColor,
                                }}
                              >
                                {tagLabel}
                              </span>

                              {entry.subtitulo && (
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                  • {entry.subtitulo}
                                </span>
                              )}
                            </div>

                            {/* Título Principal */}
                            <div style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
                              {entry.titulo}
                            </div>

                            {/* Descrição ou anotação se houver */}
                            {entry.descricao && (
                              <p
                                style={{
                                  fontSize: '0.80rem',
                                  color: 'var(--text-body)',
                                  margin: '5px 0 0 0',
                                  lineHeight: 1.4,
                                  background: 'var(--dark-coffee-50)',
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-xs)',
                                  borderLeft: '2px solid var(--border-hairline)',
                                }}
                              >
                                {entry.descricao}
                              </p>
                            )}

                            {/* Lista de Anotações Técnicas de Campo */}
                            {entry.anotacoes && entry.anotacoes.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {entry.anotacoes.map((nota, nIdx) => (
                                  <div
                                    key={nIdx}
                                    style={{
                                      fontSize: '0.78rem',
                                      color: 'var(--text-body)',
                                      background: 'var(--dark-coffee-50)',
                                      padding: '5px 8px',
                                      borderRadius: 4,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    <NotePencil size={13} color="var(--primary-accent)" />
                                    <span>{nota}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Miniaturas de Fotos Anexadas */}
                            {entry.fotos && entry.fotos.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                {entry.fotos.map((fotoUrl, fIdx) => (
                                  <button
                                    key={fIdx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedImageModal({
                                        url: fotoUrl,
                                        titulo: entry.titulo,
                                        subtitulo: entry.subtitulo,
                                      })
                                    }
                                    style={{
                                      padding: 0,
                                      border: '1px solid var(--border-hairline)',
                                      background: 'var(--dark-coffee-100)',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      display: 'block',
                                      position: 'relative',
                                      width: 64,
                                      height: 64,
                                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    }}
                                    title="Clique para ampliar imagem do canteiro"
                                  >
                                    <img
                                      src={fotoUrl}
                                      alt={`Evidência ${fIdx + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Coluna Direita: Valores Financeiros & Ações Rápidas */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            {/* Badges Financeiros de Extrato */}
                            {temAditivo && temSupressivo ? (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
                                  +{formatarMoeda(entry.valorAditivo)}
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                                  -{formatarMoeda(entry.valorSupressivo)}
                                </div>
                              </div>
                            ) : temAditivo ? (
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: 'var(--primary-accent)',
                                  background: 'var(--coral-glow-50)',
                                  border: '1px solid var(--coral-glow-200)',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                +{formatarMoeda(entry.valorAditivo)}
                              </div>
                            ) : temSupressivo ? (
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                -{formatarMoeda(entry.valorSupressivo)}
                              </div>
                            ) : entry.impactoFinanceiro !== undefined && entry.impactoFinanceiro !== 0 ? (
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: entry.impactoFinanceiro > 0 ? 'var(--primary-accent)' : '#15803d',
                                  background: entry.impactoFinanceiro > 0 ? 'var(--coral-glow-50)' : '#dcfce7',
                                  border: `1px solid ${entry.impactoFinanceiro > 0 ? 'var(--coral-glow-200)' : '#bbf7d0'}`,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                {entry.impactoFinanceiro > 0 ? `+${formatarMoeda(entry.impactoFinanceiro)}` : `-${formatarMoeda(Math.abs(entry.impactoFinanceiro))}`}
                              </div>
                            ) : null}

                            {/* Atalhos Rápidos */}
                            {entry.etapaId && entry.tarefaId && onNavigateToTask && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTask(entry.etapaId!, entry.tarefaId!)}
                                className="btn-secondary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Ver serviço no cronograma"
                              >
                                <span>Cronograma</span>
                                <ArrowRight size={12} weight="bold" />
                              </button>
                            )}

                            {entry.decisaoId && onNavigateToDecisoes && (
                              <button
                                type="button"
                                onClick={onNavigateToDecisoes}
                                className="btn-secondary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Ver na central de decisões"
                              >
                                <span>Decisões</span>
                                <ArrowRight size={12} weight="bold" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Versão Mobile (Accordion / Collapse Exclusivo no Mobile) */}
                      <div className="diario-card-mobile">
                        {/* 1. Estado Minimizado: Título Principal (Etapa) e Subtítulo (Tarefa) empilhados + Chevron no canto direito */}
                        <div
                          role="button"
                          tabIndex={0}
                          className="diario-card-mobile-header"
                          onClick={() => toggleMobileExpand(entry.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleMobileExpand(entry.id);
                            }
                          }}
                          aria-expanded={isExpandedMobile}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '12px 14px',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            {/* 1. Título Principal (Texto maior/destaque): Nome da Etapa */}
                            <div
                              style={{
                                fontSize: '0.94rem',
                                fontWeight: 700,
                                color: 'var(--text-main)',
                                lineHeight: 1.3,
                              }}
                            >
                              {mobileTituloPrincipal}
                            </div>

                            {/* 2. Subtítulo (Texto menor, logo abaixo do título): Nome da Tarefa */}
                            {mobileSubtitulo && (
                              <div
                                style={{
                                  fontSize: '0.80rem',
                                  fontWeight: 500,
                                  color: 'var(--text-muted)',
                                  lineHeight: 1.35,
                                  marginTop: 2,
                                }}
                              >
                                {mobileSubtitulo}
                              </div>
                            )}
                          </div>

                          {/* 3. Ícone: Seta (Chevron) à direita para indicar expansão */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: isExpandedMobile ? 'var(--dark-coffee-100)' : 'var(--dark-coffee-50)',
                              color: 'var(--text-main)',
                              flexShrink: 0,
                              transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s ease',
                              transform: isExpandedMobile ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          >
                            <CaretDown size={15} weight="bold" />
                          </div>
                        </div>

                        {/* 2. Estado Expandido (Ao clicar): Hora, tag de status, etapa, descrição detalhada, fotos e botão de ação */}
                        {isExpandedMobile && (
                          <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid var(--border-hairline)', marginTop: 2, paddingTop: 10 }}>
                            {/* Metadados: Hora, Tag de Status, Etapa e Ícone */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 'var(--radius-xs)',
                                  background: iconBg,
                                  color: iconColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <IconComponent size={14} weight="bold" />
                              </div>

                              <span
                                style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  color: 'var(--text-muted)',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {horaStr}
                              </span>

                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  padding: '1px 6px',
                                  borderRadius: 3,
                                  background: tagBg,
                                  color: tagColor,
                                }}
                              >
                                {tagLabel}
                              </span>

                              {entry.subtitulo && (
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  • {entry.subtitulo}
                                </span>
                              )}
                            </div>

                            {/* Caixa de Descrição Detalhada */}
                            {entry.descricao && (
                              <p
                                style={{
                                  fontSize: '0.80rem',
                                  color: 'var(--text-body)',
                                  margin: '0 0 10px 0',
                                  lineHeight: 1.4,
                                  background: 'var(--dark-coffee-50)',
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-xs)',
                                  borderLeft: '2px solid var(--border-hairline)',
                                }}
                              >
                                {entry.descricao}
                              </p>
                            )}

                            {/* Anotações Técnicas de Campo */}
                            {entry.anotacoes && entry.anotacoes.length > 0 && (
                              <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {entry.anotacoes.map((nota, nIdx) => (
                                  <div
                                    key={nIdx}
                                    style={{
                                      fontSize: '0.76rem',
                                      color: 'var(--text-body)',
                                      background: 'var(--dark-coffee-50)',
                                      padding: '5px 8px',
                                      borderRadius: 4,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    <NotePencil size={13} color="var(--primary-accent)" />
                                    <span>{nota}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Fotos Anexadas */}
                            {entry.fotos && entry.fotos.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                {entry.fotos.map((fotoUrl, fIdx) => (
                                  <button
                                    key={fIdx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedImageModal({
                                        url: fotoUrl,
                                        titulo: entry.titulo,
                                        subtitulo: entry.subtitulo,
                                      })
                                    }
                                    style={{
                                      padding: 0,
                                      border: '1px solid var(--border-hairline)',
                                      background: 'var(--dark-coffee-100)',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      display: 'block',
                                      position: 'relative',
                                      width: 58,
                                      height: 58,
                                    }}
                                    title="Clique para ampliar imagem do canteiro"
                                  >
                                    <img
                                      src={fotoUrl}
                                      alt={`Evidência ${fIdx + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Rodapé do Accordion: Impacto Financeiro e Botão de Ação */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              <div>
                                {temAditivo && temSupressivo ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
                                      +{formatarMoeda(entry.valorAditivo)}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                                      -{formatarMoeda(entry.valorSupressivo)}
                                    </span>
                                  </div>
                                ) : temAditivo ? (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      color: 'var(--primary-accent)',
                                      background: 'var(--coral-glow-50)',
                                      border: '1px solid var(--coral-glow-200)',
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    +{formatarMoeda(entry.valorAditivo)}
                                  </span>
                                ) : temSupressivo ? (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      color: '#15803d',
                                      background: '#dcfce7',
                                      border: '1px solid #bbf7d0',
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    -{formatarMoeda(entry.valorSupressivo)}
                                  </span>
                                ) : entry.impactoFinanceiro !== undefined && entry.impactoFinanceiro !== 0 ? (
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      color: entry.impactoFinanceiro > 0 ? 'var(--primary-accent)' : '#15803d',
                                      background: entry.impactoFinanceiro > 0 ? 'var(--coral-glow-50)' : '#dcfce7',
                                      border: `1px solid ${entry.impactoFinanceiro > 0 ? 'var(--coral-glow-200)' : '#bbf7d0'}`,
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    {entry.impactoFinanceiro > 0 ? `+${formatarMoeda(entry.impactoFinanceiro)}` : `-${formatarMoeda(Math.abs(entry.impactoFinanceiro))}`}
                                  </span>
                                ) : null}
                              </div>

                              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                {entry.etapaId && entry.tarefaId && onNavigateToTask && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToTask(entry.etapaId!, entry.tarefaId!)}
                                    className="btn-secondary"
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Ver serviço no cronograma"
                                  >
                                    <span>Cronograma</span>
                                    <ArrowRight size={12} weight="bold" />
                                  </button>
                                )}

                                {entry.decisaoId && onNavigateToDecisoes && (
                                  <button
                                    type="button"
                                    onClick={onNavigateToDecisoes}
                                    className="btn-secondary"
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Ver na central de decisões"
                                  >
                                    <span>Decisões</span>
                                    <ArrowRight size={12} weight="bold" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          MODAL: NOVO REGISTRO NO DIÁRIO (APENAS CONSTRUTOR)
         ======================================================== */}
      {isNovoRegistroOpen && perfilAtivo === 'construtor' && (
        <div className="modal-backdrop" onClick={() => setIsNovoRegistroOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-novo-diario-title"
          >
            <div className="modal-header" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} weight="bold" color="var(--primary-accent)" />
                <h3 id="modal-novo-diario-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Novo Registro no Diário de Obra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNovoRegistroOpen(false)}
                className="btn-icon"
                style={{ width: 28, height: 28 }}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoRegistro} style={{ padding: '16px 20px' }}>
              {formError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-xs)',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '0.80rem',
                    marginBottom: 12,
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Tipo de Registro */}
              <div style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: 6 }}>
                  Tipo de Registro
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNovoTipo('foto')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: novoTipo === 'foto' ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-hairline)',
                      background: novoTipo === 'foto' ? 'var(--coral-glow-50)' : 'transparent',
                      color: novoTipo === 'foto' ? 'var(--primary-accent)' : 'var(--text-body)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Camera size={15} weight="bold" />
                    <span>Foto de Canteiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNovoTipo('anotacao')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.80rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)',
                      border: novoTipo === 'anotacao' ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-hairline)',
                      background: novoTipo === 'anotacao' ? 'var(--coral-glow-50)' : 'transparent',
                      color: novoTipo === 'anotacao' ? 'var(--primary-accent)' : 'var(--text-body)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <NotePencil size={15} weight="bold" />
                    <span>Anotação Técnica</span>
                  </button>
                </div>
              </div>

              {/* Vínculo: Geral da Obra vs Serviço de Etapa */}
              <div style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: 6 }}>
                  Destino do Registro
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="destino"
                      value="geral"
                      checked={novoDestino === 'geral'}
                      onChange={() => setNovoDestino('geral')}
                    />
                    <span>Registro Geral da Obra</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="destino"
                      value="tarefa"
                      checked={novoDestino === 'tarefa'}
                      onChange={() => setNovoDestino('tarefa')}
                    />
                    <span>Vincular a um Serviço</span>
                  </label>
                </div>
              </div>

              {/* Seleção de Etapa e Tarefa (se for vincular) */}
              {novoDestino === 'tarefa' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>
                      Etapa
                    </label>
                    <select
                      className="input-field"
                      style={{ fontSize: '0.80rem', height: 34, width: '100%' }}
                      value={novaEtapaId}
                      onChange={(e) => {
                        setNovaEtapaId(e.target.value);
                        setNovaTarefaId('');
                      }}
                    >
                      {obra.etapas.map((etapa) => (
                        <option key={etapa.id} value={etapa.id}>
                          {etapa.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>
                      Serviço
                    </label>
                    <select
                      className="input-field"
                      style={{ fontSize: '0.80rem', height: 34, width: '100%' }}
                      value={novaTarefaId}
                      onChange={(e) => setNovaTarefaId(e.target.value)}
                    >
                      <option value="">Selecione o serviço...</option>
                      {(obra.etapas.find((et) => et.id === novaEtapaId)?.tarefas || []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Título Opcional */}
              <div style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>
                  Título / Assunto (Opcional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem', height: 34 }}
                  placeholder="Ex: Concretagem da laje, Chegada de pisos..."
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                />
              </div>

              {/* Campo de Foto */}
              {novoTipo === 'foto' && (
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>
                    Arquivo da Foto
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoUploadChange}
                    className="input-field"
                    style={{ fontSize: '0.80rem', width: '100%' }}
                  />
                  {novaFotoPreview && (
                    <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', maxHeight: 160 }}>
                      <img src={novaFotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Campo de Anotação */}
              {novoTipo === 'anotacao' && (
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>
                    Observação Técnica
                  </label>
                  <textarea
                    rows={3}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
                    placeholder="Descreva o registro de canteiro, status de entrega ou observação técnica..."
                    value={novoConteudo}
                    onChange={(e) => setNovoConteudo(e.target.value)}
                  />
                </div>
              )}

              {/* Botões do Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border-hairline)' }}>
                <button
                  type="button"
                  onClick={() => setIsNovoRegistroOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                >
                  Salvar no Diário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL LIGHTBOX: VISUALIZAR FOTO EM TELA CHEIA
         ======================================================== */}
      {selectedImageModal && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedImageModal(null)}
          style={{ background: 'rgba(0,0,0,0.85)', padding: 16, zIndex: 1200 }}
          role="dialog"
          aria-label="Visualização ampliada da foto"
        >
          <div
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#ffffff',
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 700 }}>
                  {selectedImageModal.titulo}
                </div>
                {selectedImageModal.subtitulo && (
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {selectedImageModal.subtitulo}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedImageModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="Fechar foto ampliada"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <img
              src={selectedImageModal.url}
              alt={selectedImageModal.titulo}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 'var(--radius-sm)',
                display: 'block',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
