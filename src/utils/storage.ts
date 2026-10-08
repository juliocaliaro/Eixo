import { Obra, PresetTipoObra } from '../types/obra';
import { PRESET_TIPOS_OBRA } from '../data/presetObras';

const LEGACY_STORAGE_KEY = 'diario_obras_app_data_v1';
const TEMPLATES_STORAGE_KEY = 'eixo_templates_preset_v3';
const OLD_TEMPLATES_KEY_V2 = 'eixo_templates_preset_v2';
const OLD_TEMPLATES_KEY_V1 = 'eixo_templates_preset_v1';

const getUserStorageKey = (userId?: string): string => {
  return userId ? `eixo_obras_${userId}` : LEGACY_STORAGE_KEY;
};

export const loadObrasFromStorage = (userId?: string): Obra[] => {
  try {
    const key = getUserStorageKey(userId);
    let raw = localStorage.getItem(key);

    // Se a chave do usuário estiver vazia e tivermos userId, tenta migrar dados da chave legado
    if (!raw && userId) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }

    if (!raw) return [];
    const parsed: Obra[] = JSON.parse(raw);
    let modified = false;
    parsed.forEach((obra) => {
      if (obra.punchList && obra.punchList.length > 0) {
        const cleaned = obra.punchList.filter(
          (item) =>
            !item.id.startsWith('punch_demo_') &&
            !item.id.startsWith('punch_padrao_')
        );
        if (cleaned.length !== obra.punchList.length) {
          obra.punchList = cleaned;
          modified = true;
        }
      }
    });
    if (modified) {
      localStorage.setItem(key, JSON.stringify(parsed));
    }
    return parsed;
  } catch (error) {
    console.error('Erro ao carregar obras do localStorage:', error);
    return [];
  }
};

export const saveObrasToStorage = (obras: Obra[], userId?: string): void => {
  try {
    const key = getUserStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(obras));
    // Se estiver sem userId (guest/offline), salva na chave legado
    if (!userId) {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(obras));
    }
  } catch (error) {
    console.error('Erro ao salvar obras no localStorage:', error);
  }
};

export const clearObrasFromStorage = (userId?: string): void => {
  try {
    const key = getUserStorageKey(userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Erro ao limpar obras do localStorage:', error);
  }
};

export const loadTemplatesFromStorage = (): PresetTipoObra[] => {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Se ainda não salvou no v3, verificar se há templates customizados no v2 ou v1
    const v2Raw = localStorage.getItem(OLD_TEMPLATES_KEY_V2) || localStorage.getItem(OLD_TEMPLATES_KEY_V1);
    if (v2Raw) {
      try {
        const oldParsed = JSON.parse(v2Raw);
        if (Array.isArray(oldParsed)) {
          // Manter eventuais templates customizados criados pelo usuário
          const customOnes = oldParsed.filter((t) => t.id !== 'O01' && t.id !== 'O02');
          const merged = [...PRESET_TIPOS_OBRA, ...customOnes];
          saveTemplatesToStorage(merged);
          return merged;
        }
      } catch {}
    }

    saveTemplatesToStorage(PRESET_TIPOS_OBRA);
    return PRESET_TIPOS_OBRA;
  } catch (error) {
    console.error('Erro ao carregar templates do localStorage:', error);
    return PRESET_TIPOS_OBRA;
  }
};

export const saveTemplatesToStorage = (templates: PresetTipoObra[]): void => {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Erro ao salvar templates no localStorage:', error);
  }
};

export const resetTemplatesToDefault = (): PresetTipoObra[] => {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(PRESET_TIPOS_OBRA));
  } catch (error) {
    console.error('Erro ao resetar templates:', error);
  }
  return PRESET_TIPOS_OBRA;
};
