import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  Obra,
  Decisao,
  ProjetoPDF,
  RegistroNota,
  RegistroLocacao,
  AssinaturaDecisao,
  PerfilUsuario,
  PresetTipoObra,
  Etapa,
  Tarefa,
} from '../types/obra';
import {
  loadObrasFromStorage,
  saveObrasToStorage,
  loadTemplatesFromStorage,
  saveTemplatesToStorage,
} from '../utils/storage';
import {
  ensureUUID,
  sanitizeObraUUIDs,
  isValidUUID,
} from '../utils/uuid';
import {
  mapObraFromDb,
  mapEtapaFromDb,
  mapTarefaFromDb,
  mapDecisaoFromDb,
  mapProjetoFromDb,
  mapNotaFromDb,
  mapPunchItemFromDb,
  mapLocacaoFromDb,
  ObraRow,
  EtapaRow,
  TarefaRow,
  TarefaEvidenciaRow,
  DecisaoRow,
  DecisaoAssinaturaRow,
  ProjetoPdfRow,
  RegistroNotaRow,
  PunchListItemRow,
  RegistroLocacaoRow,
} from './dbTypes';

// ==============================================================================
// 0. SISTEMA GLOBAL DE TRACKING DE REQUISIÇÕES DA API & ANIMAÇÕES DE LOAD
// ==============================================================================

type ApiLoadingListener = (isLoading: boolean, details: { count: number; message: string }) => void;
let activeApiRequestsCount = 0;
let currentApiMessage = '';
const apiLoadingListeners = new Set<ApiLoadingListener>();

export const subscribeApiLoading = (listener: ApiLoadingListener) => {
  apiLoadingListeners.add(listener);
  listener(activeApiRequestsCount > 0, {
    count: activeApiRequestsCount,
    message: currentApiMessage,
  });
  return () => {
    apiLoadingListeners.delete(listener);
  };
};

export const trackApi = async <T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  message: string = 'Sincronizando com o servidor...'
): Promise<T> => {
  activeApiRequestsCount++;
  currentApiMessage = message;
  apiLoadingListeners.forEach((l) =>
    l(true, { count: activeApiRequestsCount, message: currentApiMessage })
  );
  try {
    const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
    return await promise;
  } finally {
    activeApiRequestsCount = Math.max(0, activeApiRequestsCount - 1);
    const stillLoading = activeApiRequestsCount > 0;
    if (!stillLoading) {
      currentApiMessage = '';
    }
    apiLoadingListeners.forEach((l) =>
      l(stillLoading, { count: activeApiRequestsCount, message: currentApiMessage })
    );
  }
};

// Deduplicação de requisições ativas em voo para evitar disparos paralelos redundantes
let activeListPromise: Promise<Obra[]> | null = null;
let activeListUserId: string | undefined = undefined;

// ==============================================================================
// 1. OBRAS API (MULTI-DEVICE PERSISTENCE & USER SCOPING)
// ==============================================================================

export const obrasApi = {
  async list(userId?: string): Promise<Obra[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return loadObrasFromStorage(userId);
    }

    // Se já existe uma requisição em andamento para o mesmo usuário, reutiliza o Promise
    if (activeListPromise && activeListUserId === userId) {
      return activeListPromise;
    }

    const currentPromise = trackApi(async () => {
      try {
        // Determina o ID do usuário ativo (passado ou da sessão do Supabase)
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: sessionData } = await supabase!.auth.getSession();
          targetUserId = sessionData?.session?.user?.id;
        }

        let query = supabase!.from('obras').select('*').order('created_at', { ascending: false });

        // Se temos o usuário autenticado, filtra estritamente por suas obras
        if (targetUserId) {
          query = query.or(`construtor_id.eq.${targetUserId},cliente_id.eq.${targetUserId}`);
        }

        const { data: obrasData, error: obrasError } = await query;

        if (obrasError || !obrasData) {
          console.warn('Erro ao carregar obras do Supabase, usando fallback local:', obrasError);
          return loadObrasFromStorage(targetUserId);
        }

        // Se o Supabase retornou vazio e o usuário possui obras salvas no cache local,
        // realiza a migração apenas uma vez para não gerar loops de persistência
        if (obrasData.length === 0 && targetUserId) {
          const migrationKey = 'eixo_migrated_' + targetUserId;
          const alreadyMigrated = typeof window !== 'undefined' ? localStorage.getItem(migrationKey) : null;
          if (!alreadyMigrated) {
            const localObras = loadObrasFromStorage(targetUserId);
            if (localObras && localObras.length > 0) {
              if (typeof window !== 'undefined') localStorage.setItem(migrationKey, 'true');
              console.info('Migrando obras locais para o Supabase sob o usuário:', targetUserId);
              const sanitizadas = localObras.map((o) => sanitizeObraUUIDs(o, targetUserId));
              await this.saveAll(sanitizadas, targetUserId);
              return sanitizadas;
            }
          }
        }

        const obrasCompletas: Obra[] = await Promise.all(
          obrasData.map(async (row: ObraRow) => {
            // 1. Carrega todas as coleções diretas em paralelo
            const [
              etapasRes,
              decisoesRes,
              projetosRes,
              notasRes,
              punchRes,
              locacoesRes,
            ] = await Promise.all([
              supabase!
                .from('etapas')
                .select('*')
                .eq('obra_id', row.id)
                .order('ordem', { ascending: true }),
              supabase!
                .from('decisoes')
                .select('*')
                .eq('obra_id', row.id)
                .order('created_at', { ascending: false }),
              supabase!
                .from('projetos_pdf')
                .select('*')
                .eq('obra_id', row.id)
                .order('created_at', { ascending: false }),
              supabase!
                .from('registro_notas')
                .select('*')
                .eq('obra_id', row.id)
                .order('created_at', { ascending: false }),
              supabase!
                .from('punch_list_items')
                .select('*')
                .eq('obra_id', row.id)
                .order('created_at', { ascending: true }),
              supabase!
                .from('registro_locacoes')
                .select('*')
                .eq('obra_id', row.id)
                .order('data_vencimento', { ascending: true }),
            ]);

            const etapasData = (etapasRes.data || []) as EtapaRow[];
            const etapaIds = etapasData.map((e) => e.id);

            // 2. Otimização em lote (Batching): busca TODAS as tarefas e evidências da obra em apenas 2 queries
            let tarefasData: TarefaRow[] = [];
            let evidenciasData: TarefaEvidenciaRow[] = [];

            if (etapaIds.length > 0) {
              const { data: tData } = await supabase!
                .from('tarefas')
                .select('*')
                .in('etapa_id', etapaIds)
                .order('ordem', { ascending: true });

              tarefasData = (tData as TarefaRow[]) || [];
              const tarefaIds = tarefasData.map((t) => t.id);

              if (tarefaIds.length > 0) {
                const { data: evData } = await supabase!
                  .from('tarefa_evidencias')
                  .select('*')
                  .in('tarefa_id', tarefaIds);

                evidenciasData = (evData as TarefaEvidenciaRow[]) || [];
              }
            }

            // Agrupa evidências por tarefa_id
            const evidenciasByTarefa = new Map<string, TarefaEvidenciaRow[]>();
            for (const ev of evidenciasData) {
              const arr = evidenciasByTarefa.get(ev.tarefa_id) || [];
              arr.push(ev);
              evidenciasByTarefa.set(ev.tarefa_id, arr);
            }

            // Agrupa tarefas mapeadas por etapa_id
            const tarefasByEtapa = new Map<string, Tarefa[]>();
            for (const t of tarefasData) {
              const evList = evidenciasByTarefa.get(t.id) || [];
              const mappedT = mapTarefaFromDb(t, evList);
              const arr = tarefasByEtapa.get(t.etapa_id) || [];
              arr.push(mappedT);
              tarefasByEtapa.set(t.etapa_id, arr);
            }

            const etapasMapeadas = etapasData.map((e) => {
              const tList = tarefasByEtapa.get(e.id) || [];
              return mapEtapaFromDb(e, tList);
            });

            // 3. Otimização em lote: busca assinaturas de todas as decisões em apenas 1 query
            const decisoesData = (decisoesRes.data || []) as DecisaoRow[];
            const decisaoIds = decisoesData.map((d) => d.id);
            let assinaturasData: DecisaoAssinaturaRow[] = [];

            if (decisaoIds.length > 0) {
              const { data: assData } = await supabase!
                .from('decisao_assinaturas')
                .select('*')
                .in('decisao_id', decisaoIds);

              assinaturasData = (assData as DecisaoAssinaturaRow[]) || [];
            }

            const assinaturasByDecisao = new Map<string, DecisaoAssinaturaRow[]>();
            for (const ass of assinaturasData) {
              const arr = assinaturasByDecisao.get(ass.decisao_id) || [];
              arr.push(ass);
              assinaturasByDecisao.set(ass.decisao_id, arr);
            }

            const decisoesMapeadas = decisoesData.map((d) => {
              const aList = assinaturasByDecisao.get(d.id) || [];
              return mapDecisaoFromDb(d, aList);
            });

            // 4. Mapeamento das demais entidades
            const projetosMapeados = ((projetosRes.data || []) as ProjetoPdfRow[]).map(mapProjetoFromDb);
            const notasMapeadas = ((notasRes.data || []) as RegistroNotaRow[]).map(mapNotaFromDb);
            const punchMapeado = ((punchRes.data || []) as PunchListItemRow[]).map(mapPunchItemFromDb);
            const locacoesMapeadas = ((locacoesRes.data || []) as RegistroLocacaoRow[]).map(mapLocacaoFromDb);

            return mapObraFromDb(
              row,
              etapasMapeadas,
              decisoesMapeadas,
              projetosMapeados,
              notasMapeadas,
              punchMapeado,
              locacoesMapeadas
            );
          })
        );

        // Atualiza o cache local com os dados mais recentes da nuvem
        saveObrasToStorage(obrasCompletas, targetUserId);
        return obrasCompletas;
      } catch (err) {
        console.error('Falha de rede Supabase em obrasApi.list:', err);
        return loadObrasFromStorage(userId);
      }
    }, 'Carregando suas obras...');

    activeListPromise = currentPromise;
    activeListUserId = userId;

    try {
      return await currentPromise;
    } finally {
      if (activeListPromise === currentPromise) {
        activeListPromise = null;
        activeListUserId = undefined;
      }
    }
  },

  async saveAll(obras: Obra[], userId?: string): Promise<void> {
    return trackApi(async () => {
      // 1. Sanitiza todas as obras garantindo conformidade estrita com UUIDs
      let targetUserId = userId;
      if (!targetUserId && isSupabaseConfigured() && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        targetUserId = sessionData?.session?.user?.id;
      }

      const sanitizadas = obras.map((o) => sanitizeObraUUIDs(o, targetUserId));

      // Mantém sincronização com o cache local seguro por usuário
      saveObrasToStorage(sanitizadas, targetUserId);

      if (!isSupabaseConfigured() || !supabase || !targetUserId) {
        return;
      }

      // 2. Sincroniza todas as tabelas e relacionamentos com o Supabase
      try {
        for (const obra of sanitizadas) {
          const construtorFinal = obra.construtorId || targetUserId;

          // 1. Obra principal
          await supabase!.from('obras').upsert({
            id: obra.id,
            nome: obra.nome,
            cliente_nome: obra.cliente,
            cliente_id: obra.clienteId || null,
            construtor_id: construtorFinal,
            endereco: obra.endereco,
            data_prevista: obra.dataPrevista,
            orcamento_inicial: obra.orcamentoInicial || 0,
            empresa_responsavel: obra.empresaResponsavel || null,
            updated_at: new Date().toISOString(),
          });

          // 2. Registro de Notas (upload de fotos + Batch Upsert)
          if (obra.notas && obra.notas.length > 0) {
            const notasRows = [];
            for (const nota of obra.notas) {
              const fotosProcessadas: string[] = [];
              for (let i = 0; i < (nota.fotos || []).length; i++) {
                const foto = nota.fotos[i];
                if (foto.startsWith('data:')) {
                  const urlRemota = await storageApi.uploadDataUrl(
                    'registro-notas',
                    `${obra.id}/notas/${nota.id}_${i}`,
                    foto
                  );
                  fotosProcessadas.push(urlRemota);
                } else {
                  fotosProcessadas.push(foto);
                }
              }
              nota.fotos = fotosProcessadas;
              notasRows.push({
                id: nota.id,
                obra_id: obra.id,
                titulo: nota.titulo || null,
                valor: nota.valor || null,
                observacoes: nota.observacoes || null,
                fotos: fotosProcessadas,
                created_at: nota.criadoEm || new Date().toISOString(),
              });
            }
            if (notasRows.length > 0) {
              await supabase!.from('registro_notas').upsert(notasRows);
            }
          }

          // 3. Projetos PDF (upload de pranchas + Batch Upsert)
          if (obra.projetos && obra.projetos.length > 0) {
            const projetosRows = [];
            for (const proj of obra.projetos) {
              let urlRemota = proj.url;
              if (proj.url.startsWith('data:')) {
                urlRemota = await storageApi.uploadDataUrl(
                  'projetos-pdf',
                  `${obra.id}/projetos/${proj.id}_${proj.arquivoNome.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
                  proj.url
                );
                proj.url = urlRemota;
              }

              projetosRows.push({
                id: proj.id,
                obra_id: obra.id,
                titulo: proj.titulo,
                disciplina: proj.tipo,
                disciplina_customizada: proj.tipoCustomizado || null,
                arquivo_nome: proj.arquivoNome,
                tamanho_bytes: proj.tamanhoBytes,
                url: urlRemota,
                versao: proj.versao || 'Rev. 01',
                descricao: proj.descricao || null,
                enviado_por: proj.enviadoPor || 'construtor',
                enviado_por_nome: proj.enviadoPorNome || 'Construtor Responsável',
                created_at: proj.dataUpload || new Date().toISOString(),
              });
            }
            if (projetosRows.length > 0) {
              await supabase!.from('projetos_pdf').upsert(projetosRows);
            }
          }

          // 4. Etapas e Tarefas em lote (Batch Upsert: 1 chamada para etapas, 1 para tarefas, 1 para evidências)
          if (obra.etapas && obra.etapas.length > 0) {
            const etapasRows: any[] = [];
            const tarefasRows: any[] = [];
            const evidenciasRows: any[] = [];

            for (let eIdx = 0; eIdx < obra.etapas.length; eIdx++) {
              const etapa = obra.etapas[eIdx];
              etapasRows.push({
                id: etapa.id,
                obra_id: obra.id,
                nome: etapa.nome,
                tipo_origem: etapa.tipoOrigem || null,
                ordem: eIdx + 1,
                status: etapa.concluida ? 'concluido' : 'pendente',
                concluida: Boolean(etapa.concluida),
                concluida_em: etapa.concluidaEm || null,
              });

              if (etapa.tarefas && etapa.tarefas.length > 0) {
                for (let tIdx = 0; tIdx < etapa.tarefas.length; tIdx++) {
                  const tarefa = etapa.tarefas[tIdx];
                  tarefasRows.push({
                    id: tarefa.id,
                    etapa_id: etapa.id,
                    nome: tarefa.nome,
                    status: tarefa.concluida ? 'concluido' : 'pendente',
                    concluida: Boolean(tarefa.concluida),
                    ordem: tIdx + 1,
                    concluida_em: tarefa.concluidaEm || null,
                  });

                  // Evidências: fotos
                  if (tarefa.fotos && tarefa.fotos.length > 0) {
                    for (let fIdx = 0; fIdx < tarefa.fotos.length; fIdx++) {
                      let fotoUrl = tarefa.fotos[fIdx];
                      if (fotoUrl.startsWith('data:')) {
                        fotoUrl = await storageApi.uploadDataUrl(
                          'evidencias-diario',
                          `${obra.id}/diario/${tarefa.id}_${fIdx}`,
                          fotoUrl
                        );
                        tarefa.fotos[fIdx] = fotoUrl;
                      }
                      evidenciasRows.push({
                        id: ensureUUID(`${tarefa.id}_foto_${fIdx}`),
                        tarefa_id: tarefa.id,
                        tipo: 'foto',
                        conteudo: fotoUrl,
                      });
                    }
                  }

                  // Evidências: anotações
                  if (tarefa.anotacoes && tarefa.anotacoes.length > 0) {
                    for (let aIdx = 0; aIdx < tarefa.anotacoes.length; aIdx++) {
                      const anotacao = tarefa.anotacoes[aIdx];
                      evidenciasRows.push({
                        id: ensureUUID(`${tarefa.id}_anotacao_${aIdx}`),
                        tarefa_id: tarefa.id,
                        tipo: 'anotacao',
                        conteudo: anotacao,
                      });
                    }
                  }
                }
              }
            }

            if (etapasRows.length > 0) {
              await supabase!.from('etapas').upsert(etapasRows);
            }
            if (tarefasRows.length > 0) {
              await supabase!.from('tarefas').upsert(tarefasRows);
            }
            if (evidenciasRows.length > 0) {
              await supabase!.from('tarefa_evidencias').upsert(evidenciasRows);
            }
          }

          // 5. Punch List (Batch Upsert)
          if (obra.punchList && obra.punchList.length > 0) {
            const punchRows = obra.punchList.map((p, pIdx) => ({
              id: p.id,
              obra_id: obra.id,
              ambiente: p.ambiente || 'Geral',
              item: p.item,
              concluido: Boolean(p.concluido),
              ordem: pIdx + 1,
              concluida_em: p.concluidoEm || null,
            }));
            await supabase!.from('punch_list_items').upsert(punchRows);
          }

          // 6. Decisões e Assinaturas (Batch Upsert)
          if (obra.decisoes && obra.decisoes.length > 0) {
            const decisoesRows = [];
            const assinaturasRows = [];
            for (const d of obra.decisoes) {
              decisoesRows.push({
                id: d.id,
                obra_id: obra.id,
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
                updated_at: new Date().toISOString(),
              });

              if (d.assinaturaCriador) {
                assinaturasRows.push({
                  id: ensureUUID(`${d.id}_criador`),
                  decisao_id: d.id,
                  papel: 'criador',
                  autor_perfil: d.assinaturaCriador.autor,
                  nome_signatario: d.assinaturaCriador.nomeSignatario,
                  assinado_em: d.assinaturaCriador.assinadoEm,
                });
              }

              if (d.assinaturaContraparte) {
                assinaturasRows.push({
                  id: ensureUUID(`${d.id}_contraparte`),
                  decisao_id: d.id,
                  papel: 'contraparte',
                  autor_perfil: d.assinaturaContraparte.autor,
                  nome_signatario: d.assinaturaContraparte.nomeSignatario,
                  comentario: d.assinaturaContraparte.comentario || null,
                  assinado_em: d.assinaturaContraparte.assinadoEm,
                });
              }
            }
            if (decisoesRows.length > 0) {
              await supabase!.from('decisoes').upsert(decisoesRows);
            }
            if (assinaturasRows.length > 0) {
              await supabase!.from('decisao_assinaturas').upsert(assinaturasRows);
            }
          }

          // 7. Registro de Locações (Batch Upsert)
          if (obra.locacoes && obra.locacoes.length > 0) {
            const locacoesRows = [];
            for (const loc of obra.locacoes) {
              const fotosProcessadas: string[] = [];
              for (let i = 0; i < (loc.fotos || []).length; i++) {
                const foto = loc.fotos[i];
                if (foto.startsWith('data:')) {
                  let urlRemota = await storageApi.uploadDataUrl(
                    'registro-notas',
                    `${obra.id}/locacoes/${loc.id}_${i}`,
                    foto
                  );
                  if (urlRemota.startsWith('data:')) {
                    // Fallback para evidencias-diario se registro-notas falhar
                    urlRemota = await storageApi.uploadDataUrl(
                      'evidencias-diario',
                      `${obra.id}/locacoes/${loc.id}_${i}`,
                      foto
                    );
                  }
                  fotosProcessadas.push(urlRemota);
                } else {
                  fotosProcessadas.push(foto);
                }
              }
              loc.fotos = fotosProcessadas;
              locacoesRows.push({
                id: loc.id,
                obra_id: obra.id,
                item_locado: loc.itemLocado,
                periodo: loc.periodo || null,
                data_vencimento: loc.dataVencimento,
                fotos: fotosProcessadas,
                fornecedor: loc.fornecedor || null,
                valor: loc.valor || null,
                observacoes: loc.observacoes || null,
                status: loc.status || 'ativo',
                renovado: loc.renovado || false,
                renovado_em: loc.renovadoEm || null,
                vencimento_original: loc.vencimentoOriginal || null,
                created_at: loc.criadoEm || new Date().toISOString(),
              });
            }
            if (locacoesRows.length > 0) {
              try {
                const { error: upsertErr } = await supabase!.from('registro_locacoes').upsert(locacoesRows);
                if (upsertErr) {
                  // Fallback se a coluna periodo não existir no banco
                  if (upsertErr.message?.includes('periodo') || upsertErr.code === 'PGRST204') {
                    const fallbackRows = locacoesRows.map(({ periodo, ...rest }) => rest);
                    const { error: retryErr } = await supabase!.from('registro_locacoes').upsert(fallbackRows);
                    if (retryErr) {
                      console.error('Erro ao salvar locações no Supabase (retry sem periodo):', retryErr);
                    }
                  } else {
                    console.error('Erro ao salvar locações no Supabase:', upsertErr);
                  }
                }
              } catch (err) {
                console.error('Falha de rede em registro_locacoes upsert:', err);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar obras completas com Supabase:', err);
      }
    }, 'Salvando na nuvem...');
  },

  async delete(obraId: string): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        const { error } = await supabase.from('obras').delete().eq('id', obraId);
        if (error) {
          console.warn('Erro ao excluir obra no Supabase:', error);
        }
      } catch (err) {
        console.error('Falha ao excluir obra:', err);
      }
    }, 'Excluindo obra...');
  },
};

// ==============================================================================
// 2. DECISÕES & ASSINATURA DIGITAL API
// ==============================================================================

export const decisoesApi = {
  async create(obraId: string, decisao: Decisao): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;

      try {
        const { error } = await supabase.from('decisoes').insert({
          id: decisao.id,
          obra_id: obraId,
          titulo: decisao.titulo,
          descricao: decisao.descricao,
          categoria: decisao.categoria || 'outro',
          tipo_impacto: decisao.tipoImpactoFinanceiro || 'nenhum',
          valor_aditivo: decisao.valorAditivo || 0,
          valor_supressivo: decisao.valorSupressivo || 0,
          impacto_financeiro: decisao.impactoFinanceiro || 0,
          impacto_prazo_dias: decisao.impactoPrazoDias || 0,
          status: decisao.status,
          criada_por: decisao.criadaPor,
          criador_nome: decisao.criadorNome,
          fotos: decisao.fotos || [],
        });

        if (error) throw error;

        if (decisao.assinaturaCriador) {
          await supabase.from('decisao_assinaturas').insert({
            id: ensureUUID(`${decisao.id}_criador`),
            decisao_id: decisao.id,
            papel: 'criador',
            autor_perfil: decisao.assinaturaCriador.autor,
            nome_signatario: decisao.assinaturaCriador.nomeSignatario,
            assinado_em: decisao.assinaturaCriador.assinadoEm,
          });
        }
      } catch (err) {
        console.error('Erro ao persistir decisão no Supabase:', err);
      }
    }, 'Registrando decisão...');
  },

  async sign(decisaoId: string, assinatura: AssinaturaDecisao): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;

      try {
        await supabase
          .from('decisoes')
          .update({ status: 'aprovada', updated_at: new Date().toISOString() })
          .eq('id', decisaoId);

        await supabase.from('decisao_assinaturas').insert({
          id: ensureUUID(`${decisaoId}_contraparte`),
          decisao_id: decisaoId,
          papel: 'contraparte',
          autor_perfil: assinatura.autor,
          nome_signatario: assinatura.nomeSignatario,
          comentario: assinatura.comentario || null,
          assinado_em: assinatura.assinadoEm,
        });
      } catch (err) {
        console.error('Erro ao assinar decisão no Supabase:', err);
      }
    }, 'Gravando assinatura digital...');
  },

  async reject(decisaoId: string): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;

      try {
        await supabase
          .from('decisoes')
          .update({ status: 'recusada', updated_at: new Date().toISOString() })
          .eq('id', decisaoId);
      } catch (err) {
        console.error('Erro ao recusar decisão no Supabase:', err);
      }
    }, 'Registrando recusa da decisão...');
  },
};

export const locacoesApi = {
  async upsert(locacao: RegistroLocacao, obraId?: string): Promise<boolean> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return false;
      const targetObraId = locacao.obraId || obraId;
      if (!targetObraId) return false;

      try {
        // Se ainda houver fotos locais em formato data: URL, faz upload para o Storage
        let fotosFinais = [...(locacao.fotos || [])];
        if (fotosFinais.some((f) => f.startsWith('data:'))) {
          const processadas: string[] = [];
          for (let i = 0; i < fotosFinais.length; i++) {
            const foto = fotosFinais[i];
            if (foto.startsWith('data:')) {
              let urlRemota = await storageApi.uploadDataUrl(
                'registro-notas',
                `${targetObraId}/locacoes/${locacao.id}_${i}`,
                foto
              );
              if (urlRemota.startsWith('data:')) {
                urlRemota = await storageApi.uploadDataUrl(
                  'evidencias-diario',
                  `${targetObraId}/locacoes/${locacao.id}_${i}`,
                  foto
                );
              }
              processadas.push(urlRemota);
            } else {
              processadas.push(foto);
            }
          }
          fotosFinais = processadas;
          locacao.fotos = processadas;
        }

        const payload: any = {
          id: locacao.id,
          obra_id: targetObraId,
          item_locado: locacao.itemLocado,
          data_vencimento: locacao.dataVencimento,
          fotos: fotosFinais,
          fornecedor: locacao.fornecedor || null,
          valor: locacao.valor || null,
          observacoes: locacao.observacoes || null,
          status: locacao.status || 'ativo',
          renovado: locacao.renovado || false,
          renovado_em: locacao.renovadoEm || null,
          vencimento_original: locacao.vencimentoOriginal || null,
          created_at: locacao.criadoEm || new Date().toISOString(),
        };

        if (locacao.periodo) {
          payload.periodo = locacao.periodo;
        }

        const { error } = await supabase.from('registro_locacoes').upsert(payload);
        if (error) {
          // Se a coluna 'periodo' não existir no banco, retenta sem a coluna 'periodo'
          if (error.message?.includes('periodo') || error.code === 'PGRST204') {
            delete payload.periodo;
            const retry = await supabase.from('registro_locacoes').upsert(payload);
            if (retry.error) {
              console.error('Erro ao salvar locação no Supabase (retry sem periodo):', retry.error);
              return false;
            }
            return true;
          }
          console.error('Erro ao salvar locação no Supabase:', error);
          return false;
        }
        return true;
      } catch (err) {
        console.error('Falha de rede ao salvar locação:', err);
        return false;
      }
    }, 'Salvando locação na nuvem...');
  },

  async delete(locacaoId: string, fotos?: string[]): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        if (fotos && fotos.length > 0) {
          for (const fotoUrl of fotos) {
            await storageApi.deleteFileFromUrl('registro-notas', fotoUrl);
            await storageApi.deleteFileFromUrl('evidencias-diario', fotoUrl);
          }
        }
        await supabase.from('registro_locacoes').delete().eq('id', locacaoId);
      } catch (err) {
        console.warn('Erro ao excluir registro de locação no Supabase:', err);
      }
    }, 'Excluindo locação e arquivos...');
  },

  async updateStatus(locacaoId: string, status: 'ativo' | 'devolvido'): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        await supabase.from('registro_locacoes').update({ status }).eq('id', locacaoId);
      } catch (err) {
        console.warn('Erro ao atualizar status da locação no Supabase:', err);
      }
    }, 'Atualizando locação...');
  },
};

export const notasApi = {
  async delete(notaId: string, fotos?: string[]): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        // 1. Apaga arquivos associados no Supabase Storage
        if (fotos && fotos.length > 0) {
          for (const fotoUrl of fotos) {
            await storageApi.deleteFileFromUrl('registro-notas', fotoUrl);
          }
        }
        // 2. Apaga o registro da tabela
        await supabase.from('registro_notas').delete().eq('id', notaId);
      } catch (err) {
        console.warn('Erro ao excluir nota no Supabase:', err);
      }
    }, 'Excluindo nota e arquivos...');
  },
};

export const projetosApi = {
  async delete(projetoId: string, url?: string): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        if (url) {
          await storageApi.deleteFileFromUrl('projetos-pdf', url);
        }
        await supabase.from('projetos_pdf').delete().eq('id', projetoId);
      } catch (err) {
        console.warn('Erro ao excluir projeto no Supabase:', err);
      }
    }, 'Excluindo projeto e arquivo...');
  },
};

export const evidenciasApi = {
  async deleteFoto(tarefaId: string, fotoUrl: string): Promise<void> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        if (fotoUrl) {
          await storageApi.deleteFileFromUrl('evidencias-diario', fotoUrl);
          await supabase
            .from('tarefa_evidencias')
            .delete()
            .eq('tarefa_id', tarefaId)
            .eq('conteudo', fotoUrl);
        }
      } catch (err) {
        console.warn('Erro ao excluir foto de evidência no Supabase:', err);
      }
    }, 'Excluindo evidência...');
  },
};

// ==============================================================================
// 3. STORAGE & ARQUIVOS API
// ==============================================================================

export const storageApi = {
  dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } | null {
    try {
      const arr = dataUrl.split(',');
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return { blob: new Blob([u8arr], { type: mime }), mime };
    } catch {
      return null;
    }
  },

  async uploadBlob(bucket: string, path: string, blob: Blob, mimeType = 'image/jpeg'): Promise<string | null> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return null;
      try {
        const { error } = await supabase.storage.from(bucket).upload(path, blob, {
          contentType: mimeType,
          upsert: true,
        });

        if (error) {
          // Se falhou no bucket registro-notas, tenta fallback em evidencias-diario
          if (bucket === 'registro-notas') {
            const fallback = await supabase.storage.from('evidencias-diario').upload(path, blob, {
              contentType: mimeType,
              upsert: true,
            });
            if (!fallback.error) {
              const { data } = supabase.storage.from('evidencias-diario').getPublicUrl(path);
              return data.publicUrl || null;
            }
          }
          console.error(`Erro ao fazer upload no bucket ${bucket}:`, error);
          return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl || null;
      } catch (err) {
        if (bucket === 'registro-notas') {
          try {
            const fallback = await supabase.storage.from('evidencias-diario').upload(path, blob, {
              contentType: mimeType,
              upsert: true,
            });
            if (!fallback.error) {
              const { data } = supabase.storage.from('evidencias-diario').getPublicUrl(path);
              return data.publicUrl || null;
            }
          } catch {}
        }
        console.error(`Falha de rede ao enviar arquivo para ${bucket}:`, err);
        return null;
      }
    }, 'Enviando imagem...');
  },

  async deleteFileFromUrl(bucket: string, url: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !url) return false;
    try {
      // Ignora se for data: url local
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;

      const marker = `/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return false;
      const pathWithQuery = url.substring(idx + marker.length);
      const filePath = decodeURIComponent(pathWithQuery.split('?')[0]);
      if (!filePath) return false;

      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) {
        console.warn(`Erro ao excluir arquivo ${filePath} no bucket ${bucket}:`, error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`Falha ao excluir arquivo do bucket ${bucket}:`, err);
      return false;
    }
  },

  async uploadDataUrl(bucket: string, path: string, dataUrl: string): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) return dataUrl;
    if (!dataUrl.startsWith('data:')) return dataUrl;

    try {
      const parsed = this.dataUrlToBlob(dataUrl);
      if (!parsed) return dataUrl;

      const ext = parsed.mime.includes('png') ? 'png' : parsed.mime.includes('pdf') ? 'pdf' : 'jpg';
      const fullPath = path.includes('.') ? path : `${path}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(fullPath, parsed.blob, {
        contentType: parsed.mime,
        upsert: true,
      });

      if (error) {
        if (bucket === 'registro-notas') {
          const fallback = await supabase.storage.from('evidencias-diario').upload(fullPath, parsed.blob, {
            contentType: parsed.mime,
            upsert: true,
          });
          if (!fallback.error) {
            const { data } = supabase.storage.from('evidencias-diario').getPublicUrl(fullPath);
            return data.publicUrl || dataUrl;
          }
        }
        return dataUrl;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      return data.publicUrl || dataUrl;
    } catch (err) {
      return dataUrl;
    }
  },

  async uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) return null;

      try {
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
        });

        if (error) throw error;

        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      } catch (err) {
        console.error(`Erro ao fazer upload no bucket ${bucket}:`, err);
        return null;
      }
    }, 'Enviando arquivo para o armazenamento...');
  },
};

// ==============================================================================
// 4. AUTENTICAÇÃO REAL COM SUPABASE AUTH & CONTROLE DE SESSÃO
// ==============================================================================

export const authApi = {
  async signUp(params: {
    email: string;
    password: string;
    nome: string;
    role: 'Construtor' | 'Cliente';
    empresa?: string;
  }): Promise<{ user: any; session: any; error: string | null }> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) {
        return { user: { id: ensureUUID(), email: params.email }, session: null, error: null };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              nome: params.nome,
              role: params.role.toLowerCase(),
              empresa: params.empresa || null,
            },
          },
        });

        if (error) {
          return { user: null, session: null, error: error.message };
        }

        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: params.email,
              nome: params.nome,
              role: params.role.toLowerCase(),
              empresa: params.empresa || null,
              updated_at: new Date().toISOString(),
            });
          } catch (profileErr) {
            console.warn('Erro ao atualizar profile no banco:', profileErr);
          }
        }

        return { user: data.user, session: data.session, error: null };
      } catch (err: any) {
        return { user: null, session: null, error: err?.message || 'Falha na comunicação com o servidor de autenticação.' };
      }
    }, 'Cadastrando usuário...');
  },

  async signIn(email: string, password: string): Promise<{ user: any; session: any; error: string | null }> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) {
        return { user: { id: ensureUUID(), email }, session: null, error: null };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { user: null, session: null, error: error.message };
        }

        return { user: data.user, session: data.session, error: null };
      } catch (err: any) {
        return { user: null, session: null, error: err?.message || 'Falha ao autenticar usuário.' };
      }
    }, 'Autenticando...');
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {}
  },

  async resetPassword(email: string): Promise<{ error: string | null }> {
    return trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) {
        return { error: 'Serviço de autenticação não configurado.' };
      }
      try {
        const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        if (error) {
          return { error: error.message };
        }
        return { error: null };
      } catch (err: any) {
        return { error: err?.message || 'Falha ao solicitar redefinição de senha.' };
      }
    }, 'Enviando redefinição de senha...');
  },

  async getSession(): Promise<any> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session || null;
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<any> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async getProfile(userId: string): Promise<any> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      return data;
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured() || !supabase) {
      return { unsubscribe: () => {} };
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data.subscription;
  },
};

// Deduplicação em voo para templates
let activeTemplatesPromise: Promise<PresetTipoObra[]> | null = null;

// ==============================================================================
// 5. TEMPLATES DE ETAPAS & MODELOS DE OBRA
// ==============================================================================

export const templatesApi = {
  async list(): Promise<PresetTipoObra[]> {
    if (activeTemplatesPromise) {
      return activeTemplatesPromise;
    }

    const currentPromise = trackApi(async () => {
      if (!isSupabaseConfigured() || !supabase) {
        return loadTemplatesFromStorage();
      }

      try {
        const { data, error } = await supabase.from('modelos_etapas_templates').select('*');
        if (error || !data || data.length === 0) {
          return loadTemplatesFromStorage();
        }
        return data.map((row: any) => ({
          id: row.id,
          nome: row.nome,
          etapas: row.etapas_json || [],
        }));
      } catch {
        return loadTemplatesFromStorage();
      }
    }, 'Carregando modelos de obra...');

    activeTemplatesPromise = currentPromise;
    try {
      return await currentPromise;
    } finally {
      activeTemplatesPromise = null;
    }
  },

  async save(templates: PresetTipoObra[]): Promise<void> {
    return trackApi(async () => {
      saveTemplatesToStorage(templates);

      if (!isSupabaseConfigured() || !supabase) return;

      try {
        for (const t of templates) {
          await supabase.from('modelos_etapas_templates').upsert({
            id: t.id,
            nome: t.nome,
            etapas_json: t.etapas,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Erro ao salvar templates no Supabase:', err);
      }
    }, 'Salvando modelos de obra...');
  },
};
