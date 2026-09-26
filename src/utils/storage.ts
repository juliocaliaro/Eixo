import { Obra, PresetTipoObra } from '../types/obra';
import { PRESET_TIPOS_OBRA } from '../data/presetObras';

const STORAGE_KEY = 'diario_obras_app_data_v1';
const TEMPLATES_STORAGE_KEY = 'eixo_templates_preset_v1';

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
    if (!raw) return PRESET_TIPOS_OBRA;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
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
