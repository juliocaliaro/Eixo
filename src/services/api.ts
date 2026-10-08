import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  Obra,
  Decisao,
  ProjetoPDF,
  RegistroNota,
  AssinaturaDecisao,
  PerfilUsuario,
  PresetTipoObra,
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
  ObraRow,
  EtapaRow,
  TarefaRow,
  TarefaEvidenciaRow,
  DecisaoRow,
  DecisaoAssinaturaRow,
  ProjetoPdfRow,
  RegistroNotaRow,
  PunchListItemRow,
} from './dbTypes';

// ==============================================================================
// 1. OBRAS API (MULTI-DEVICE PERSISTENCE & USER SCOPING)
// ==============================================================================

export const obrasApi = {
  async list(userId?: string): Promise<Obra[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return loadObrasFromStorage(userId);
    }

    try {
      // Determina o ID do usuário ativo (passado ou da sessão do Supabase)
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        targetUserId = sessionData?.session?.user?.id;
      }

      let query = supabase.from('obras').select('*').order('created_at', { ascending: false });

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
      // realiza a sincronização automática e migração transparente para o Supabase!
      if (obrasData.length === 0 && targetUserId) {
        const localObras = loadObrasFromStorage(targetUserId);
        if (localObras && localObras.length > 0) {
          console.info('Migrando obras locais para o Supabase sob o usuário:', targetUserId);
          const sanitizadas = localObras.map((o) => sanitizeObraUUIDs(o, targetUserId));
          await this.saveAll(sanitizadas, targetUserId);
          return sanitizadas;
        }
      }

      const obrasCompletas: Obra[] = await Promise.all(
        obrasData.map(async (row: ObraRow) => {
          // 1. Etapas e Tarefas
          const { data: etapasData } = await supabase!
            .from('etapas')
            .select('*')
            .eq('obra_id', row.id)
            .order('ordem', { ascending: true });

          const etapasMapeadas = await Promise.all(
            (etapasData || []).map(async (etapaRow: EtapaRow) => {
              const { data: tarefasData } = await supabase!
                .from('tarefas')
                .select('*')
                .eq('etapa_id', etapaRow.id)
                .order('ordem', { ascending: true });

              const tarefasMapeadas = await Promise.all(
                (tarefasData || []).map(async (tarefaRow: TarefaRow) => {
                  const { data: evidencias } = await supabase!
                    .from('tarefa_evidencias')
                    .select('*')
                    .eq('tarefa_id', tarefaRow.id);
                  return mapTarefaFromDb(tarefaRow, (evidencias as TarefaEvidenciaRow[]) || []);
                })
              );

              return mapEtapaFromDb(etapaRow, tarefasMapeadas);
            })
          );

          // 2. Decisões
          const { data: decisoesData } = await supabase!
            .from('decisoes')
            .select('*')
            .eq('obra_id', row.id)
            .order('created_at', { ascending: false });

          const decisoesMapeadas = await Promise.all(
            (decisoesData || []).map(async (decisaoRow: DecisaoRow) => {
              const { data: assinaturas } = await supabase!
                .from('decisao_assinaturas')
                .select('*')
                .eq('decisao_id', decisaoRow.id);
              return mapDecisaoFromDb(decisaoRow, (assinaturas as DecisaoAssinaturaRow[]) || []);
            })
          );

          // 3. Projetos PDF
          const { data: projetosData } = await supabase!
            .from('projetos_pdf')
            .select('*')
            .eq('obra_id', row.id)
            .order('created_at', { ascending: false });

          const projetosMapeados = (projetosData || []).map((p: ProjetoPdfRow) => mapProjetoFromDb(p));

          // 4. Registro de Notas
          const { data: notasData } = await supabase!
            .from('registro_notas')
            .select('*')
            .eq('obra_id', row.id)
            .order('created_at', { ascending: false });

          const notasMapeadas = (notasData || []).map((n: RegistroNotaRow) => mapNotaFromDb(n));

          // 5. Punch List
          const { data: punchData } = await supabase!
            .from('punch_list_items')
            .select('*')
            .eq('obra_id', row.id)
            .order('ordem', { ascending: true });

          const punchMapeado = (punchData || []).map((p: PunchListItemRow) => mapPunchItemFromDb(p));

          return mapObraFromDb(
            row,
            etapasMapeadas,
            decisoesMapeadas,
            projetosMapeados,
            notasMapeadas,
            punchMapeado
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
  },

  async saveAll(obras: Obra[], userId?: string): Promise<void> {
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

        // 1. Obra principal (inclui construtor_id para satisfazer RLS)
        await supabase.from('obras').upsert({
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

        // 2. Registro de Notas (upload automático de fotos)
        if (obra.notas && obra.notas.length > 0) {
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

            await supabase.from('registro_notas').upsert({
              id: nota.id,
              obra_id: obra.id,
              titulo: nota.titulo || null,
              valor: nota.valor || null,
              observacoes: nota.observacoes || null,
              fotos: fotosProcessadas,
              created_at: nota.criadoEm || new Date().toISOString(),
            });
          }
        }

        // 3. Projetos PDF (upload automático de arquivos)
        if (obra.projetos && obra.projetos.length > 0) {
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

            await supabase.from('projetos_pdf').upsert({
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
        }

        // 4. Etapas e Tarefas
        if (obra.etapas && obra.etapas.length > 0) {
          for (let eIdx = 0; eIdx < obra.etapas.length; eIdx++) {
            const etapa = obra.etapas[eIdx];
            await supabase.from('etapas').upsert({
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
                await supabase.from('tarefas').upsert({
                  id: tarefa.id,
                  etapa_id: etapa.id,
                  nome: tarefa.nome,
                  status: tarefa.concluida ? 'concluido' : 'pendente',
                  concluida: Boolean(tarefa.concluida),
                  ordem: tIdx + 1,
                  concluida_em: tarefa.concluidaEm || null,
                });

                // Evidências da Tarefa: Fotos para evidencias-diario
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
                    try {
                      await supabase.from('tarefa_evidencias').upsert({
                        id: ensureUUID(`${tarefa.id}_foto_${fIdx}`),
                        tarefa_id: tarefa.id,
                        tipo: 'foto',
                        conteudo: fotoUrl,
                      });
                    } catch {}
                  }
                }

                // Evidências da Tarefa: Anotações
                if (tarefa.anotacoes && tarefa.anotacoes.length > 0) {
                  for (let aIdx = 0; aIdx < tarefa.anotacoes.length; aIdx++) {
                    const anotacao = tarefa.anotacoes[aIdx];
                    try {
                      await supabase.from('tarefa_evidencias').upsert({
                        id: ensureUUID(`${tarefa.id}_anotacao_${aIdx}`),
                        tarefa_id: tarefa.id,
                        tipo: 'anotacao',
                        conteudo: anotacao,
                      });
                    } catch {}
                  }
                }
              }
            }
          }
        }

        // 5. Punch List (Vistoria Final)
        if (obra.punchList && obra.punchList.length > 0) {
          for (let pIdx = 0; pIdx < obra.punchList.length; pIdx++) {
            const p = obra.punchList[pIdx];
            await supabase.from('punch_list_items').upsert({
              id: p.id,
              obra_id: obra.id,
              ambiente: p.ambiente || 'Geral',
              item: p.item,
              concluido: Boolean(p.concluido),
              ordem: pIdx + 1,
              concluido_em: p.concluidoEm || null,
            });
          }
        }

        // 6. Decisões
        if (obra.decisoes && obra.decisoes.length > 0) {
          for (const d of obra.decisoes) {
            await supabase.from('decisoes').upsert({
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
              await supabase.from('decisao_assinaturas').upsert({
                id: ensureUUID(`${d.id}_criador`),
                decisao_id: d.id,
                papel: 'criador',
                autor_perfil: d.assinaturaCriador.autor,
                nome_signatario: d.assinaturaCriador.nomeSignatario,
                assinado_em: d.assinaturaCriador.assinadoEm,
              });
            }

            if (d.assinaturaContraparte) {
              await supabase.from('decisao_assinaturas').upsert({
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
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar obras completas com Supabase:', err);
    }
  },

  async delete(obraId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { error } = await supabase.from('obras').delete().eq('id', obraId);
      if (error) {
        console.warn('Erro ao excluir obra no Supabase:', error);
      }
    } catch (err) {
      console.error('Falha ao excluir obra:', err);
    }
  },
};

// ==============================================================================
// 2. DECISÕES & ASSINATURA DIGITAL API
// ==============================================================================

export const decisoesApi = {
  async create(obraId: string, decisao: Decisao): Promise<void> {
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
  },

  async sign(decisaoId: string, assinatura: AssinaturaDecisao): Promise<void> {
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
  },

  async reject(decisaoId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      await supabase
        .from('decisoes')
        .update({ status: 'recusada', updated_at: new Date().toISOString() })
        .eq('id', decisaoId);
    } catch (err) {
      console.error('Erro ao recusar decisão no Supabase:', err);
    }
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
        return dataUrl;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      return data.publicUrl || dataUrl;
    } catch (err) {
      return dataUrl;
    }
  },

  async uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
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
  },

  async signIn(email: string, password: string): Promise<{ user: any; session: any; error: string | null }> {
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
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.auth.signOut();
    } catch {}
  },

  async resetPassword(email: string): Promise<{ error: string | null }> {
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

// ==============================================================================
// 5. TEMPLATES DE ETAPAS & MODELOS DE OBRA
// ==============================================================================

export const templatesApi = {
  async list(): Promise<PresetTipoObra[]> {
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
  },

  async save(templates: PresetTipoObra[]): Promise<void> {
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
  },
};
