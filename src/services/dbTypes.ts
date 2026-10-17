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
  created_at: string;
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
    emailsClientes: Array.isArray(row.emails_clientes)
      ? row.emails_clientes.filter((em): em is string => typeof em === 'string' && em.trim().length > 0).map((em) => em.trim().toLowerCase())
      : (row as any).emails_clientes && typeof (row as any).emails_clientes === 'string'
      ? [(row as any).emails_clientes.trim().toLowerCase()]
      : undefined,
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
  const fotos = evidencias
    .filter((e) => e.tipo === 'foto')
    .map((e) => e.conteudo);

  // Extrai ambiente se foi sincronizado via anotação especial ou da própria coluna row.ambiente
  const ambienteEvidencia = evidencias.find(
    (e) => e.tipo === 'anotacao' && e.conteudo.startsWith('__AMBIENTE__:')
  );
  const ambienteExtraido = ambienteEvidencia
    ? ambienteEvidencia.conteudo.replace('__AMBIENTE__:', '').trim()
    : undefined;
  const ambienteFinal =
    ambienteExtraido && ambienteExtraido !== '__NONE__'
      ? ambienteExtraido
      : row.ambiente && row.ambiente.trim().length > 0
      ? row.ambiente.trim()
      : undefined;

  const anotacoes = evidencias
    .filter((e) => e.tipo === 'anotacao' && !e.conteudo.startsWith('__AMBIENTE__:'))
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
      ? {
          autor: assinCriador.autor_perfil,
          nomeSignatario: assinCriador.nome_signatario,
          assinadoEm: assinCriador.assinado_em,
          comentario: assinCriador.comentario || undefined,
        }
      : {
          autor: row.criada_por,
          nomeSignatario: row.criador_nome,
          assinadoEm: row.created_at,
        },
    assinaturaContraparte: assinContraparte
      ? {
          autor: assinContraparte.autor_perfil,
          nomeSignatario: assinContraparte.nome_signatario,
          assinadoEm: assinContraparte.assinado_em,
          comentario: assinContraparte.comentario || undefined,
        }
      : undefined,
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
