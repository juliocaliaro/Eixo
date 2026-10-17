import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  MapPin,
  CalendarBlank,
  User,
  ArrowRight,
  Trash,
  Copy,
  Check,
  DotsThreeVertical,
  Info,
  Buildings,
  X,
} from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { ModalConfirm } from './ModalConfirm';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import { progressoDaObra } from '../utils/obraMetrics';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useIsMobile } from '../hooks/useIsMobile';

interface ObraListProps {
  obras: Obra[];
  onSelectObra: (obraId: string) => void;
  onOpenCreateModal: () => void;
  onDeleteObra: (obraId: string) => void;
  perfilAtivo?: PerfilUsuario;
  /** A URL apontava para uma obra que não existe ou que a conta não pode ver. */
  obraNaoEncontrada?: boolean;
  onDismissAviso?: () => void;
}

const SEM_ENDERECO = 'Endereço não informado';

const formatarData = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

const enderecoDa = (obra: Obra) => (obra.endereco && obra.endereco !== SEM_ENDERECO ? obra.endereco : '');

interface MenuState {
  obra: Obra;
  /** Âncora do botão "..." (só usada no popover do desktop). */
  top: number;
  right: number;
}

export const ObraList: React.FC<ObraListProps> = ({
  obras,
  onSelectObra,
  onOpenCreateModal,
  onDeleteObra,
  perfilAtivo = 'construtor',
  obraNaoEncontrada = false,
  onDismissAviso,
}) => {
  const isMobile = useIsMobile();
  const podeEditar = perfilAtivo !== 'cliente';
  const [deleteObraTarget, setDeleteObraTarget] = useState<{ id: string; nome: string } | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [copiado, setCopiado] = useState(false);

  const fecharMenu = () => {
    setMenu(null);
    setCopiado(false);
  };
  useEscapeKey(fecharMenu, !!menu);

  // Desktop: popover fecha ao clicar fora (a sheet do mobile tem backdrop próprio)
  useEffect(() => {
    if (!menu || isMobile) return;
    const onOutside = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.row-menu')) fecharMenu();
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menu, isMobile]);

  const abrirMenu = (e: React.MouseEvent<HTMLButtonElement>, obra: Obra) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ obra, top: r.bottom + 4, right: Math.max(window.innerWidth - r.right, 8) });
  };

  const copiarEndereco = (endereco: string) => {
    if (!endereco) return;
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(endereco);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = endereco;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(textarea);
    }
    setCopiado(true);
    window.setTimeout(fecharMenu, 800);
  };

  const aviso = obraNaoEncontrada ? (
    <div className="inline-notice" role="status">
      <Info size={20} aria-hidden="true" />
      <p>Não encontramos essa obra. Ela pode ter sido removida ou você não tem acesso.</p>
      {onDismissAviso && (
        <button type="button" className="btn-quiet" onClick={onDismissAviso} aria-label="Fechar aviso">
          <X size={18} weight="bold" />
        </button>
      )}
    </div>
  ) : null;

  const cabecalho = (
    <PageHeader
      title="Obras"
      actions={
        podeEditar ? (
          <button type="button" onClick={onOpenCreateModal} className="btn-primary">
            <Plus size={18} weight="bold" />
            <span>Nova obra</span>
          </button>
        ) : undefined
      }
    />
  );

  // Estado vazio: a ação "Nova obra" já está no cabeçalho, então o estado vazio não repete o botão
  if (obras.length === 0) {
    return (
      <div className="page obra-list">
        {cabecalho}
        {aviso}
        <EmptyState
          icon={Buildings}
          title={podeEditar ? 'Você ainda não tem obras.' : 'Nenhuma obra foi compartilhada com você ainda.'}
        />
      </div>
    );
  }

  const menuEndereco = menu ? enderecoDa(menu.obra) : '';
  const itensMenu = menu ? (
    <>
      {menuEndereco && (
        <button type="button" role="menuitem" className="row-menu-item" onClick={() => copiarEndereco(menuEndereco)}>
          {copiado ? <Check size={20} weight="bold" /> : <Copy size={20} />}
          <span>{copiado ? 'Endereço copiado' : 'Copiar endereço'}</span>
        </button>
      )}
      {podeEditar && (
        <button
          type="button"
          role="menuitem"
          className="row-menu-item row-menu-item--danger"
          onClick={() => {
            setDeleteObraTarget({ id: menu.obra.id, nome: menu.obra.nome });
            fecharMenu();
          }}
        >
          <Trash size={20} />
          <span>Excluir obra</span>
        </button>
      )}
    </>
  ) : null;

  const temMenu = () => podeEditar;

  const abrirObra = (obra: Obra) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': `Abrir a obra ${obra.nome}`,
    onClick: () => onSelectObra(obra.id),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectObra(obra.id);
      }
    },
  });

  const botaoMais = (obra: Obra) =>
    temMenu() ? (
      <button
        type="button"
        className="btn-icon obra-more"
        aria-label={`Mais ações para ${obra.nome}`}
        aria-haspopup="menu"
        onClick={(e) => abrirMenu(e, obra)}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DotsThreeVertical size={20} weight="bold" aria-hidden="true" />
      </button>
    ) : null;

  return (
    <div className="page obra-list">
      {cabecalho}

      {aviso}

      <div className="cardless-section obra-list-rows">
        {obras.map((obra) => {
          const { totalTarefas, concluidas, percentual } = progressoDaObra(obra);
          const endereco = enderecoDa(obra);
          const data = formatarData(obra.dataPrevista);

          return (
            <React.Fragment key={obra.id}>
              {/* Desktop: colunas na linha */}
              <div className="cardless-row obra-row obra-row--desktop" {...abrirObra(obra)}>
                <div className="obra-col-main">
                  <div className="obra-col-head">
                    <span className="obra-name">{obra.nome}</span>
                    <span className="badge badge--neutral obra-etapas-badge">{obra.etapas.length} etapas</span>
                  </div>
                  <div className="obra-meta">
                    <span>
                      Cliente: <strong>{obra.cliente}</strong>
                    </span>
                  </div>
                  {endereco && <div className="obra-address">{endereco}</div>}
                </div>

                <div className="obra-col-date">
                  Previsão
                  <strong>{data || 'Não informada'}</strong>
                </div>

                <div className="obra-col-progress">
                  <div className="obra-progress">
                    <div className="progress-strip-track">
                      <div className="progress-strip-bar" style={{ width: `${percentual}%` }} />
                    </div>
                    <span className="obra-progress-text">
                      <strong>{percentual}%</strong>
                    </span>
                  </div>
                  <span className="obra-progress-text">
                    {concluidas}/{totalTarefas} serviços
                  </span>
                </div>

                <div className="obra-col-end">
                  {botaoMais(obra)}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </div>
              </div>

              {/* Mobile: linha hairline, sem cartão */}
              <div className="obra-row obra-row--mobile" {...abrirObra(obra)}>
                <div className="obra-row-top">
                  <span className="obra-name">{obra.nome}</span>
                  {botaoMais(obra)}
                </div>

                <div className="obra-meta">
                  <span>
                    <User size={14} weight="bold" aria-hidden="true" />
                    <strong>{obra.cliente}</strong>
                  </span>
                  {data && (
                    <span>
                      <CalendarBlank size={14} weight="bold" aria-hidden="true" />
                      <span>até {data}</span>
                    </span>
                  )}
                </div>

                {endereco && (
                  <div className="obra-address">
                    <MapPin size={14} weight="bold" aria-hidden="true" />
                    <span>{endereco}</span>
                  </div>
                )}

                <div className="obra-progress">
                  <div className="progress-strip-track">
                    <div className="progress-strip-bar" style={{ width: `${percentual}%` }} />
                  </div>
                  <span className="obra-progress-text">
                    <strong>{percentual}%</strong> · {concluidas}/{totalTarefas} serviços
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Mais ações: popover no desktop, sheet no mobile */}
      {menu &&
        !isMobile &&
        createPortal(
          <div className="row-menu" role="menu" style={{ top: menu.top, right: menu.right }}>
            {itensMenu}
          </div>,
          document.body
        )}
      {menu &&
        isMobile &&
        createPortal(
          <div className="modal-backdrop" onClick={fecharMenu}>
            <div
              className="modal-card row-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={menu.obra.nome}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">{menu.obra.nome}</h2>
                <button type="button" className="btn-icon" onClick={fecharMenu} aria-label="Fechar">
                  <X size={18} weight="bold" />
                </button>
              </div>
              <div className="modal-body" role="menu">
                {itensMenu}
              </div>
            </div>
          </div>,
          document.body
        )}

      {deleteObraTarget && (
        <ModalConfirm
          isOpen={true}
          title="Excluir obra"
          message={`Tem certeza que deseja excluir "${deleteObraTarget.nome}"? Todos os dados, etapas e fotos serão removidos.`}
          confirmText="Sim, excluir obra"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            onDeleteObra(deleteObraTarget.id);
            setDeleteObraTarget(null);
          }}
          onCancel={() => setDeleteObraTarget(null)}
        />
      )}
    </div>
  );
};
