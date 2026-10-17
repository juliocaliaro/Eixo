import React, { useState, useRef, useEffect } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
// Ordem do CSS: index e foundation antes deste arquivo (App importa os componentes antes de main.tsx importar os CSS globais)
import '../index.css';
import '../styles/foundation.css';
import '../styles/decisoes-diario.css';
import { SegmentedControl } from './SegmentedControl';
import { X, Camera, CircleNotch } from '@phosphor-icons/react';
import { Decisao, PerfilUsuario } from '../types/obra';
import { parseMoedaBR, formatarMoeda, mascararMoedaInput, proibirNaoNumericosMoeda } from '../utils/moeda';
import { generateUUID } from '../utils/uuid';
import { useFileIntake } from '../utils/useFileIntake';
import { blobToDataUrl } from '../utils/fileIntake';
import { apenasDigitos, diasAssinados, novaDataPrevista, type CamposPrazo } from '../utils/prazoDecisao';
import { formatarDataBR } from '../utils/data';

interface ModalCreateDecisaoProps {
  isOpen: boolean;
  onClose: () => void;
  perfilAtivo: PerfilUsuario;
  nomeUsuario: string;
  /** Data prevista atual da obra (YYYY-MM-DD), usada para exibir a nova data. */
  dataPrevistaObra?: string;
  onSubmit: (novaDecisao: Decisao) => void;
}

export const ModalCreateDecisao: React.FC<ModalCreateDecisaoProps> = ({
  isOpen,
  onClose,
  perfilAtivo,
  nomeUsuario,
  dataPrevistaObra,
  onSubmit,
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  type ModoImpacto = 'nenhum' | 'aditivo' | 'supressivo';
  type ModoPrazo = 'nenhum' | 'mais' | 'menos';
  const [modoImpacto, setModoImpacto] = useState<ModoImpacto>('nenhum');
  const [valor, setValor] = useState<string>('');
  const [modoPrazo, setModoPrazo] = useState<ModoPrazo>('nenhum');
  const [dias, setDias] = useState<string>('');
  const { items: fotoItems, handleInputChange: handleFileUpload, remove: handleRemoveFoto, clear: clearFotos } = useFileIntake();
  const fotos = fotoItems.map((f) => f.previewUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  // Exclusão mútua garantida pelo seletor: existe UM campo de valor e UM de dias.
  const prazo: CamposPrazo = {
    acrescimo: modoPrazo === 'mais' ? dias : '',
    reducao: modoPrazo === 'menos' ? dias : '',
  };
  const parsedValor = parseMoedaBR(valor);
  const valorPositivo = parsedValor !== undefined && parsedValor > 0 ? parsedValor : undefined;
  const parsedAditivo = modoImpacto === 'aditivo' ? valorPositivo : undefined;
  const parsedSupressivo = modoImpacto === 'supressivo' ? valorPositivo : undefined;

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValor(mascararMoedaInput(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
    const agora = new Date().toISOString();
    // Fotos comprimidas pela política única; o contrato de Decisao carrega data URLs até o save (services/assets.ts sobe ao Storage)
    const fotosDataUrl = await Promise.all(fotoItems.map((f) => blobToDataUrl(f.blob)));

    const temAditivo = parsedAditivo !== undefined && parsedAditivo > 0;
    const temSupressivo = !temAditivo && parsedSupressivo !== undefined && parsedSupressivo > 0;

    let valorAditivoFinal: number | undefined = undefined;
    let valorSupressivoFinal: number | undefined = undefined;
    let impactoFinanceiroCalculado: number | undefined = undefined;
    let tipoImpacto: 'aditivo' | 'supressivo' | undefined = undefined;

    if (temAditivo) {
      valorAditivoFinal = Math.abs(parsedAditivo!);
      impactoFinanceiroCalculado = valorAditivoFinal;
      tipoImpacto = 'aditivo';
    } else if (temSupressivo) {
      valorSupressivoFinal = Math.abs(parsedSupressivo!);
      impactoFinanceiroCalculado = -valorSupressivoFinal;
      tipoImpacto = 'supressivo';
    }

    const decisao: Decisao = {
      id: generateUUID(),
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      impactoFinanceiro: impactoFinanceiroCalculado,
      tipoImpactoFinanceiro: tipoImpacto,
      valorAditivo: valorAditivoFinal,
      valorSupressivo: valorSupressivoFinal,
      impactoPrazoDias: diasAssinados(prazo),
      criadaPor: perfilAtivo,
      criadorNome: nomeUsuario,
      criadaEm: agora,
      status: 'pendente',
      assinaturaCriador: {
        autor: perfilAtivo,
        nomeSignatario: nomeUsuario,
        assinadoEm: agora,
      },
      fotos: fotosDataUrl.length > 0 ? fotosDataUrl : undefined,
    };

      onSubmit(decisao);
      onClose();

      // Resetar
      setTitulo('');
      setDescricao('');
      setModoImpacto('nenhum');
      setValor('');
      setModoPrazo('nenhum');
      setDias('');
      clearFotos();
    } finally {
      setIsSubmitting(false);
    }
  };

  const diasPrazo = diasAssinados(prazo);
  const novaData = novaDataPrevista(dataPrevistaObra, diasPrazo);
  const podeEnviar = Boolean(titulo.trim() && descricao.trim()) && !isSubmitting;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card dec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nova proposta</h2>
          <button type="button" onClick={onClose} className="btn-icon" title="Fechar" aria-label="Fechar">
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dec-form">
          <div className="modal-body">
            <div className="form-group dec-field">
              <label className="form-label" htmlFor="dec-titulo">Título</label>
              <input
                id="dec-titulo"
                type="text"
                autoFocus
                required
                className="form-input"
                placeholder="Ex: Cor da tinta da sala"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="form-group dec-field">
              <label className="form-label" htmlFor="dec-descricao">Descrição</label>
              <textarea
                id="dec-descricao"
                required
                rows={3}
                className="form-textarea"
                placeholder="Descreva o que foi combinado"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="form-group dec-field">
              <span className="form-label" id="dec-seg-impacto">Impacto no valor</span>
              <SegmentedControl<ModoImpacto>
                labelledBy="dec-seg-impacto"
                valor={modoImpacto}
                opcoes={[
                  { valor: 'nenhum', texto: 'Sem valor' },
                  { valor: 'aditivo', texto: 'Aditivo' },
                  { valor: 'supressivo', texto: 'Supressivo' },
                ]}
                onChange={(m) => {
                  setModoImpacto(m);
                  if (m === 'nenhum') setValor('');
                }}
              />
            </div>
            {modoImpacto !== 'nenhum' && (
              <div className="form-group dec-field">
                <label className="form-label" htmlFor="dec-valor">
                  {modoImpacto === 'aditivo' ? 'Valor do aditivo (R$)' : 'Valor do supressivo (R$)'}
                </label>
                <input
                  id="dec-valor"
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="0,00"
                  value={valor}
                  onChange={handleValorChange}
                  onKeyDown={proibirNaoNumericosMoeda}
                />
                <p className="dec-hint">
                  {modoImpacto === 'aditivo'
                    ? valorPositivo ? `Soma ${formatarMoeda(valorPositivo)} ao valor do contrato.` : 'Soma ao valor do contrato.'
                    : valorPositivo ? `Reduz ${formatarMoeda(valorPositivo)} do valor do contrato.` : 'Reduz o valor do contrato.'}
                </p>
              </div>
            )}

            <div className="form-group dec-field">
              <span className="form-label" id="dec-seg-prazo">Prazo da obra</span>
              <SegmentedControl<ModoPrazo>
                labelledBy="dec-seg-prazo"
                valor={modoPrazo}
                opcoes={[
                  { valor: 'nenhum', texto: 'Sem alteração' },
                  { valor: 'mais', texto: 'Mais dias' },
                  { valor: 'menos', texto: 'Menos dias' },
                ]}
                onChange={(m) => {
                  setModoPrazo(m);
                  if (m === 'nenhum') setDias('');
                }}
              />
            </div>
            {modoPrazo !== 'nenhum' && (
              <div className="form-group dec-field">
                <label className="form-label" htmlFor="dec-dias">
                  {modoPrazo === 'mais' ? 'Dias a mais' : 'Dias a menos'}
                </label>
                <input
                  id="dec-dias"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  placeholder="0"
                  value={dias}
                  onChange={(e) => setDias(apenasDigitos(e.target.value))}
                />
                {diasPrazo !== undefined && (
                  <p className="dec-hint dec-hint--strong">
                    {novaData ? `Nova data prevista: ${formatarDataBR(novaData)}` : 'Obra sem data prevista'}
                  </p>
                )}
              </div>
            )}

            <div className="dec-field">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {fotos.length > 0 && (
                <div className="dec-thumbs">
                  {fotos.map((f, i) => (
                    <div key={i} className="dec-thumb">
                      <img src={f} alt="" />
                      <button
                        type="button"
                        className="dec-thumb-remove"
                        onClick={() => handleRemoveFoto(i)}
                        aria-label="Remover foto"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary btn--block">
                <Camera size={16} />
                <span>{fotos.length > 0 ? 'Adicionar outra foto' : 'Adicionar foto (opcional)'}</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" disabled={!podeEnviar} className="btn-primary">
              {isSubmitting ? (
                <>
                  <CircleNotch size={14} className="spin-animate" weight="bold" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar proposta</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
