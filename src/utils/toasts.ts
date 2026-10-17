import type { ToastMessage } from '../types/obra';

/** Adiciona um toast sem duplicar: mesma mensagem ja visivel -> mantem a lista como esta. */
export const adicionarToastUnico = (lista: ToastMessage[], novo: ToastMessage): ToastMessage[] => {
  const repetido = lista.some(
    (t) => t.tipo === novo.tipo && t.titulo === novo.titulo && (t.descricao ?? '') === (novo.descricao ?? '')
  );
  return repetido ? lista : [...lista, novo];
};
