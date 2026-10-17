import React, { useState } from 'react';
import {
  Plus,
  Trash,
  Key,
  SealCheck,
} from '@phosphor-icons/react';
import { PunchListItem, PerfilUsuario } from '../types/obra';
import { ModalConfirm } from './ModalConfirm';
import { EmptyState } from './EmptyState';
import { generateUUID } from '../utils/uuid';
import { formatarDataHoraBR } from '../utils/data';

interface VistoriaPunchListProps {
  punchList: PunchListItem[];
  onUpdatePunchList: (items: PunchListItem[]) => void;
  perfilAtivo?: PerfilUsuario;
  clienteNome: string;
  showToast?: (titulo: string, descricao?: string, tipo?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const VistoriaPunchList: React.FC<VistoriaPunchListProps> = ({
  punchList = [],
  onUpdatePunchList,
  perfilAtivo = 'construtor',
  clienteNome: _clienteNome,
  showToast,
}) => {
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [novoItemAmbiente, setNovoItemAmbiente] = useState('Geral');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const total = punchList.length;
  const concluidos = punchList.filter((i) => i.concluido).length;
  const tudoResolvido = total > 0 && concluidos === total;

  const handleToggleItem = (id: string) => {
    if (perfilAtivo === 'cliente') return;

    const agora = new Date().toISOString();
    const updated = punchList.map((item) => {
      if (item.id !== id) return item;
      const novoConcluido = !item.concluido;
      return {
        ...item,
        concluido: novoConcluido,
        concluidoEm: novoConcluido ? agora : undefined,
      };
    });

    onUpdatePunchList(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemTexto.trim()) return;

    const novo: PunchListItem = {
      id: generateUUID(),
      item: novoItemTexto.trim(),
      ambiente: novoItemAmbiente.trim() || 'Geral',
      concluido: false,
    };

    onUpdatePunchList([...punchList, novo]);
    setNovoItemTexto('');
    setIsAdding(false);

    if (showToast) {
      showToast('Item adicionado!', 'Item incluído na Vistoria Final.');
    }
  };

  const handleDeleteItem = (id: string) => {
    onUpdatePunchList(punchList.filter((i) => i.id !== id));
    setDeleteTargetId(null);
  };

  const formatarDataHora = (isoStr?: string) => formatarDataHoraBR(isoStr, { ano: false, separador: ', ' });

  return (
    <section className="vistoria" aria-label="Vistoria final">
      <div className="vistoria-head">
        <div className="vistoria-title">
          <div className={`vistoria-icon ${tudoResolvido ? 'is-ok' : ''}`}>
            <Key size={18} weight={tudoResolvido ? 'fill' : 'bold'} />
          </div>
          <h3>Vistoria final</h3>
          {total > 0 && (
            <span className={`badge ${tudoResolvido ? 'badge--ok' : 'badge--neutral'}`}>
              {concluidos}/{total}
            </span>
          )}
        </div>

        {perfilAtivo === 'construtor' && (
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="btn-secondary btn--sm"
            aria-expanded={isAdding}
          >
            <Plus size={14} weight="bold" />
            <span>Adicionar item</span>
          </button>
        )}
      </div>

      {tudoResolvido && (
        <div className="vistoria-ok">
          <SealCheck size={18} weight="fill" style={{ flexShrink: 0 }} />
          <span>Todas as pendências foram resolvidas. A obra está pronta para a entrega de chaves.</span>
        </div>
      )}

      {isAdding && perfilAtivo === 'construtor' && (
        <form onSubmit={handleAddItem} className="vistoria-form">
          <input
            type="text"
            placeholder="O que precisa ser resolvido?"
            aria-label="Descrição do item"
            value={novoItemTexto}
            onChange={(e) => setNovoItemTexto(e.target.value)}
            className="form-input vistoria-input-main"
            autoFocus
          />
          <input
            type="text"
            placeholder="Ambiente (ex: Sala)"
            aria-label="Ambiente"
            value={novoItemAmbiente}
            onChange={(e) => setNovoItemAmbiente(e.target.value)}
            className="form-input vistoria-input-amb"
          />
          <button type="submit" className="btn-primary">Salvar</button>
          <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">Cancelar</button>
        </form>
      )}

      {total === 0 ? (
        <EmptyState icon={Key} className="empty-state--nested" title={perfilAtivo === 'construtor' ? 'Nenhum item na vistoria.' : 'Ainda não há itens na vistoria.'} />
      ) : (
        <div className="vistoria-list">
          {punchList.map((item) => (
            <div key={item.id} className={`vistoria-row ${item.concluido ? 'is-done' : ''}`}>
              <input
                type="checkbox"
                className="task-checkbox"
                checked={item.concluido}
                disabled={perfilAtivo === 'cliente'}
                onChange={() => handleToggleItem(item.id)}
                aria-label={item.item}
                style={{ cursor: perfilAtivo === 'cliente' ? 'default' : 'pointer' }}
              />

              <div className="vistoria-row-main">
                <div className="vistoria-row-text">{item.item}</div>
                {item.concluidoEm && (
                  <div className="vistoria-row-sub">Resolvido em {formatarDataHora(item.concluidoEm)}</div>
                )}
              </div>

              {item.ambiente && <span className="badge badge--neutral">{item.ambiente}</span>}

              {perfilAtivo === 'construtor' && (
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(item.id)}
                  className="btn-icon touch-target-44"
                  style={{ border: 'none', background: 'transparent' }}
                  aria-label={`Excluir item ${item.item}`}
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTargetId && (
        <ModalConfirm
          isOpen={true}
          title="Excluir item da vistoria"
          message="Tem certeza que deseja remover este item da Vistoria Final?"
          confirmText="Sim, excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => handleDeleteItem(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </section>
  );
};
