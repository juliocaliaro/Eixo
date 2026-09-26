export interface Tarefa {
  id: string;
  nome: string;
  concluida: boolean;
  concluidaEm?: string;
  anotacoes?: string[];
  fotos?: string[]; // base64 or URL
}

export interface Etapa {
  id: string;
  nome: string;
  tarefas: Tarefa[];
  tipoOrigem?: string; // ex: 'Construcao', 'Reforma', 'Personalizada'
  concluida?: boolean;
  concluidaEm?: string; // Registro de data e horário de conclusão da etapa
}

export type PerfilUsuario = 'construtor' | 'cliente';

export type StatusDecisao = 'pendente' | 'aprovada' | 'recusada';

export interface AssinaturaDecisao {
  autor: PerfilUsuario;
  nomeSignatario: string;
  assinadoEm: string;
  comentario?: string;
}

export interface Decisao {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'acabamento' | 'prazo' | 'custo' | 'projeto' | 'outro';
  impactoFinanceiro?: number; // em Reais (opcional)
  impactoPrazoDias?: number; // em dias (opcional)
  criadaPor: PerfilUsuario;
  criadorNome: string;
  criadaEm: string;
  status: StatusDecisao;
  assinaturaCriador: AssinaturaDecisao;
  assinaturaContraparte?: AssinaturaDecisao;
  fotos?: string[];
}

export type TipoProjeto =
  | 'eletrico'
  | 'hidraulico'
  | 'demolicao'
  | 'arquitetonico'
  | 'estrutural'
  | 'climatizacao'
  | 'marcenaria'
  | 'outro';

export interface ProjetoPDF {
  id: string;
  titulo: string;
  tipo: TipoProjeto;
  tipoCustomizado?: string;
  arquivoNome: string;
  tamanhoBytes: number;
  dataUpload: string;
  enviadoPor: PerfilUsuario;
  enviadoPorNome: string;
  url: string; // base64 data URI ou blob URL
  descricao?: string;
  versao?: string; // ex: 'Rev. 01', 'Final'
}

export interface Obra {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  dataPrevista: string;
  criadaEm: string;
  etapas: Etapa[];
  anexosGerais?: AnexoItem[];
  decisoes?: Decisao[];
  projetos?: ProjetoPDF[];
}

export interface AnexoItem {
  id: string;
  titulo: string;
  tipo: 'foto' | 'anotacao';
  conteudo: string; // url, base64 ou texto da nota
  etapaId?: string;
  etapaNome?: string;
  tarefaId?: string;
  tarefaNome?: string;
  data: string;
}

export interface PresetTarefa {
  id: string;
  nome: string;
}

export interface PresetEtapa {
  id: string;
  nome: string;
  tarefas: PresetTarefa[];
}

export interface PresetTipoObra {
  id: string;
  nome: string;
  etapas: PresetEtapa[];
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  tipo: ToastType;
  titulo: string;
  descricao?: string;
}
