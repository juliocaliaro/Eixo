import React, { useState, useRef } from 'react';
import {
  FilePdf,
  UploadSimple,
  CheckCircle,
  X,
  WarningCircle,
  Plus
} from '@phosphor-icons/react';
import { Obra, TipoProjeto } from '../types/obra';
import { TIPOS_PROJETO_LISTA, formatBytes } from '../utils/projetoConfig';

interface PublicUploadProjetoPageProps {
  obra: Obra;
  onUploadProjeto: (dados: {
    titulo: string;
    tipo: TipoProjeto;
    tipoCustomizado?: string;
    arquivoNome: string;
    tamanhoBytes: number;
    url: string;
    versao?: string;
    descricao?: string;
    remetenteNome: string;
  }) => void;
  onBackToApp?: () => void;
}

export const PublicUploadProjetoPage: React.FC<PublicUploadProjetoPageProps> = ({
  obra,
  onUploadProjeto,
  onBackToApp,
}) => {
  const [remetenteNome, setRemetenteNome] = useState('');
  const [tipo, setTipo] = useState<TipoProjeto>('eletrico');
  const [tipoCustomizado, setTipoCustomizado] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arquivoBase64, setArquivoBase64] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [versao, setVersao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Apenas arquivos em formato PDF são aceitos.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErro('Arquivo acima de 25MB.');
      return;
    }

    setErro('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setArquivo(file);
      setArquivoBase64(result);

      if (!titulo.trim()) {
        const nomeLimpo = file.name
          .replace(/\.pdf$/i, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        setTitulo(nomeLimpo);
      }
    };
    reader.onerror = () => {
      setErro('Falha ao processar arquivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!remetenteNome.trim()) {
      setErro('Informe seu nome ou empresa.');
      return;
    }

    if (!arquivo || !arquivoBase64) {
      setErro('Selecione um arquivo PDF.');
      return;
    }

    if (!titulo.trim()) {
      setErro('Informe o título do projeto.');
      return;
    }

    if (tipo === 'outro' && !tipoCustomizado.trim()) {
      setErro('Informe a disciplina do projeto.');
      return;
    }

    onUploadProjeto({
      titulo: titulo.trim(),
      tipo,
      tipoCustomizado: tipo === 'outro' ? tipoCustomizado.trim() : undefined,
      arquivoNome: arquivo.name,
      tamanhoBytes: arquivo.size,
      url: arquivoBase64,
      versao: versao.trim() || undefined,
      descricao: descricao.trim() || undefined,
      remetenteNome: remetenteNome.trim(),
    });

    setSucesso(true);
  };

  const handleReset = () => {
    setArquivo(null);
    setArquivoBase64('');
    setTitulo('');
    setVersao('');
    setDescricao('');
    setErro('');
    setSucesso(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-floating)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
        }}
      >
        {/* Header Minimalista (mesmo estilo do Modal interno) */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <FilePdf size={20} weight="fill" color="#b91c1c" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <h2 className="modal-title" style={{ fontSize: '1.05rem', margin: 0 }}>
                Anexar Projeto (PDF)
              </h2>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 1,
                }}
              >
                Obra: <strong>{obra.nome}</strong>
              </div>
            </div>
          </div>

          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="btn-icon"
              title="Voltar ao sistema"
              aria-label="Voltar"
            >
              <X size={18} weight="bold" />
            </button>
          )}
        </div>

        {sucesso ? (
          /* Estado de Sucesso Minimalista */
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckCircle size={30} weight="fill" />
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
              Projeto Enviado!
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 auto 20px', lineHeight: 1.4 }}>
              O arquivo foi anexado com sucesso à obra de <strong>{obra.nome}</strong>.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn-primary"
                style={{ padding: '9px 16px', fontSize: '0.88rem' }}
              >
                <Plus size={16} weight="bold" />
                <span>Enviar outro</span>
              </button>

              {onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '0.88rem' }}
                >
                  <span>Concluir</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Formulário Minimalista idêntico ao Modal da Plataforma */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="modal-body" style={{ padding: '18px 20px' }}>
              {erro && (
                <div
                  style={{
                    background: 'var(--coral-glow-50)',
                    border: '1px solid var(--coral-glow-300)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--coral-glow-700)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <WarningCircle size={16} weight="bold" />
                  <span>{erro}</span>
                </div>
              )}

              {/* SEU NOME OU EMPRESA */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: '0.80rem' }}>
                  Seu nome ou empresa *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Arq. Fernanda, Engenharia Silva..."
                  value={remetenteNome}
                  onChange={(e) => {
                    setRemetenteNome(e.target.value);
                    if (erro) setErro('');
                  }}
                  style={{ fontSize: '0.88rem' }}
                  required
                />
              </div>

              {/* SELETOR DE ARQUIVO MINIMALISTA */}
              <div style={{ marginBottom: 14 }}>
                {!arquivo ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileProcess(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `1.5px dashed ${isDragging ? 'var(--primary-accent)' : 'var(--border-hairline)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      textAlign: 'center',
                      background: isDragging ? 'var(--coral-glow-50)' : 'var(--dark-coffee-50)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <UploadSimple size={18} color="var(--primary-accent)" weight="bold" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Selecionar arquivo PDF
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--dark-coffee-50)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <FilePdf size={18} weight="fill" color="#b91c1c" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '280px',
                        }}
                      >
                        {arquivo.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({formatBytes(arquivo.size)})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setArquivo(null);
                        setArquivoBase64('');
                      }}
                      className="btn-icon"
                      title="Remover"
                      style={{ padding: 4 }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* CLASSIFICAÇÃO / DISCIPLINA (PILLS COMPACTOS) */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ marginBottom: 6, fontSize: '0.80rem' }}>
                  Classificação *
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TIPOS_PROJETO_LISTA.map((t) => {
                    const isSelected = tipo === t.id;
                    const IconComp = t.Icon;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTipo(t.id);
                          if (erro) setErro('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 9px',
                          borderRadius: 'var(--radius-full)',
                          border: isSelected ? `1.5px solid ${t.color}` : '1px solid var(--border-hairline)',
                          background: isSelected ? t.bg : '#ffffff',
                          color: isSelected ? t.color : 'var(--text-body)',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <IconComp size={13} weight={isSelected ? 'fill' : 'bold'} />
                        <span>{t.label.split('&')[0].trim()}</span>
                      </button>
                    );
                  })}
                </div>

                {tipo === 'outro' && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nome da disciplina (ex: Paisagismo, Gás...)"
                      value={tipoCustomizado}
                      onChange={(e) => setTipoCustomizado(e.target.value)}
                      autoFocus
                      style={{ fontSize: '0.85rem', padding: '7px 10px' }}
                    />
                  </div>
                )}
              </div>

              {/* TÍTULO E VERSÃO */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.80rem' }}>Título *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Planta de Iluminação"
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      if (erro) setErro('');
                    }}
                    style={{ fontSize: '0.88rem' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.80rem' }}>Versão</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Rev. 02"
                    value={versao}
                    onChange={(e) => setVersao(e.target.value)}
                    style={{ fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* OBSERVAÇÕES COMPACTAS */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.80rem' }}>Notas (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Atualização dos pontos de tomada."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--dark-coffee-50)',
              }}
            >
              <button
                type="submit"
                className="btn-primary"
                disabled={!arquivo}
                style={{
                  opacity: !arquivo ? 0.6 : 1,
                  padding: '9px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <Plus size={16} weight="bold" />
                <span>Enviar Projeto</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
