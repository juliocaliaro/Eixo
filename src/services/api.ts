import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { classificarFalha, registrarErro } from '../utils/mensagensErro';
import { Decisao, RegistroLocacao, AssinaturaDecisao, PresetTipoObra } from '../types/obra';
import {
  ModeloTemplateRow,
  mapTemplateFromDb,
  toAssinaturaRow,
  toDecisaoRow,
  toLocacaoRow,
  toTemplateRow,
} from './dbTypes';
import { ensureUUID } from '../utils/uuid';
import { trackApi, subscribeApiLoading } from './apiTracking';
import { storageApi } from './storageApi';
import { normalizeRowAssets } from './assets';
import { SupabaseWriteError, upsertTolerant } from './supabaseWrite';

/**
 * APIs por entidade (Supabase/PostgreSQL e a unica fonte da verdade).
 * Todas lancam erro quando o Supabase nao esta configurado ou a operacao falha;
 * nenhuma engole falhas nem recorre a armazenamento local.
 */

export { trackApi, subscribeApiLoading, storageApi };

const db = () => {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
};

const check = (table: string, error: { code?: string; message?: string } | null) => {
  if (error) throw new SupabaseWriteError(table, error);
};

const upsertAssinatura = async (assinatura: AssinaturaDecisao, decisaoId: string, papel: 'criador' | 'contraparte') => {
  const row = toAssinaturaRow(ensureUUID(), assinatura, decisaoId, papel);
  const { error } = await db().from('decisao_assinaturas').upsert(row, { onConflict: 'decisao_id,papel' });
  check('decisao_assinaturas', error);
};

// ==============================================================================
// 1. OBRAS (exclusoes imediatas por entidade; a gravacao do estado e do obraStore)
// ==============================================================================

export const obrasApi = {
  async delete(obraId: string): Promise<void> {
    return trackApi(async () => {
      const { error } = await db().from('obras').delete().eq('id', obraId);
      check('obras', error);
    }, 'Excluindo obra...');
  },

  async deleteTask(tarefaId: string): Promise<void> {
    const { error } = await db().from('tarefas').delete().eq('id', tarefaId);
    check('tarefas', error);
  },

  async deleteEtapa(etapaId: string): Promise<void> {
    const { error } = await db().from('etapas').delete().eq('id', etapaId);
    check('etapas', error);
  },
};

// ==============================================================================
// 2. DECISOES & ASSINATURA DIGITAL
// ==============================================================================

export const decisoesApi = {
  async create(obraId: string, decisao: Decisao): Promise<void> {
    return trackApi(async () => {
      const row = await normalizeRowAssets('decisoes', toDecisaoRow(decisao, obraId) as never);
      const { error } = await db().from('decisoes').insert(row);
      check('decisoes', error);
      if (decisao.assinaturaCriador) await upsertAssinatura(decisao.assinaturaCriador, decisao.id, 'criador');
    }, 'Registrando decisão...');
  },

  async sign(decisaoId: string, assinatura: AssinaturaDecisao): Promise<void> {
    return trackApi(async () => {
      const upd = await db()
        .from('decisoes')
        .update({ status: 'aprovada', updated_at: new Date().toISOString() })
        .eq('id', decisaoId);
      check('decisoes', upd.error);
      await upsertAssinatura(assinatura, decisaoId, 'contraparte');
    }, 'Gravando assinatura digital...');
  },

  async reject(decisaoId: string): Promise<void> {
    return trackApi(async () => {
      const { error } = await db()
        .from('decisoes')
        .update({ status: 'recusada', updated_at: new Date().toISOString() })
        .eq('id', decisaoId);
      check('decisoes', error);
    }, 'Registrando recusa da decisão...');
  },
};

// ==============================================================================
// 3. LOCACOES, NOTAS, PROJETOS E EVIDENCIAS
// ==============================================================================

export const locacoesApi = {
  async upsert(locacao: RegistroLocacao, obraId?: string): Promise<void> {
    const targetObraId = locacao.obraId || obraId;
    if (!targetObraId) throw new Error('Locação sem obra vinculada.');
    return trackApi(async () => {
      const row = await normalizeRowAssets('registro_locacoes', toLocacaoRow(locacao, targetObraId) as never);
      await upsertTolerant(
        'registro_locacoes',
        [row],
        (rows) => Promise.resolve(db().from('registro_locacoes').upsert(rows)) as never,
        ['quantidade', 'periodo']
      );
    }, 'Salvando locação na nuvem...');
  },

  async delete(locacaoId: string, fotos?: string[]): Promise<void> {
    return trackApi(async () => {
      const { error } = await db().from('registro_locacoes').delete().eq('id', locacaoId);
      check('registro_locacoes', error);
      for (const fotoUrl of fotos || []) {
        await storageApi.deleteFileFromUrl('registro-notas', fotoUrl);
        await storageApi.deleteFileFromUrl('evidencias-diario', fotoUrl);
      }
    }, 'Excluindo locação e arquivos...');
  },

  async updateStatus(locacaoId: string, status: 'ativo' | 'devolvido'): Promise<void> {
    return trackApi(async () => {
      const { error } = await db().from('registro_locacoes').update({ status }).eq('id', locacaoId);
      check('registro_locacoes', error);
    }, 'Atualizando locação...');
  },
};

export const notasApi = {
  async delete(notaId: string, fotos?: string[]): Promise<void> {
    return trackApi(async () => {
      const { error } = await db().from('registro_notas').delete().eq('id', notaId);
      check('registro_notas', error);
      for (const fotoUrl of fotos || []) {
        await storageApi.deleteFileFromUrl('registro-notas', fotoUrl);
      }
    }, 'Excluindo nota e arquivos...');
  },
};

export const projetosApi = {
  async delete(projetoId: string, url?: string): Promise<void> {
    return trackApi(async () => {
      const { error } = await db().from('projetos_pdf').delete().eq('id', projetoId);
      check('projetos_pdf', error);
      if (url) await storageApi.deleteFileFromUrl('projetos-pdf', url);
    }, 'Excluindo projeto e arquivo...');
  },
};

export const evidenciasApi = {
  async deleteFoto(tarefaId: string, fotoUrl: string): Promise<void> {
    if (!fotoUrl) return;
    return trackApi(async () => {
      const { error } = await db()
        .from('tarefa_evidencias')
        .delete()
        .eq('tarefa_id', tarefaId)
        .eq('conteudo', fotoUrl);
      check('tarefa_evidencias', error);
      await storageApi.deleteFileFromUrl('evidencias-diario', fotoUrl);
    }, 'Excluindo evidência...');
  },
};

// ==============================================================================
// 4. AUTENTICACAO (Supabase Auth) E PERFIL
// ==============================================================================

export interface ProfileRow {
  id: string;
  email: string;
  nome: string;
  role: 'construtor' | 'cliente';
  empresa?: string | null;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  /** Mensagem pronta para exibir (ou texto do provedor, ex.: 'Invalid login credentials'). */
  error: string | null;
}

/** Erro de rede/transporte vira texto em portugues; erros do provedor de auth passam como vieram. */
const erroDeAuth = (err: unknown, fallback: string): string => {
  registrarErro('Falha na chamada de autenticação', err);
  const falha = classificarFalha(err);
  if (falha === 'rede' || falha === 'timeout') return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  return (err instanceof Error && err.message) || fallback;
};

export const authApi = {
  async signUp(params: {
    email: string;
    password: string;
    nome: string;
    role: 'Construtor' | 'Cliente';
    empresa?: string;
  }): Promise<AuthResult> {
    return trackApi(async () => {
      if (!supabase) return { user: null, session: null, error: 'Serviço de autenticação não configurado.' };
      try {
        // O trigger handle_new_user cria a linha em public.profiles a partir dos metadados.
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
        if (error) return { user: null, session: null, error: error.message };
        return { user: data.user, session: data.session, error: null };
      } catch (err: unknown) {
        return { user: null, session: null, error: erroDeAuth(err, 'Falha na comunicação com o servidor de autenticação.') };
      }
    }, 'Cadastrando usuário...');
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    return trackApi(async () => {
      if (!supabase) return { user: null, session: null, error: 'Serviço de autenticação não configurado.' };
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { user: null, session: null, error: error.message };
        return { user: data.user, session: data.session, error: null };
      } catch (err: unknown) {
        return { user: null, session: null, error: erroDeAuth(err, 'Falha ao autenticar usuário.') };
      }
    }, 'Autenticando...');
  },

  async signOut(): Promise<void> {
    const { error } = await db().auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string): Promise<{ error: string | null }> {
    return trackApi(async () => {
      if (!supabase) return { error: 'Serviço de autenticação não configurado.' };
      try {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        return { error: error ? error.message : null };
      } catch (err: unknown) {
        return { error: erroDeAuth(err, 'Falha ao solicitar redefinição de senha.') };
      }
    }, 'Enviando redefinição de senha...');
  },

  /** Define a nova senha da sessao atual (usada apos o link de recuperacao). */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    return trackApi(async () => {
      if (!supabase) return { error: 'Serviço de autenticação não configurado.' };
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: error ? error.message : null };
      } catch (err: unknown) {
        return { error: erroDeAuth(err, 'Falha ao atualizar a senha.') };
      }
    }, 'Salvando nova senha...');
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await db().auth.getSession();
    if (error) throw error;
    return data.session || null;
  },

  async getProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return (data as ProfileRow | null) ?? null;
  },

  /** Atualiza nome/empresa no perfil (tabela profiles) e nos metadados da conta. */
  async updateProfile(userId: string, dados: { nome: string; empresa?: string }): Promise<void> {
    return trackApi(async () => {
      const patch: Record<string, unknown> = { nome: dados.nome, updated_at: new Date().toISOString() };
      if (dados.empresa !== undefined) patch.empresa = dados.empresa || null;
      const { error } = await db().from('profiles').update(patch).eq('id', userId);
      check('profiles', error);
      const meta = await db().auth.updateUser({
        data: { nome: dados.nome, ...(dados.empresa !== undefined ? { empresa: dados.empresa || null } : {}) },
      });
      if (meta.error) throw meta.error;
    }, 'Salvando perfil...');
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const { data } = db().auth.onAuthStateChange((event, session) => callback(event, session));
    return data.subscription;
  },
};

// ==============================================================================
// 5. TEMPLATES DE ETAPAS & MODELOS DE OBRA (por usuario)
// ==============================================================================

export const templatesApi = {
  /** Modelos do usuario autenticado. Lista vazia significa "usar os padroes de fabrica". */
  async list(userId: string): Promise<PresetTipoObra[]> {
    return trackApi(async () => {
      const { data, error } = await db()
        .from('modelos_etapas_templates')
        .select('*')
        .eq('criado_por', userId)
        .order('created_at', { ascending: true });
      if (error) throw new SupabaseWriteError('modelos_etapas_templates', error);
      return ((data || []) as ModeloTemplateRow[]).map(mapTemplateFromDb);
    }, 'Carregando modelos de obra...');
  },

  /** Grava a lista inteira como o estado do usuario: faz upsert e remove modelos que sumiram. */
  async save(userId: string, templates: PresetTipoObra[]): Promise<void> {
    return trackApi(async () => {
      const rows = templates.map((t) => toTemplateRow(t, userId));
      if (rows.length > 0) {
        const { error } = await db()
          .from('modelos_etapas_templates')
          .upsert(rows, { onConflict: 'criado_por,id' });
        check('modelos_etapas_templates', error);
      }
      const existing = await db().from('modelos_etapas_templates').select('id').eq('criado_por', userId);
      check('modelos_etapas_templates', existing.error);
      const keep = new Set(templates.map((t) => t.id));
      const remover = ((existing.data || []) as { id: string }[]).map((r) => r.id).filter((id) => !keep.has(id));
      if (remover.length > 0) {
        const del = await db()
          .from('modelos_etapas_templates')
          .delete()
          .eq('criado_por', userId)
          .in('id', remover);
        check('modelos_etapas_templates', del.error);
      }
    }, 'Salvando modelos de obra...');
  },

  /** "Restaurar padroes de fabrica": remove os modelos personalizados do usuario. */
  async reset(userId: string): Promise<void> {
    return trackApi(async () => {
      const { error } = await db().from('modelos_etapas_templates').delete().eq('criado_por', userId);
      check('modelos_etapas_templates', error);
    }, 'Restaurando modelos padrão...');
  },
};

export { isSupabaseConfigured };
