import React, { useState, useRef } from 'react';
import {
  FilePdf,
  UploadSimple,
  CheckCircle,
  X,
  FileText,
  User,
  Tag,
  NotePencil,
  ArrowRight,
  ShieldCheck,
  BuildingApartment,
  MapPin,
  Sparkle,
  Plus
} from '@phosphor-icons/react';
import { Obra, TipoProjeto } from '../types/obra';
import { TIPOS_PROJETO_LISTA, getTipoProjetoConfig, formatBytes } from '../utils/projetoConfig';

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
  const [tipo, setTipo] = useState<TipoProjeto>('arquitetonico');
  const [tipoCustomizado, setTipoCustomizado] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arquivoBase64, setArquivoBase64] = useState<string>('');
  const [titulo, setTitulo] = useState('');
  const [versao, setVersao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [ultimoEnviado, setUltimoEnviado] = useState<string>('');

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setErro('O arquivo não pode ultrapassar 25MB.');
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
      setErro('Falha ao processar o arquivo. Tente novamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!remetenteNome.trim()) {
      setErro('Informe seu nome ou empresa para identificação.');
      return;
    }

    if (!arquivo || !arquivoBase64) {
      setErro('Selecione um arquivo ou prancha para enviar.');
      return;
    }

    if (!titulo.trim()) {
      setErro('Informe o título da prancha ou projeto.');
      return;
    }

    if (tipo === 'outro' && !tipoCustomizado.trim()) {
      setErro('Informe o nome da disciplina do projeto.');
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

    setUltimoEnviado(titulo.trim());
    setSucesso(true);
  };

  const handleResetForm = () => {
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
        padding: '24px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Topo com Marca e Identificação da Obra */}
      <div style={{ maxWidth: '640px', width: '100%', marginBottom: 20, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--pitch-black-950)',
              color: 'var(--pitch-black-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.5px',
            }}
          >
            E
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--pitch-black-950)', letterSpacing: '-0.3px' }}>
            Eixo
          </span>
        </div>

        {/* Card de Identificação da Obra Destino */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            textAlign: 'left',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--primary-accent)',
                background: 'var(--coral-glow-50)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Envio Direto • Sem Login
            </span>

            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Voltar ao Sistema
              </button>
            )}
          </div>

          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>
            {obra.nome}
          </h1>

          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span>Cliente: <strong style={{ color: 'var(--text-body)' }}>{obra.cliente}</strong></span>
            {obra.endereco && <span>• {obra.endereco}</span>}
          </div>
        </div>
      </div>

      {/* Conteúdo: Tela de Sucesso OU Formulário */}
      <div
        style={{
          maxWidth: '640px',
          width: '100%',
          background: '#ffffff',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-floating)',
          overflow: 'hidden',
        }}
      >
        {sucesso ? (
          /* Estado de Sucesso */
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle size={36} weight="fill" />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
              Projeto Enviado com Sucesso!
            </h2>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              O arquivo <strong>"{ultimoEnviado}"</strong> já foi anexado à obra de <strong>{obra.nome}</strong>. O construtor e a equipe já têm acesso à prancha.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResetForm}
                className="btn-primary"
                style={{ padding: '12px 22px' }}
              >
                <Plus size={18} weight="bold" />
                <span>Enviar Mais um Projeto</span>
              </button>

              {onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="btn-secondary"
                  style={{ padding: '12px 20px' }}
                >
                  <span>Concluir</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Formulário de Upload Direto */
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Anexar Projeto ou Prancha Técnica
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
                Preencha os dados abaixo e anexe seu arquivo em PDF.
              </p>
            </div>

            {/* Alerta de Erro se houver */}
            {erro && (
              <div
                role="alert"
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>•</span>
                <span>{erro}</span>
              </div>
            )}

            {/* 1. Identificação do Remetente */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <User size={16} color="var(--primary-accent)" weight="bold" />
                  Seu Nome ou Empresa *
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Arq. Fernanda Rocha, Engenharia Silva, etc."
                value={remetenteNome}
                onChange={(e) => {
                  setRemetenteNome(e.target.value);
                  if (erro) setErro('');
                }}
                required
              />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                O construtor saberá quem disponibilizou a prancha.
              </span>
            </div>

            {/* 2. Seleção de Disciplina Técnica */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={16} color="var(--primary-accent)" weight="bold" />
                  Disciplina do Projeto *
                </span>
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {TIPOS_PROJETO_LISTA.map((item) => {
                  const Icon = item.Icon;
                  const isSelected = tipo === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTipo(item.id);
                        if (erro) setErro('');
                      }}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-hairline)',
                        background: isSelected ? item.bg : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={20} weight={isSelected ? 'fill' : 'regular'} color={item.color} />
                      <span
                        style={{
                          fontSize: '0.80rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? item.color : 'var(--text-body)',
                          lineHeight: 1.2,
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {tipo === 'outro' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite o nome da disciplina (ex: Automação, Acústica...)"
                    value={tipoCustomizado}
                    onChange={(e) => setTipoCustomizado(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* 3. Área de Dropzone e Upload de Arquivo */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FilePdf size={16} color="var(--primary-accent)" weight="bold" />
                  Arquivo do Projeto (PDF até 25MB) *
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {!arquivo ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragOver ? 'var(--primary-accent)' : 'var(--border-hairline)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '28px 18px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragOver ? 'var(--coral-glow-50)' : 'var(--dark-coffee-50)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <UploadSimple
                    size={32}
                    color={isDragOver ? 'var(--primary-accent)' : 'var(--dark-coffee-600)'}
                    weight="bold"
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: 4 }}>
                    Toque para escolher ou arraste o arquivo PDF aqui
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Tamanho máximo: 25MB por arquivo
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--dark-coffee-50)',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FilePdf size={20} weight="fill" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {arquivo.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {formatBytes(arquivo.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setArquivo(null);
                      setArquivoBase64('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                    }}
                    title="Remover arquivo"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              )}
            </div>

            {/* 4. Título da Prancha e Versão */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Título da Prancha *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Planta Baixa e Layout"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    if (erro) setErro('');
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Versão / Rev.
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Rev. 02"
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                />
              </div>
            </div>

            {/* 5. Observações / Mensagem */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Observações Técnicas (opcional)
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Ex: Atualização dos pontos de tomada da bancada da cozinha conforme aprovação do cliente."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '1rem',
                justifyContent: 'center',
                minHeight: '46px',
              }}
            >
              <UploadSimple size={20} weight="bold" />
              <span>Enviar Projeto para a Obra</span>
            </button>
          </form>
        )}
      </div>

      {/* Rodapé com garantia de segurança */}
      <div
        style={{
          marginTop: 24,
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <ShieldCheck size={16} color="#16a34a" weight="fill" />
        <span>Ambiente seguro Eixo • Arquivos armazenados diretamente no projeto da obra</span>
      </div>
    </div>
  );
};
