import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, ArrowSquareOut, EnvelopeSimple, Trash, ShareNetwork } from '@phosphor-icons/react';
import { Obra, PerfilUsuario } from '../types/obra';
import { adicionarAoAcesso, emailsDaObra, removerDoAcesso, ListaAcesso } from '../utils/emailsCliente';
import { ModalConfirm } from './ModalConfirm';
import { EmptyState } from './EmptyState';

interface ClientShareTabProps {
  obra: Obra;
  perfilAtivo: PerfilUsuario;
  onUpdateObra: (obra: Obra) => void;
  onSwitchToClient?: () => void;
}

/**
 * Compartilhar = lista de acesso da obra. Quem esta na lista ve a obra ao entrar com esse e-mail.
 * Cada alteracao e salva na hora (obra.emailsClientes + obra.clienteEmail pelo fluxo normal do ObraStore).
 */
export const ClientShareTab: React.FC<ClientShareTabProps> = ({ obra, perfilAtivo, onUpdateObra, onSwitchToClient }) => {
  const ehConstrutor = perfilAtivo === 'construtor';
  const emails = emailsDaObra(obra);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [paraRemover, setParaRemover] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const depois = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const salvar = (lista: ListaAcesso, mensagem: string) => {
    onUpdateObra({ ...obra, ...lista });
    setAviso(mensagem);
    depois(() => setAviso(''), 2600);
  };

  const adicionar = () => {
    if (!texto.trim()) return;
    const r = adicionarAoAcesso(obra, texto);
    if (r.invalidos.length) {
      setErro(`E-mail inválido: ${r.invalidos.join(', ')}`);
      setTexto(r.invalidos.join(' '));
    } else {
      setErro('');
      setTexto('');
    }
    if (r.adicionados.length) {
      salvar(r, r.adicionados.length === 1 ? 'E-mail adicionado.' : `${r.adicionados.length} e-mails adicionados.`);
    } else if (!r.invalidos.length && r.jaExistiam.length) {
      setErro(r.jaExistiam.length === 1 ? 'Este e-mail já está na lista.' : 'Esses e-mails já estão na lista.');
    }
  };

  const confirmarRemocao = () => {
    if (!paraRemover) return;
    salvar(removerDoAcesso(obra, paraRemover), 'Acesso removido.');
    setParaRemover(null);
  };

  const clientUrl = `${window.location.origin}${window.location.pathname}?perfil=cliente&obra=${obra.id}`;
  const copiar = () => {
    navigator.clipboard?.writeText(clientUrl);
    setCopied(true);
    depois(() => setCopied(false), 2600);
  };

  return (
    <div className="share-tab">
      <div>
        <div className="tab-head" style={{ marginBottom: 0 }}>
          <h2 className="tab-title">Compartilhar</h2>
          {ehConstrutor && (
            <div className="share-head-actions">
              {onSwitchToClient && (
                <button
                  type="button"
                  className="btn-secondary tab-cta share-testar-cliente-btn"
                  onClick={onSwitchToClient}
                  title="Alternar para a visualização que o cliente vê"
                >
                  <ArrowSquareOut size={16} weight="bold" />
                  <span>Testar visão do cliente</span>
                </button>
              )}
              <button type="button" className="btn-primary tab-cta" onClick={copiar}>
                {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                <span>{copied ? 'Link copiado' : 'Copiar link'}</span>
              </button>
            </div>
          )}
        </div>
        <p className="share-help" style={{ marginTop: 0 }}>
          {ehConstrutor
            ? 'Quem estiver na lista vê a obra ao entrar no Eixo com o mesmo e-mail. Clientes só acompanham a obra e respondem às decisões.'
            : 'Você acompanha a obra e responde às decisões. Quem edita a obra é o construtor.'}
        </p>
      </div>

      {ehConstrutor && (
        <>
          <div>
            <form
              className="share-add"
              onSubmit={(e) => {
                e.preventDefault();
                adicionar();
              }}
            >
              <input
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="off"
                className="form-input"
                aria-label="E-mail para dar acesso"
                aria-invalid={!!erro}
                placeholder="cliente@email.com"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  if (erro) setErro('');
                }}
              />
              <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                Adicionar
              </button>
            </form>
            <div className="share-feedback" aria-live="polite">
              {erro ? (
                <span style={{ color: 'var(--danger, #b91c1c)' }}>{erro}</span>
              ) : aviso ? (
                <span style={{ color: 'var(--text-muted)' }}>{aviso}</span>
              ) : null}
            </div>
          </div>

          {emails.length > 0 ? (
            <ul className="share-list">
              {emails.map((email) => (
                <li key={email}>
                  <EnvelopeSimple size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <span>{email}</span>
                  <button
                    type="button"
                    className="btn-icon touch-target-44"
                    aria-label={`Remover acesso de ${email}`}
                    onClick={() => setParaRemover(email)}
                    style={{ width: 44, height: 44, flexShrink: 0, border: 'none', background: 'transparent' }}
                  >
                    <Trash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShareNetwork} className="empty-state--nested" title="Nenhum e-mail com acesso ainda." hint="Adicione o e-mail do cliente para ele acompanhar a obra." />
          )}
        </>
      )}

      <ModalConfirm
        isOpen={!!paraRemover}
        title="Remover acesso?"
        message={`${paraRemover ?? ''} deixa de ver esta obra. Você pode adicionar o e-mail de novo quando quiser.`}
        confirmText="Remover"
        onConfirm={confirmarRemocao}
        onCancel={() => setParaRemover(null)}
      />
    </div>
  );
};
