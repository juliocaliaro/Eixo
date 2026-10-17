import {
  Obra,
  Etapa,
  Tarefa,
  Decisao,
  ProjetoPDF,
  RegistroNota,
  RegistroLocacao,
  PunchListItem,
  StatusCronograma,
  StatusDecisao,
  TipoProjeto,
  PerfilUsuario,
  PresetTipoObra,
  AssinaturaDecisao,
} from '../types/obra';

// ==============================================================================
// DATABASE ROW INTERFACES (POSTGRESQL / SUPABASE)
// ==============================================================================

export interface ObraRow {
  id: string;
  nome: string;
  cliente_nome: string;
  cliente_id?: string | null;
  cliente_email?: string | null;
  emails_clientes?: string[] | null;
  construtor_id?: string | null;
  endereco: string;
  data_prevista: string;
  orcamento_inicial: number;
  empresa_responsavel?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EtapaRow {
  id: string;
  obra_id: string;
  nome: string;
  ordem: number;
  tipo_origem?: string | null;
  status: StatusCronograma;
  concluida: boolean;
  concluida_em?: string | null;
  ambientes?: string[] | null;
  created_at: string;
}

export interface TarefaRow {
  id: string;
  etapa_id: string;
  nome: string;
  ordem: number;
  status: StatusCronograma;
  concluida: boolean;
  concluida_em?: string | null;
  ambiente?: string | null;
  created_at: string;
}

export interface TarefaEvidenciaRow {
  id: string;
  tarefa_id: string;
  tipo: 'foto' | 'anotacao';
  conteudo: string;
  ordem?: number | null;
  created_at: string;
}

export interface DecisaoRow {
  id: string;
  obra_id: string;
  titulo: string;
  descricao: string;
  categoria?: string | null;
  tipo_impacto?: 'nenhum' | 'aditivo' | 'supressivo' | 'ambos';
  valor_aditivo?: number;
  valor_supressivo?: number;
  impacto_financeiro?: number;
  impacto_prazo_dias?: number;
  status: StatusDecisao;
  criada_por: 'construtor' | 'cliente';
  criador_id?: string | null;
  criador_nome: string;
  fotos?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DecisaoAssinaturaRow {
  id: string;
  decisao_id: string;
  user_id?: string | null;
  papel: 'criador' | 'contraparte';
  autor_perfil: 'construtor' | 'cliente';
  nome_signatario: string;
  comentario?: string | null;
  assinado_em: string;
}

export interface ProjetoPdfRow {
  id: string;
  obra_id: string;
  titulo: string;
  disciplina: TipoProjeto;
  disciplina_customizada?: string | null;
  arquivo_nome: string;
  tamanho_bytes: number;
  url: string;
  storage_path?: string | null;
  versao?: string | null;
  descricao?: string | null;
  enviado_por: PerfilUsuario | 'externo';
  enviado_por_nome: string;
  created_at: string;
}

export interface RegistroNotaRow {
  id: string;
  obra_id: string;
  titulo?: string | null;
  valor?: number | null;
  observacoes?: string | null;
  fotos: string[];
  created_at: string;
}

export interface PunchListItemRow {
  id: string;
  obra_id: string;
  item: string;
  ambiente?: string | null;
  concluido: boolean;
  concluido_em?: string | null;
  ordem?: number | null;
  created_at: string;
}

export interface ModeloTemplateRow {
  id: string;
  nome: string;
  etapas_json: PresetTipoObra['etapas'];
  criado_por?: string | null;
  customizado?: boolean | null;
}

export interface RegistroLocacaoRow {
  id: string;
  obra_id: string;
  item_locado: string;
  quantidade?: number | null;
  periodo?: string | null;
  data_vencimento: string;
  fotos: string[];
  fornecedor?: string | null;
  valor?: number | null;
  observacoes?: string | null;
  status?: string | null;
  renovado?: boolean | null;
  renovado_em?: string | null;
  vencimento_original?: string | null;
  created_at: string;
}

// ==============================================================================
// DATA MAPPERS (CONVERSÃO DE TIPOS BANCO <-> APLICAÇÃO)
// ==============================================================================

// Aceita lista ou, por legado, uma unica string; ausente vira undefined.
const emailsClientesFromDb = (raw: unknown): string[] | undefined => {
  if (Array.isArray(raw)) {
    return raw
      .filter((em): em is string => typeof em === 'string' && em.trim().length > 0)
      .map((em) => em.trim().toLowerCase());
  }
  if (raw && typeof raw === 'string') return [raw.trim().toLowerCase()];
  return undefined;
};

export const mapObraFromDb = (
  row: ObraRow,
  etapas: Etapa[] = [],
  decisoes: Decisao[] = [],
  projetos: ProjetoPDF[] = [],
  notas: RegistroNota[] = [],
  punchList: PunchListItem[] = [],
  locacoes: RegistroLocacao[] = []
): Obra => {
  return {
    id: row.id,
    nome: row.nome,
    cliente: row.cliente_nome,
    endereco: row.endereco,
    dataPrevista: row.data_prevista,
    criadaEm: row.created_at,
    empresaResponsavel: row.empresa_responsavel || undefined,
    orcamentoInicial: Number(row.orcamento_inicial) || 0,
    construtorId: row.construtor_id || undefined,
    clienteId: row.cliente_id || undefined,
    clienteEmail: row.cliente_email || undefined,
    emailsClientes: emailsClientesFromDb(row.emails_clientes),
    etapas,
    decisoes,
    projetos,
    notas,
    punchList,
    locacoes,
  };
};

export const mapEtapaFromDb = (row: EtapaRow, tarefas: Tarefa[] = []): Etapa => {
  const ambientesSet = new Set<string>();
  if (Array.isArray(row.ambientes)) {
    row.ambientes.forEach((a) => {
      if (typeof a === 'string' && a.trim().length > 0) ambientesSet.add(a.trim());
    });
  }
  tarefas.forEach((t) => {
    if (t.ambiente && t.ambiente.trim().length > 0) {
      ambientesSet.add(t.ambiente.trim());
    }
  });

  return {
    id: row.id,
    nome: row.nome,
    tipoOrigem: row.tipo_origem || undefined,
    status: row.status,
    concluida: row.concluida,
    concluidaEm: row.concluida_em || undefined,
    ambientes: ambientesSet.size > 0 ? Array.from(ambientesSet) : undefined,
    tarefas,
  };
};

export const mapTarefaFromDb = (
  row: TarefaRow,
  evidencias: TarefaEvidenciaRow[] = []
): Tarefa => {
  const porOrdem = (a: TarefaEvidenciaRow, b: TarefaEvidenciaRow) =>
    (a.ordem ?? 0) - (b.ordem ?? 0);
  const fotos = evidencias
    .filter((e) => e.tipo === 'foto')
    .sort(porOrdem)
    .map((e) => e.conteudo);

  // Compatibilidade de leitura: linhas legadas '__AMBIENTE__:' (substituidas pela coluna tarefas.ambiente)
  const ambienteEvidencia = evidencias.find(
    (e) => e.tipo === 'anotacao' && e.conteudo.startsWith('__AMBIENTE__:')
  );
  const ambienteExtraido = ambienteEvidencia
    ? ambienteEvidencia.conteudo.replace('__AMBIENTE__:', '').trim()
    : undefined;
  const ambienteLegado = ambienteExtraido && ambienteExtraido !== '__NONE__' ? ambienteExtraido : undefined;
  const ambienteFinal = row.ambiente && row.ambiente.trim().length > 0 ? row.ambiente.trim() : ambienteLegado;

  const anotacoes = evidencias
    .filter((e) => e.tipo === 'anotacao' && !e.conteudo.startsWith('__AMBIENTE__:'))
    .sort(porOrdem)
    .map((e) => e.conteudo);

  return {
    id: row.id,
    nome: row.nome,
    status: row.status,
    concluida: row.concluida,
    concluidaEm: row.concluida_em || undefined,
    fotos: fotos.length > 0 ? fotos : undefined,
    anotacoes: anotacoes.length > 0 ? anotacoes : undefined,
    ambiente: ambienteFinal,
  };
};

const mapAssinaturaFromDb = (row: DecisaoAssinaturaRow): AssinaturaDecisao => ({
  autor: row.autor_perfil,
  nomeSignatario: row.nome_signatario,
  assinadoEm: row.assinado_em,
  comentario: row.comentario || undefined,
});

export const mapDecisaoFromDb = (
  row: DecisaoRow,
  assinaturas: DecisaoAssinaturaRow[] = []
): Decisao => {
  const assinCriador = assinaturas.find((a) => a.papel === 'criador');
  const assinContraparte = assinaturas.find((a) => a.papel === 'contraparte');

  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    categoria: (row.categoria as any) || 'outro',
    tipoImpactoFinanceiro:
      row.tipo_impacto === 'nenhum' || !row.tipo_impacto
        ? undefined
        : (row.tipo_impacto as 'aditivo' | 'supressivo' | 'ambos'),
    valorAditivo: Number(row.valor_aditivo) || 0,
    valorSupressivo: Number(row.valor_supressivo) || 0,
    impactoFinanceiro: Number(row.impacto_financeiro) || 0,
    impactoPrazoDias: Number(row.impacto_prazo_dias) || 0,
    status: row.status,
    criadaPor: row.criada_por,
    criadorNome: row.criador_nome,
    criadaEm: row.created_at,
    fotos: Array.isArray(row.fotos) ? row.fotos : [],
    assinaturaCriador: assinCriador
      ? mapAssinaturaFromDb(assinCriador)
      : { autor: row.criada_por, nomeSignatario: row.criador_nome, assinadoEm: row.created_at },
    assinaturaContraparte: assinContraparte ? mapAssinaturaFromDb(assinContraparte) : undefined,
  };
};

export const mapProjetoFromDb = (row: ProjetoPdfRow): ProjetoPDF => {
  return {
    id: row.id,
    titulo: row.titulo,
    tipo: row.disciplina,
    tipoCustomizado: row.disciplina_customizada || undefined,
    arquivoNome: row.arquivo_nome,
    tamanhoBytes: Number(row.tamanho_bytes),
    url: row.url,
    versao: row.versao || 'Rev. 01',
    descricao: row.descricao || undefined,
    enviadoPor: row.enviado_por,
    enviadoPorNome: row.enviado_por_nome,
    dataUpload: row.created_at,
  };
};

const parseFotosFromDb = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.filter((f) => typeof f === 'string' && f.trim().length > 0);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((f) => typeof f === 'string' && f.trim().length > 0);
      if (typeof parsed === 'string' && parsed.trim().length > 0) return [parsed.trim()];
    } catch {
      if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
        return [trimmed];
      }
    }
  }
  return [];
};

export const mapNotaFromDb = (row: RegistroNotaRow): RegistroNota => {
  return {
    id: row.id,
    obraId: row.obra_id,
    titulo: row.titulo || undefined,
    valor: row.valor ? Number(row.valor) : undefined,
    observacoes: row.observacoes || undefined,
    fotos: parseFotosFromDb(row.fotos),
    criadoEm: row.created_at,
  };
};

export const mapPunchItemFromDb = (row: PunchListItemRow): PunchListItem => {
  return {
    id: row.id,
    item: row.item,
    ambiente: row.ambiente || 'Geral',
    concluido: row.concluido,
    concluidoEm: row.concluido_em || undefined,
  };
};

export const mapLocacaoFromDb = (row: RegistroLocacaoRow): RegistroLocacao => {
  return {
    id: row.id,
    obraId: row.obra_id,
    itemLocado: row.item_locado,
    quantidade: row.quantidade !== null && row.quantidade !== undefined ? Number(row.quantidade) : undefined,
    periodo: (row.periodo as any) || undefined,
    dataVencimento: row.data_vencimento,
    fotos: parseFotosFromDb(row.fotos),
    fornecedor: row.fornecedor || undefined,
    valor: row.valor ? Number(row.valor) : undefined,
    observacoes: row.observacoes || undefined,
    status: (row.status as any) || 'ativo',
    renovado: Boolean(row.renovado),
    renovadoEm: row.renovado_em || undefined,
    vencimentoOriginal: row.vencimento_original || undefined,
    criadoEm: row.created_at,
  };
};

export const mapTemplateFromDb = (row: ModeloTemplateRow): PresetTipoObra => ({
  id: row.id,
  nome: row.nome,
  etapas: Array.isArray(row.etapas_json) ? row.etapas_json : [],
});

// ==============================================================================
// ROW MAPPERS DE ESCRITA (APLICACAO -> BANCO)
// Inverso de map*FromDb; reutilizados pelo repositorio de obras e pelas APIs por entidade.
// Regras: nunca emitir campos volateis (updated_at e mantido por trigger no banco) e
// sempre usar null (nunca undefined) para ausentes, mantendo o diff estavel.
// ==============================================================================

export type RowWrite<T> = Omit<T, 'created_at' | 'updated_at'> & { created_at?: string };

const trimmedOrNull = (v?: string | null): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length > 0 ? t : null;
};

export const normalizarEmails = (list?: unknown): string[] => {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const em of list) {
    if (typeof em !== 'string') continue;
    const n = em.trim().toLowerCase();
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
};

export const toObraRow = (obra: Obra, opts: { construtorId?: string | null } = {}): RowWrite<ObraRow> => ({
  id: obra.id,
  nome: obra.nome,
  cliente_nome: obra.cliente,
  cliente_id: obra.clienteId || null,
  cliente_email: trimmedOrNull(obra.clienteEmail)?.toLowerCase() ?? null,
  emails_clientes: normalizarEmails(obra.emailsClientes),
  construtor_id: obra.construtorId || opts.construtorId || null,
  endereco: obra.endereco,
  data_prevista: obra.dataPrevista,
  orcamento_inicial: obra.orcamentoInicial || 0,
  empresa_responsavel: trimmedOrNull(obra.empresaResponsavel),
  created_at: obra.criadaEm,
});

const statusPersistido = (item: { concluida?: boolean; status?: string }): StatusCronograma => {
  if (item.concluida) return 'concluido';
  return item.status === 'em_andamento' ? 'em_andamento' : 'pendente';
};

export const toEtapaRow = (etapa: Etapa, obraId: string, ordem: number): RowWrite<EtapaRow> => {
  const ambientes: string[] = [];
  const add = (a?: string | null) => {
    const t = typeof a === 'string' ? a.trim() : '';
    if (t && !ambientes.includes(t)) ambientes.push(t);
  };
  (etapa.ambientes || []).forEach(add);
  (etapa.tarefas || []).forEach((t) => add(t.ambiente));
  return {
    id: etapa.id,
    obra_id: obraId,
    nome: etapa.nome,
    ordem,
    tipo_origem: etapa.tipoOrigem || null,
    status: statusPersistido(etapa),
    concluida: Boolean(etapa.concluida),
    concluida_em: etapa.concluidaEm || null,
    ambientes,
  };
};

export const toTarefaRow = (tarefa: Tarefa, etapaId: string, ordem: number): RowWrite<TarefaRow> => ({
  id: tarefa.id,
  etapa_id: etapaId,
  nome: tarefa.nome,
  ordem,
  status: statusPersistido(tarefa),
  concluida: Boolean(tarefa.concluida),
  concluida_em: tarefa.concluidaEm || null,
  ambiente: trimmedOrNull(tarefa.ambiente),
});

export const toEvidenciaRow = (
  id: string,
  tarefaId: string,
  tipo: 'foto' | 'anotacao',
  conteudo: string,
  ordem: number
): RowWrite<TarefaEvidenciaRow> => ({ id, tarefa_id: tarefaId, tipo, conteudo, ordem });

export const toDecisaoRow = (d: Decisao, obraId: string): RowWrite<DecisaoRow> => ({
  id: d.id,
  obra_id: obraId,
  titulo: d.titulo,
  descricao: d.descricao,
  categoria: d.categoria || 'outro',
  tipo_impacto: d.tipoImpactoFinanceiro || 'nenhum',
  valor_aditivo: d.valorAditivo || 0,
  valor_supressivo: d.valorSupressivo || 0,
  impacto_financeiro: d.impactoFinanceiro || 0,
  impacto_prazo_dias: d.impactoPrazoDias || 0,
  status: d.status,
  criada_por: d.criadaPor,
  criador_nome: d.criadorNome,
  fotos: d.fotos || [],
  created_at: d.criadaEm,
});

export const toAssinaturaRow = (
  id: string,
  a: AssinaturaDecisao,
  decisaoId: string,
  papel: 'criador' | 'contraparte'
): RowWrite<DecisaoAssinaturaRow> => ({
  id,
  decisao_id: decisaoId,
  papel,
  autor_perfil: a.autor,
  nome_signatario: a.nomeSignatario,
  comentario: a.comentario || null,
  assinado_em: a.assinadoEm,
});

export const toProjetoRow = (p: ProjetoPDF, obraId: string): RowWrite<ProjetoPdfRow> => ({
  id: p.id,
  obra_id: obraId,
  titulo: p.titulo,
  disciplina: p.tipo,
  disciplina_customizada: p.tipoCustomizado || null,
  arquivo_nome: p.arquivoNome,
  tamanho_bytes: p.tamanhoBytes,
  url: p.url,
  versao: p.versao || 'Rev. 01',
  descricao: p.descricao || null,
  enviado_por: p.enviadoPor || 'construtor',
  enviado_por_nome: p.enviadoPorNome || 'Construtor Responsável',
  created_at: p.dataUpload,
});

export const toNotaRow = (n: RegistroNota, obraId: string): RowWrite<RegistroNotaRow> => ({
  id: n.id,
  obra_id: obraId,
  titulo: n.titulo || null,
  valor: n.valor || null,
  observacoes: n.observacoes || null,
  fotos: n.fotos || [],
  created_at: n.criadoEm,
});

export const toPunchRow = (p: PunchListItem, obraId: string, ordem: number): RowWrite<PunchListItemRow> => ({
  id: p.id,
  obra_id: obraId,
  item: p.item,
  ambiente: p.ambiente || 'Geral',
  concluido: Boolean(p.concluido),
  concluido_em: p.concluidoEm || null,
  ordem,
});

export const toLocacaoRow = (l: RegistroLocacao, obraId: string): RowWrite<RegistroLocacaoRow> => ({
  id: l.id,
  obra_id: obraId,
  item_locado: l.itemLocado,
  quantidade: l.quantidade ?? null,
  periodo: l.periodo || null,
  data_vencimento: l.dataVencimento,
  fotos: l.fotos || [],
  fornecedor: l.fornecedor || null,
  valor: l.valor || null,
  observacoes: l.observacoes || null,
  status: l.status || 'ativo',
  renovado: Boolean(l.renovado),
  renovado_em: l.renovadoEm || null,
  vencimento_original: l.vencimentoOriginal || null,
  created_at: l.criadoEm,
});

export const toTemplateRow = (t: PresetTipoObra, userId: string): ModeloTemplateRow => ({
  id: t.id,
  nome: t.nome,
  etapas_json: t.etapas,
  criado_por: userId,
  customizado: true,
});
