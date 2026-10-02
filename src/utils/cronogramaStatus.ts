import { Tarefa, Etapa, StatusCronograma } from '../types/obra';

/**
 * Determina o status padronizado de uma tarefa:
 * - 'concluido' — atividade finalizada (concluida === true)
 * - 'em_andamento' — atividade iniciada e ainda não finalizada (ex: possui fotos/notas anexadas ou status manual)
 * - 'pendente' — atividade ainda não iniciada ou planejada para execução futura
 */
export function getTarefaStatus(tarefa?: Tarefa | null): StatusCronograma {
  if (!tarefa) {
    return 'pendente';
  }
  if (tarefa.concluida) {
    return 'concluido';
  }
  if (tarefa.status && (tarefa.status === 'concluido' || tarefa.status === 'em_andamento' || tarefa.status === 'pendente')) {
    return tarefa.status;
  }
  const temFotos = Array.isArray(tarefa.fotos) && tarefa.fotos.length > 0;
  const temNotas = Array.isArray(tarefa.anotacoes) && tarefa.anotacoes.length > 0;
  if (temFotos || temNotas) {
    return 'em_andamento';
  }
  return 'pendente';
}

/**
 * Determina o status consolidado de uma etapa:
 * - 'concluido' — todas as tarefas finalizadas
 * - 'em_andamento' — pelo menos uma tarefa iniciada ou concluída, mas nem todas finalizadas
 * - 'pendente' — nenhuma tarefa iniciada
 */
export function getEtapaStatus(etapa?: Etapa | null): StatusCronograma {
  if (!etapa) return 'pendente';
  const tarefas = etapa.tarefas || [];
  if (tarefas.length === 0) return 'pendente';

  const statuses = tarefas.map(getTarefaStatus);
  const todasConcluidas = statuses.every((s) => s === 'concluido');
  if (todasConcluidas) return 'concluido';

  const algumaIniciada = statuses.some((s) => s === 'concluido' || s === 'em_andamento');
  if (algumaIniciada) return 'em_andamento';

  return 'pendente';
}

/**
 * Rótulo e estilos padronizados dos 3 status (sem vermelho):
 * Concluído: Verde (#15803d)
 * Em andamento: Âmbar (#b45309)
 * Pendente: Cinza Neutro (#4b5563)
 */
export const STATUS_CRONOGRAMA_CONFIG: Record<
  StatusCronograma,
  {
    label: string;
    corTexto: string;
    corFundo: string;
    corBorda: string;
    descricao: string;
    badgeClass: string;
  }
> = {
  concluido: {
    label: 'Concluído',
    corTexto: '#15803d',
    corFundo: '#dcfce7',
    corBorda: '#bbf7d0',
    descricao: 'Atividade finalizada',
    badgeClass: 'badge-ok',
  },
  em_andamento: {
    label: 'Em andamento',
    corTexto: '#b45309',
    corFundo: '#fef3c7',
    corBorda: '#fde68a',
    descricao: 'Atividade iniciada e em execução no canteiro',
    badgeClass: 'badge-em-andamento',
  },
  pendente: {
    label: 'Pendente',
    corTexto: '#4b5563',
    corFundo: '#f3f4f6',
    corBorda: '#e5e7eb',
    descricao: 'Atividade planejada a executar',
    badgeClass: 'badge-pendente',
  },
};

