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
// 1. OBRAS API
// ==============================================================================

export const obrasApi = {
  async list(): Promise<Obra[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return loadObrasFromStorage();
    }

    try {
      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false });

      if (obrasError || !obrasData) {
        console.warn('Erro ao carregar obras do Supabase, usando fallback local:', obrasError);
        return loadObrasFromStorage();
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
            .order('created_at', { ascending: true });

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

      return obrasCompletas;
    } catch (err) {
      console.error('Falha de rede Supabase em obrasApi.list:', err);
      return loadObrasFromStorage();
    }
  },

  async saveAll(obras: Obra[]): Promise<void> {
    // Mantém sincronização local segura
    saveObrasToStorage(obras);

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    // Quando o Supabase estiver configurado, sincroniza com o banco remoto
    try {
      for (const obra of obras) {
        await supabase.from('obras').upsert({
          id: obra.id,
          nome: obra.nome,
          cliente_nome: obra.cliente,
          endereco: obra.endereco,
          data_prevista: obra.dataPrevista,
          orcamento_inicial: obra.orcamentoInicial || 0,
          empresa_responsavel: obra.empresaResponsavel || null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Erro ao sincronizar obras com Supabase:', err);
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
      const { data: newDecisao, error } = await supabase
        .from('decisoes')
        .insert({
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
        })
        .select()
        .single();

      if (error) throw error;

      // Grava assinatura do proponente
      if (decisao.assinaturaCriador) {
        await supabase.from('decisao_assinaturas').insert({
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
      // 1. Atualiza status para aprovada
      await supabase
        .from('decisoes')
        .update({ status: 'aprovada', updated_at: new Date().toISOString() })
        .eq('id', decisaoId);

      // 2. Insere assinatura da contraparte
      await supabase.from('decisao_assinaturas').insert({
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
// 3. STORAGE & PROJETOS PDF API
// ==============================================================================

export const storageApi = {
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
// 4. AUTENTICAÇÃO REAL COM SUPABASE AUTH
// ==============================================================================

export const authApi = {
  async signUp(
    email: string,
    password: string,
    metadata: { nome: string; role: 'Construtor' | 'Cliente'; empresa?: string }
  ) {
    if (!isSupabaseConfigured() || !supabase) {
      return { user: null, error: null };
    }

    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: metadata.nome,
          role: metadata.role.toLowerCase(),
          empresa: metadata.empresa,
        },
      },
    });
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured() || !supabase) {
      return { session: null, error: null };
    }

    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  async signOut() {
    if (!isSupabaseConfigured() || !supabase) return;
    await supabase.auth.signOut();
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured() || !supabase) return;
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
  },

  async getProfile(userId: string) {
    if (!isSupabaseConfigured() || !supabase) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
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
