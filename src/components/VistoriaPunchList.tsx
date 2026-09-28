import React, { useState } from 'react';
import {
  Plus,
  Trash,
  Key,
  SealCheck,
} from '@phosphor-icons/react';
import { PunchListItem, PerfilUsuario } from '../types/obra';
import { ModalConfirm } from './ModalConfirm';

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
  clienteNome,
  showToast,
}) => {
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [novoItemAmbiente, setNovoItemAmbiente] = useState('Geral');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const total = punchList.length;
  const concluidos = punchList.filter((i) => i.concluido).length;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
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
      id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

  const formatarDataHora = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '22px 24px',
        boxShadow: 'var(--shadow-subtle)',
      }}
    >
      {/* Cabeçalho da Vistoria */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-sm)',
              background: tudoResolvido ? '#dcfce7' : 'var(--dark-coffee-100)',
              color: tudoResolvido ? '#15803d' : 'var(--dark-coffee-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Key size={20} weight={tudoResolvido ? 'fill' : 'bold'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Vistoria Final
              </h3>
              {total > 0 && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: tudoResolvido ? '#dcfce7' : 'var(--dark-coffee-100)',
                    color: tudoResolvido ? '#15803d' : 'var(--dark-coffee-800)',
                  }}
                >
                  {concluidos}/{total} resolvidos ({percentual}%)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Checklist de conformidade técnica e validação final da obra para entrega a {clienteNome}
            </p>
          </div>
        </div>

        {perfilAtivo === 'construtor' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setIsAdding((prev) => !prev)}
              className="btn-primary"
              style={{ padding: '7px 13px', fontSize: '0.80rem' }}
            >
              <Plus size={14} weight="bold" />
              <span>Adicionar Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Selo de Entrega Pronta quando 100% resolvido */}
      {tudoResolvido && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: 16,
          }}
        >
          <SealCheck size={20} weight="fill" color="#16a34a" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', color: '#14532d', lineHeight: 1.35 }}>
            <strong>Todas as pendências da vistoria foram resolvidas!</strong> A obra está formalmente apta para a
            entrega de chaves e encerramento técnico.
          </div>
        </div>
      )}

      {/* Formulário Inline de Adição */}
      {isAdding && perfilAtivo === 'construtor' && (
        <form
          onSubmit={handleAddItem}
          style={{
            background: 'var(--dark-coffee-50)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Ex: Retoque de pintura no rodapé do corredor..."
            value={novoItemTexto}
            onChange={(e) => setNovoItemTexto(e.target.value)}
            className="form-input"
            style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}
            autoFocus
          />
          <input
            type="text"
            placeholder="Ambiente (ex: Sala, Suíte)"
            value={novoItemAmbiente}
            onChange={(e) => setNovoItemAmbiente(e.target.value)}
            className="form-input"
            style={{ width: '150px', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Lista de Itens da Vistoria */}
      {total === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            background: 'var(--dark-coffee-50)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border-hairline)',
          }}
        >
          Nenhum item cadastrado na Vistoria Final.{' '}
          {perfilAtivo === 'construtor' && (
            <span>Clique em <strong>Adicionar Item</strong> acima para registrar pendências e testes técnicos.</span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {punchList.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: item.concluido ? '#f8fafc' : '#ffffff',
                border: '1px solid var(--border-hairline)',
                gap: 12,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <input
                  type="checkbox"
                  checked={item.concluido}
                  disabled={perfilAtivo === 'cliente'}
                  onChange={() => handleToggleItem(item.id)}
                  style={{
                    width: 17,
                    height: 17,
                    cursor: perfilAtivo === 'cliente' ? 'default' : 'pointer',
                    accentColor: 'var(--primary-accent)',
                  }}
                  title={perfilAtivo === 'cliente' ? 'Status gerenciado pelo construtor' : 'Marcar pendência como resolvida'}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.86rem',
                      color: item.concluido ? 'var(--text-muted)' : 'var(--text-main)',
                      textDecoration: item.concluido ? 'line-through' : 'none',
                      fontWeight: item.concluido ? 400 : 500,
                    }}
                  >
                    {item.item}
                  </span>

                  {item.concluidoEm && (
                    <span style={{ fontSize: '0.72rem', color: '#16a34a', marginLeft: 8 }}>
                      • Resolvido em {formatarDataHora(item.concluidoEm)}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {item.ambiente && (
                  <span
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--dark-coffee-100)',
                      color: 'var(--dark-coffee-800)',
                    }}
                  >
                    {item.ambiente}
                  </span>
                )}

                {perfilAtivo === 'construtor' && (
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(item.id)}
                    className="btn-icon"
                    style={{ width: 26, height: 26, color: 'var(--text-muted)' }}
                    title="Excluir pendência"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTargetId && (
        <ModalConfirm
          isOpen={true}
          title="Excluir Item da Vistoria Final"
          message="Tem certeza que deseja remover este item da Vistoria Final?"
          confirmText="Sim, excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => handleDeleteItem(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
};
