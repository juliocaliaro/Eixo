import { Tarefa, StatusCronograma } from '../types/obra';

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

/** Tarefa concluída segundo o status padronizado (única definição de "concluída" para métricas). */
export function isTarefaConcluida(tarefa?: Tarefa | null): boolean {
  return getTarefaStatus(tarefa) === 'concluido';
}

/** Quantidade de tarefas concluídas em uma lista. */
export function contarTarefasConcluidas(tarefas: Tarefa[] = []): number {
  return tarefas.filter(isTarefaConcluida).length;
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

