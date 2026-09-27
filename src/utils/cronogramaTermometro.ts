export interface TermometroPrazoResult {
  status: 'concluida' | 'em_dia' | 'atencao' | 'atrasado' | 'vencido';
  label: string;
  descricao: string;
  cor: string;
  bg: string;
  border: string;
  diasRestantes: number;
  diasAtraso?: number;
  tempoDecorridoPct: number;
}

export function calcularTermometroPrazo(
  criadaEm: string,
  dataPrevista: string,
  percentualConcluido: number
): TermometroPrazoResult {
  if (percentualConcluido >= 100) {
    return {
      status: 'concluida',
      label: 'Obra Concluída',
      descricao: '100% das etapas e serviços cumpridos',
      cor: '#15803d',
      bg: '#dcfce7',
      border: '#bbf7d0',
      diasRestantes: 0,
      tempoDecorridoPct: 100,
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let inicio = new Date(criadaEm);
  if (isNaN(inicio.getTime())) {
    inicio = new Date();
  }
  inicio.setHours(0, 0, 0, 0);

  let prevista = new Date(dataPrevista);
  if (isNaN(prevista.getTime())) {
    return {
      status: 'em_dia',
      label: 'Prazo Indefinido',
      descricao: 'Data de término não configurada',
      cor: '#6e512b',
      bg: '#f8f3ed',
      border: '#e2cfb6',
      diasRestantes: 0,
      tempoDecorridoPct: 0,
    };
  }
  prevista.setHours(0, 0, 0, 0);

  const totalMs = prevista.getTime() - inicio.getTime();
  const totalDias = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

  const decorridoMs = hoje.getTime() - inicio.getTime();
  const decorridoDias = Math.max(0, Math.round(decorridoMs / (1000 * 60 * 60 * 24)));

  const tempoDecorridoPct = Math.min(100, Math.max(0, Math.round((decorridoDias / totalDias) * 100)));
  const diasRestantesMs = prevista.getTime() - hoje.getTime();
  const diasRestantes = Math.round(diasRestantesMs / (1000 * 60 * 60 * 24));

  // 1. Prazo Ultrapassado (Hoje já passou da data de previsão)
  if (diasRestantes < 0) {
    const diasAtraso = Math.abs(diasRestantes);
    return {
      status: 'vencido',
      label: `Prazo Ultrapassado (${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'})`,
      descricao: 'Data prevista de entrega superada com serviços pendentes',
      cor: '#b91c1c',
      bg: '#fee2e2',
      border: '#fca5a5',
      diasRestantes: 0,
      diasAtraso,
      tempoDecorridoPct: 100,
    };
  }

  // 2. Risco de Atraso (Tempo decorrido muito superior ao avanço físico, ex: 60% do tempo gasto mas só 35% concluído)
  const diferencaPct = tempoDecorridoPct - percentualConcluido;

  if (diferencaPct > 20) {
    return {
      status: 'atrasado',
      label: 'Risco de Atraso',
      descricao: `Tempo decorrido (${tempoDecorridoPct}%) superior ao avanço físico (${percentualConcluido}%)`,
      cor: '#c2350a',
      bg: 'var(--coral-glow-50)',
      border: 'var(--coral-glow-300)',
      diasRestantes,
      tempoDecorridoPct,
    };
  }

  // 3. Atenção ao Ritmo
  if (diferencaPct > 10) {
    return {
      status: 'atencao',
      label: 'Atenção ao Ritmo',
      descricao: 'Pequena defasagem em relação ao cronograma planejado',
      cor: '#b45309',
      bg: '#fef3c7',
      border: '#fde68a',
      diasRestantes,
      tempoDecorridoPct,
    };
  }

  // 4. Cronograma em Dia
  return {
    status: 'em_dia',
    label: 'Cronograma em Dia',
    descricao: 'Avanço físico alinhado à previsão planejada',
    cor: '#15803d',
    bg: '#dcfce7',
    border: '#bbf7d0',
    diasRestantes,
    tempoDecorridoPct,
  };
}
