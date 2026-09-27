import { Obra, PresetTipoObra } from '../types/obra';
import { PRESET_TIPOS_OBRA } from '../data/presetObras';

const STORAGE_KEY = 'diario_obras_app_data_v1';
const TEMPLATES_STORAGE_KEY = 'eixo_templates_preset_v3';
const OLD_TEMPLATES_KEY_V2 = 'eixo_templates_preset_v2';
const OLD_TEMPLATES_KEY_V1 = 'eixo_templates_preset_v1';

export const loadObrasFromStorage = (): Obra[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao carregar obras do localStorage:', error);
    return [];
  }
};

export const saveObrasToStorage = (obras: Obra[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obras));
  } catch (error) {
    console.error('Erro ao salvar obras no localStorage:', error);
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
