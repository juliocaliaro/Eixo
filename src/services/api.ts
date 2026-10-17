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
  getDeletedEntityIds,
  markEntityAsDeleted,
  unmarkEntityAsDeleted,
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
  async list(userId?: string, userRole?: string, userEmail?: string): Promise<Obra[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return loadObrasFromStorage(userId, userEmail);
    }

    const cacheKey = `${userId || ''}_${userRole || ''}_${userEmail || ''}`;
    // Se já existe uma requisição em andamento para a mesma chave, reutiliza o Promise
    if (activeListPromise && activeListUserId === cacheKey) {
      return activeListPromise;
    }

    const currentPromise = trackApi(async () => {
      try {
        // Determina o ID do usuário ativo (passado ou da sessão do Supabase)
        let targetUserId = userId;
        let targetUserEmail = userEmail;
        let targetUserRole = userRole;

        const { data: sessionData } = await supabase!.auth.getSession();
        const sessionUser = sessionData?.session?.user;

        if (!targetUserId && sessionUser) {
          targetUserId = sessionUser.id;
        }
        if (!targetUserEmail && sessionUser?.email) {
          targetUserEmail = sessionUser.email;
        }
        if (!targetUserRole && sessionUser) {
          const meta = sessionUser.user_metadata || {};
          if (meta.role) targetUserRole = meta.role;
        }

        const isClient = targetUserRole && targetUserRole.toLowerCase() === 'cliente';

        let query = supabase!.from('obras').select('*').order('created_at', { ascending: false });

        // Se for construtor autenticado, filtra diretamente por construtor_id
        if (targetUserId && !isClient) {
          query = query.eq('construtor_id', targetUserId);
        } else if (isClient) {
          // Para cliente: com Supabase RLS ativa, supabase.from('obras').select('*')
          // já aplica a política de segurança baseada na sessão JWT do cliente.
          // Além disso, se o filtro explícito falhar devido à coluna emails_clientes ainda não estar migrada,
          // uma consulta resiliente busca sem quebrar.
          if (targetUserEmail) {
            const cleanEmail = targetUserEmail.trim().toLowerCase();
            try {
              // Tenta filtrar por cliente_id, cliente_email ou emails_clientes contendo o e-mail
              if (targetUserId) {
                query = query.or(`cliente_id.eq.${targetUserId},cliente_email.ilike.${cleanEmail},emails_clientes.cs.{${cleanEmail}}`);
              } else {
                query = query.or(`cliente_email.ilike.${cleanEmail},emails_clientes.cs.{${cleanEmail}}`);
              }
            } catch {
              // Se a sintaxe de array não for suportada, a consulta padrão abaixo cobrirá via RLS
            }
          } else if (targetUserId) {
            query = query.eq('cliente_id', targetUserId);
          }
        }

        let { data: obrasData, error: obrasError } = await query;

        // Se ocorreu erro no filtro específico (ex: PostgREST .cs. ou coluna emails_clientes não existente),
        // faz fallback seguro para a query padrão sem filtro estrito (deixando o RLS do Supabase atuar)
        if (obrasError && isClient) {
          console.warn('Query específica de cliente falhou, tentando fallback com RLS do Supabase:', obrasError);
          const fallbackRes = await supabase!.from('obras').select('*').order('created_at', { ascending: false });
          if (!fallbackRes.error && fallbackRes.data) {
            obrasData = fallbackRes.data;
            obrasError = null;
          }
        }

        if (obrasError || !obrasData) {
          console.warn('Erro ao carregar obras do Supabase, usando fallback local:', obrasError);
          return loadObrasFromStorage(targetUserId, targetUserEmail);
        }

        // Se for cliente e tivermos e-mail, realiza uma filtragem complementar em memória para segurança
        if (isClient && targetUserEmail && obrasData.length > 0) {
          const cleanEmail = targetUserEmail.trim().toLowerCase();
          const filtered = obrasData.filter((row: any) => {
            const matchesClienteId = targetUserId && row.cliente_id === targetUserId;
            const matchesClienteEmail =
              typeof row.cliente_email === 'string' &&
              row.cliente_email.trim().toLowerCase() === cleanEmail;
            const emailsArr: string[] = Array.isArray(row.emails_clientes)
              ? row.emails_clientes
              : typeof row.emails_clientes === 'string'
              ? [row.emails_clientes]
              : [];
            const matchesEmailsArr = emailsArr.some(
              (em) => typeof em === 'string' && em.trim().toLowerCase() === cleanEmail
            );
            // Se o RLS já liberou e o cliente não possui vínculo explícito na linha, mantemos se bate qualquer vínculo
            return matchesClienteId || matchesClienteEmail || matchesEmailsArr;
          });
          // Se o filtro em memória encontrou obras correspondentes, adota a lista filtrada
          if (filtered.length > 0) {
            obrasData = filtered;
          }
        }

        // Se o Supabase retornou vazio e o usuário possui obras salvas no cache local,
        // realiza a migração apenas uma vez para não gerar loops de persistência (apenas para construtor)
        if (obrasData.length === 0 && targetUserId && !isClient) {
          const migrationKey = 'eixo_migrated_' + targetUserId;
          const alreadyMigrated = typeof window !== 'undefined' ? localStorage.getItem(migrationKey) : null;
          if (!alreadyMigrated) {
            const localObras = loadObrasFromStorage(targetUserId, targetUserEmail);
            if (localObras && localObras.length > 0) {
              if (typeof window !== 'undefined') localStorage.setItem(migrationKey, 'true');
              console.info('Migrando obras locais para o Supabase sob o usuário:', targetUserId);
              const sanitizadas = localObras.map((o) => sanitizeObraUUIDs(o, targetUserId));
              await this.saveAll(sanitizadas, targetUserId);
              return sanitizadas;
            }
          }
        }

        const deletedIds = getDeletedEntityIds();
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

            // Agrupa tarefas mapeadas por etapa_id (ignorando entidades excluídas no tombstone)
            const tarefasByEtapa = new Map<string, Tarefa[]>();
            for (const t of tarefasData) {
              if (deletedIds.has(t.id)) continue;
              const evList = evidenciasByTarefa.get(t.id) || [];
              const mappedT = mapTarefaFromDb(t, evList);
              const arr = tarefasByEtapa.get(t.etapa_id) || [];
              arr.push(mappedT);
              tarefasByEtapa.set(t.etapa_id, arr);
            }

            const etapasMapeadas = etapasData
              .filter((e) => !deletedIds.has(e.id))
              .map((e) => {
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

        // Mescla com cache local para resiliência: se o banco ainda não possuir a coluna 'ambientes'
        // ou 'ambiente', os agrupamentos criados localmente não se perdem no refresh (F5).
        const localObras = loadObrasFromStorage(targetUserId, targetUserEmail);
        const obrasCompletasMerged = obrasCompletas.map((cloudObra) => {
          const localObra = localObras.find((lo) => lo.id === cloudObra.id);
          if (!localObra) return cloudObra;

          const etapasMerged = cloudObra.etapas
            .filter((ce) => !deletedIds.has(ce.id))
            .map((cloudEtapa) => {
              const localEtapa = localObra.etapas.find((le) => le.id === cloudEtapa.id);
              if (!localEtapa) return cloudEtapa;

              const ambientesSet = new Set<string>(cloudEtapa.ambientes || []);
              (localEtapa.ambientes || []).forEach((amb) => {
                if (typeof amb === 'string' && amb.trim().length > 0) {
                  ambientesSet.add(amb.trim());
                }
              });

              const tarefasMerged = cloudEtapa.tarefas
                .filter((ct) => !deletedIds.has(ct.id))
                .map((cloudTarefa) => {
                  const localTarefa = localEtapa.tarefas.find((lt) => lt.id === cloudTarefa.id);
                  const amb = cloudTarefa.ambiente || localTarefa?.ambiente;
                  if (amb && amb.trim().length > 0) ambientesSet.add(amb.trim());
                  return {
                    ...cloudTarefa,
                    ambiente: amb,
                  };
                });

              return {
                ...cloudEtapa,
                ambientes: ambientesSet.size > 0 ? Array.from(ambientesSet) : undefined,
                tarefas: tarefasMerged,
              };
            });

          return {
            ...cloudObra,
            etapas: etapasMerged,
          };
        });

        // Atualiza o cache local com os dados mesclados
        saveObrasToStorage(obrasCompletasMerged, targetUserId);
        return obrasCompletasMerged;
      } catch (err) {
        console.error('Falha de rede Supabase em obrasApi.list:', err);
        return loadObrasFromStorage(userId, userEmail);
      }
    }, 'Carregando suas obras...');

    activeListPromise = currentPromise;
    activeListUserId = cacheKey;

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

          // 1. Obra principal (com tratamento resiliente para cliente_email e emails_clientes)
          const cleanEmailsClientes = Array.isArray(obra.emailsClientes)
            ? obra.emailsClientes
                .filter((em): em is string => typeof em === 'string' && em.trim().length > 0)
                .map((em) => em.trim().toLowerCase())
            : [];

          const obraPayload: any = {
            id: obra.id,
            nome: obra.nome,
            cliente_nome: obra.cliente,
            cliente_id: obra.clienteId || null,
            cliente_email: obra.clienteEmail ? obra.clienteEmail.trim().toLowerCase() : null,
            emails_clientes: cleanEmailsClientes,
            construtor_id: construtorFinal,
            endereco: obra.endereco,
            data_prevista: obra.dataPrevista,
            orcamento_inicial: obra.orcamentoInicial || 0,
            empresa_responsavel: obra.empresaResponsavel || null,
            updated_at: new Date().toISOString(),
          };

          const { error: obraUpsertErr } = await supabase!.from('obras').upsert(obraPayload);
          if (obraUpsertErr) {
            // Se as novas colunas ainda não existirem no schema do Supabase, tenta fallback sem elas
            if (
              obraUpsertErr.message?.includes('emails_clientes') ||
              obraUpsertErr.message?.includes('cliente_email') ||
              obraUpsertErr.code === 'PGRST204'
            ) {
              const fallbackPayload = {
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
              };
              await supabase!.from('obras').upsert(fallbackPayload);
            } else {
              console.warn('Aviso ao sincronizar obra no Supabase:', obraUpsertErr);
            }
          }

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
                ambientes: etapa.ambientes || [],
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
                    ambiente: tarefa.ambiente || null,
                  });

                  // Sincronização de ambiente resiliente entre Web e Mobile
                  evidenciasRows.push({
                    id: ensureUUID(`${tarefa.id}_ambiente_meta`),
                    tarefa_id: tarefa.id,
                    tipo: 'anotacao',
                    conteudo: tarefa.ambiente ? `__AMBIENTE__:${tarefa.ambiente}` : '__AMBIENTE__:__NONE__',
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
              try {
                const { error: eErr } = await supabase!.from('etapas').upsert(etapasRows);
                if (eErr && (eErr.message?.includes('ambientes') || eErr.code === 'PGRST204' || eErr.code === '42703')) {
                  const fallbackEtapas = etapasRows.map(({ ambientes, ...rest }) => rest);
                  await supabase!.from('etapas').upsert(fallbackEtapas);
                }
              } catch (err) {
                console.warn('Fallback ao salvar etapas:', err);
              }
            }
            if (tarefasRows.length > 0) {
              try {
                const { error: tErr } = await supabase!.from('tarefas').upsert(tarefasRows);
                if (tErr && (tErr.message?.includes('ambiente') || tErr.code === 'PGRST204' || tErr.code === '42703')) {
                  const fallbackTarefas = tarefasRows.map(({ ambiente, ...rest }) => rest);
                  await supabase!.from('tarefas').upsert(fallbackTarefas);
                }
              } catch (err) {
                console.warn('Fallback ao salvar tarefas:', err);
              }
            }
            if (evidenciasRows.length > 0) {
              try {
                const { error: evErr } = await supabase!.from('tarefa_evidencias').upsert(evidenciasRows);
                if (evErr) {
                  console.warn('Aviso ao sincronizar tarefa_evidencias (verifique políticas de RLS):', evErr);
                }
              } catch (err) {
                console.warn('Exceção ao sincronizar tarefa_evidencias:', err);
              }
            }

            // Reconciliação de Exclusão de Etapas no Supabase
            const currentEtapaIds = etapasRows.map((e) => e.id);
            try {
              const { data: dbEtapas } = await supabase!
                .from('etapas')
                .select('id')
                .eq('obra_id', obra.id);
              const etapasToDelete = (dbEtapas || [])
                .map((e: { id: string }) => e.id)
                .filter((id) => !currentEtapaIds.includes(id));
              if (etapasToDelete.length > 0) {
                await supabase!.from('etapas').delete().in('id', etapasToDelete);
              }
            } catch (err) {
              console.warn('Erro ao reconciliar etapas excluídas:', err);
            }

            // Reconciliação de Exclusão de Tarefas no Supabase
            const currentTarefaIds = tarefasRows.map((t) => t.id);
            if (currentEtapaIds.length > 0) {
              try {
                const { data: dbTarefas } = await supabase!
                  .from('tarefas')
                  .select('id')
                  .in('etapa_id', currentEtapaIds);
                const tarefasToDelete = (dbTarefas || [])
                  .map((t: { id: string }) => t.id)
                  .filter((id) => !currentTarefaIds.includes(id));
                if (tarefasToDelete.length > 0) {
                  await supabase!.from('tarefas').delete().in('id', tarefasToDelete);
                }
              } catch (err) {
                console.warn('Erro ao reconciliar tarefas excluídas:', err);
              }
            }
          } else {
            // Se a obra não tem etapas, limpa etapas órfãs no Supabase
            try {
              await supabase!.from('etapas').delete().eq('obra_id', obra.id);
            } catch {}
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

  async deleteTask(tarefaId: string): Promise<void> {
    markEntityAsDeleted(tarefaId);
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('tarefas').delete().eq('id', tarefaId);
      if (error) {
        console.warn('Erro ao excluir tarefa no Supabase:', error);
      }
    } catch (err) {
      console.error('Falha ao excluir tarefa:', err);
    }
  },

  async deleteEtapa(etapaId: string): Promise<void> {
    markEntityAsDeleted(etapaId);
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('etapas').delete().eq('id', etapaId);
      if (error) {
        console.warn('Erro ao excluir etapa no Supabase:', error);
      }
    } catch (err) {
      console.error('Falha ao excluir etapa:', err);
    }
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

        if (locacao.quantidade !== undefined && locacao.quantidade !== null) {
          payload.quantidade = locacao.quantidade;
        }

        if (locacao.periodo) {
          payload.periodo = locacao.periodo;
        }

        const { error } = await supabase.from('registro_locacoes').upsert(payload);
        if (error) {
          // Se as colunas 'quantidade' ou 'periodo' não existirem no banco remoto, retenta sem elas
          let needsRetry = false;
          if (error.message?.includes('quantidade') || error.code === 'PGRST204' || error.code === '42703') {
            delete payload.quantidade;
            needsRetry = true;
          }
          if (error.message?.includes('periodo') || error.code === 'PGRST204' || error.code === '42703') {
            delete payload.periodo;
            needsRetry = true;
          }

          if (needsRetry) {
            const retry = await supabase.from('registro_locacoes').upsert(payload);
            if (retry.error) {
              console.error('Erro ao salvar locação no Supabase (retry sem campos novos):', retry.error);
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
