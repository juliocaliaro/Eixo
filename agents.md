# Documento de Decisões do Projeto - Eixo (`agents.md`)

Este documento consolida todas as decisões arquiteturais, de experiência do usuário (UX/UI), design system, identidade de marca e regras de negócio tomadas para a evolução do **Eixo** (anteriormente Diário de Obra).

---

## 1. Visão Geral e Filosofia do Produto

- **Público-alvo**: Construtores, arquitetos, mestres de obras e seus clientes finais (muitas vezes pessoas com pouco contato diário com ferramentas tecnológicas complexas).
- **Diretriz primordial**: **"Menos é mais"** (usabilidade extrema, estratégias de wizard passo a passo, ausência de poluição visual, remoção de labels repetitivas e de banners informativos desnecessários).
- **Sem Alerts Nativos**: Todas as confirmações de exclusão e alertas do sistema usam modais desenhados no design system (`ModalConfirm`), banindo `window.alert()` e `window.confirm()`.
- **Supressão Estrita de Notificações em Mobile Durante Preenchimento/Registro**: Durante qualquer fluxo de cadastro, preenchimento de campos, foco em formulários ou modais/assistentes abertos no dispositivo móvel, nenhuma notificação (toast) pode subir ou ser exibida, impedindo a sobreposição de botões de ação ("Avançar", "Salvar"), obstrução do teclado virtual ou cliques residuais acidentais.

---

## 2. Design System & Identidade Visual

### 2.1 Paleta de Cores Corporativa
Substituição integral da paleta padrão pela nova escala quente e terrosa:
- **`pitch-black`**: Contrastes de texto e profundidade estrutural (`#1e1806` a `#fbf7ea`).
- **`dark-coffee`**: Tons de café tostado para superfícies neutras, bordas e tags (`#1a130a` a `#f8f3ed`).
- **`mauve-bark`**: Neutros quentes de transição para divisores e fundos secundários.
- **`cinnamon-wood`**: Acentos secundários quentes para notas e detalhes técnicos.
- **`coral-glow`**: Cor de acento primário (`--primary-accent`), utilizada em botões de ação primária, estados ativos e badges de pendência.

### 2.2 Princípios de Interface (Frontend Skill)
- **Estrutura Cardless**: Utilização de linhas limpas com divisores sutis (*hairline*) em listas de obras, tabelas de tarefas e feed de decisões, evitando repetição cansativa de cartões fechados.
- **Hero Fotográfico**: Tela inicial com fotografia autêntica de canteiro de obras e overlay escuro, transmitindo profissionalismo e solidez.
- **Proibição Estrita de Emojis**: Emojis como `👤`, `👷`, `📍`, `⚠️`, `✍️`, `⏳`, `🎉`, `✓`, `✕` foram integralmente substituídos por ícones vetorizados do **Phosphor Icons** (`@phosphor-icons/react`) ou SVGs vetorizados puros, garantindo um visual sóbrio, executivo e consistente entre sistemas operacionais.
- **Ícones Temáticos por Etapa**: Cada etapa técnica (proteção, escavação/fundação, demolição, elétrica/hidráulica, alvenaria, revestimentos, pintura, esquadrias/marcenaria, entrega/chaves) possui um ícone Phosphor dedicado com container de cor temática gerenciado por `src/utils/etapaIcons.ts`, facilitando a identificação imediata tanto no Wizard quanto no Cronograma.

### 2.3 Identidade de Marca: "Eixo" & Ícone Estrutural
- **Rebranding para Eixo**: Substituição do nome provisório genérico por uma marca original, livre de conflitos com concorrentes e memorável (4 letras). "Eixo" evoca precisão milimétrica, eixos estruturais de projetos técnicos (BIM/CAD) e a diretriz de "manter a obra no eixo", sem estouro de prazos ou orçamentos.
- **Ícone Aprovado (`docs/eixo-icon.jpg`)**: Nó estrutural isométrico com 3 eixos de sustentação (estilo Linear/Raycast), em tons de café escuro, linhas neutras e uma aresta de destaque em `coral-glow`, simbolizando a convergência perfeita entre engenharia, execução e cliente.

---

## 3. Controle de Acesso e Perfis de Usuário

A aplicação implementa dois perfis com níveis de permissão transparentes:

### 3.1 Perfil Construtor (`perfilAtivo === 'construtor'`)
- Acesso pleno à gestão do canteiro.
- Criação e exclusão de obras.
- Criação de etapas via Wizard, adição e edição de serviços, reordenação de itens via drag and drop (`⋮⋮`).
- Marcação de conclusão de tarefas, upload de fotos comprobatórias e registro de anotações técnicas.
- Proposta e assinatura de decisões.

### 3.2 Perfil Cliente (`perfilAtivo === 'cliente'`)
- Modo de acompanhamento transparente (cronograma físico, anexos e projetos em **Read-Only**).
- **Apenas Decisões e Aprovações com Interação Ativa**: A **única** seção onde o cliente tem permissão de acrescentar ou interagir ativamente é na aba **Decisões & Aprovações** (propor alterações, aprovar/assinar decisões e recusar propostas). Todo o restante da plataforma opera estritamente em modo de acompanhamento.
- **Restrição de Criação/Exclusão Geral**: O cliente **não visualiza** botões de criar nova obra, adicionar ou inserir etapas no cronograma (inclusive quando a obra ainda não possui etapas), adicionar serviços, adicionar anexos no diário, anexar projetos em PDF, gerar links externos de upload, nem ícones de lixeira para exclusão.
- **Read-Only no Cronograma e Tarefas**: Checkboxes de serviços, botões de adição/edição de etapas e tarefas, drag and drop e botões de adicionar fotos/anotações nos detalhes da tarefa ficam integralmente ocultos/desabilitados.
- **Acesso Completo às Evidências e Documentos**: Visualização irrestrita de fotos ampliadas, anotações do diário, datas de conclusão de cada serviço e download/visualização de projetos em PDF.

### 3.3 Compartilhamento e Sincronização
- Parâmetros de URL sincronizados automaticamente em tempo real (`?obra=ID_DA_OBRA&tab=ABA_ATIVA&perfil=PERFIL`), garantindo que ao atualizar a página (F5) o usuário nunca perca o contexto da obra aberta.
- Suporte à navegação nativa do navegador (botões Voltar/Avançar via evento `popstate`).
- Aba dedicada no corpo da obra (**Compartilhar**) com botão de cópia rápida e resumo claro de permissões.

---

## 4. Central de Decisões & Aprovações (Assinatura Digital)

- **Mecânica de Aceite Bilateral**:
  - Tanto o Construtor quanto o Cliente podem registrar decisões técnicas ou de acabamento (escolha de pisos, pontos de tomada, aditivos de contrato).
  - O proponente assina a decisão automaticamente no ato da criação.
  - A decisão fica em estado `pendente` (com selo e ícone `<Clock />`) até a contraparte analisar.
  - A contraparte possui ações imediatas de **Concordar e Assinar** ou **Recusar**.
  - Uma vez assinada pela contraparte, a decisão torna-se `aprovada` e exibe carimbo digital auditável com nome, perfil e data/hora exatos de ambas as assinaturas.
- **Modal de Criação Minimalista**: Apenas título, descrição, campos financeiros dedicados de **Aditivo (R$)** (+ Acréscimo) e **Supressivo (R$)** (- Redução Contratual) com exclusão mútua estrita (apenas um dos campos pode ser preenchido por decisão, impedindo preenchimento simultâneo) e upload opcional de fotos de amostra, sem textos redundantes nem campo de categoria.
- **Remoção de Categorias**: O seletor de categorias foi removido da criação para desburocratizar o registro de decisões pelo usuário.
- **Central de Notificações**: Sininho com contador em tempo real no topo informando decisões pendentes da assinatura do perfil logado, com dropdown para navegação direta.
- **Card de Decisões Responsivo (Accordion Exclusivo no Mobile)**:
  - **Versão Web / Desktop (> 768px)**: Permanece 100% inalterada, sempre exibindo o card completo com cabeçalho, autor, data, tags, valor, descrição, amostras e bloco de assinatura digital aberto.
  - **Versão Mobile (<= 768px)**: Opera como componente expansível (Accordion/Collapse). No **Estado Minimizado**, exibe exclusivamente o título da decisão, a tag de status, o valor (aditivo/supressivo) e o ícone de seta (Chevron) no canto direito indicando expansão. No **Estado Expandido** (revelado ao clicar), exibe autor, data, descrição completa, fotos de referência, botão de notificação via WhatsApp e todo o bloco de Assinatura Digital com as ações finais (`Recusar` e `Concordar e Assinar Decisão`).

---

## 5. Navegação & Desacoplamento Estrutural

1. **Header Geral Limpo**:
   - O header contém estritamente o logotipo, o seletor de perfil pill (`[ Construtor ]` / `[ Cliente ]`) e o sininho de notificações.
   - O botão "Nova Obra" foi removido do header e vive apenas na listagem de obras do construtor.
2. **Barra Superior Interna da Obra**:
   - O botão `[ ← Todas as Obras ]` fica dentro do corpo de `ObraDetail`, na mesma linha da ação de **Editar Obra**, que foi movida do rodapé para o topo, alinhada à direita e representada exclusivamente por um ícone de lápis padrão (`<PencilSimple size={18} />`).
3. **Sequência Oficial de Abas por Perfil**:
   - **Visão do Construtor**: `Etapas`, `Arquivos`, `Decisões`, `Diário`, `Compartilhar`.
   - **Visão do Cliente**: `Diário`, `Etapas`, `Arquivos`, `Decisões`, `Compartilhar`. Na visão do cliente, o Diário de Obra assume a primeira posição do menu, permitindo que o cliente acompanhe imediatamente o feed/extrato diário do canteiro ao abrir a obra.
4. **Navegação Cruzada (Diário $\rightarrow$ Etapas)**:
   - Clicar nos detalhes de uma anotação ou serviço no Diário navega instantaneamente para a aba de Etapas.
   - O accordion da etapa é expandido automaticamente caso esteja fechado.
   - O cronograma rola suavemente até centralizar a tarefa na tela.
   - A tarefa recebe destaque pulsante temporário (`.task-highlight-pulse`).
   - O modal de detalhes da tarefa (`ModalTaskDetails`) abre de imediato com suas fotos e observações.

---

## 6. Micromotions e Estabilidade de Componentes

- **Botão "Inserir etapa aqui"**:
  - Inicia discreto como um círculo de `26px` exibindo apenas o ícone `+` sobre uma linha divisória fina entre etapas.
  - No hover ou foco, expande suavemente via transição cubic-bezier revelando o texto `"Inserir etapa aqui"` com realce primário.
- **Caret do Accordion**:
  - Rotação fluida de `180deg` via CSS ao abrir/fechar etapas, com propagação de clique corrigida em toda a extensão do cabeçalho.
- **Estabilidade do Modal de Tarefa**:
  - Dimensões fixas padronizadas (`width: 640px; height: 560px`) com rolagem interna, impedindo saltos ou mudanças de tamanho ao alternar abas de fotos e notas.
- **Registro Temporal Completo**:
  - Registro de data e horário de conclusão em etapas (`etapa.concluidaEm`) e tarefas (`tarefa.concluidaEm`), permitindo auditoria clara do avanço físico diário.

---

## 7. Persistência de Dados

- Armazenamento em `localStorage` através do utilitário `src/utils/storage.ts`.
- Suporte a carga de obra de demonstração completa com histórico realista de etapas, fotos e decisões pré-assinadas.

---

## 8. Gestão de Templates & Modelos de Obra (`ConfigTemplatesPage`)

- **Página de Configuração Geral**:
  - Acessível pelo ícone de engrenagem (`<Gear />`) no cabeçalho ou pelo botão `[ Modelos de Obra ]` na listagem principal para o perfil Construtor.
  - Permite criar novos modelos (ex: *Design de Interiores*, *Fachada*, etc.) em branco ou clonados a partir de modelos existentes.
  - Customização plena de etapas (criação, edição inline de nomes, exclusão com modal de confirmação e reordenação).
  - Customização de serviços padrão dentro de cada etapa (adição rápida, edição inline, exclusão e reordenação).
  - Opção de **Restaurar Padrões de Fábrica** para recuperar os conjuntos originais de *Construção* e *Reforma*.
- **Sincronização com o Wizard de Etapas**:
  - O `ModalCreateEtapaWizard` consome dinamicamente os modelos ativos em `localStorage`.
  - Quaisquer alterações ou novos modelos criados ficam imediatamente disponíveis para inclusão em qualquer obra.

---

## 9. Central de Projetos e Documentos (`ProjetosTab` & `ModalUploadProjeto`)

- **Aba "Arquivos" (Projetos e Documentos) na Obra**:
  - Aba integrada na visualização da obra (`ObraDetail`), posicionada como 2ª aba, logo após Etapas & Cronograma e antes de Decisões & Aprovações.
  - Exibe contador dinâmico de pranchas/projetos anexados.
- **Upload com Classificação Técnica Obrigatória**:
  - O modal `ModalUploadProjeto` exige a definição da disciplina do projeto (Elétrico, Hidráulico, Demolição, Arquitetônico, Estrutural, Climatização, Marcenaria ou Outro com digitação livre).
  - Ícones e cores temáticas exclusivas para cada disciplina (`src/utils/projetoConfig.ts`).
  - Suporte a drag & drop de arquivos PDF, extração automática de título sugerido a partir do nome do arquivo, versão/revisão (ex: *Rev. 02*) e observações técnicas.
- **Visualização e Download Integrados**:
  - Ações rápidas de **Visualizar** (modal com visualizador embutido ou abertura em nova guia) e **Baixar** direto no dispositivo.
  - Filtros rápidos por chips de categoria e busca textual em tempo real.
- **Responsividade do Card de Projetos (`.projeto-card`)**:
  - Versão Web / Desktop: Layout horizontal em linha (`Row`) intacto com informações à esquerda e ações alinhadas à direita.
  - Versão Mobile (`max-width: 768px`): Direção em coluna (`Column`), com o grupo de botões (*Visualizar*, *Baixar* e *Lixeira*) caindo para uma nova linha abaixo das informações do arquivo, garantindo espaço total para textos e metadados no celular.

---

## 10. Listas Padrão Oficiais de Construção e Reforma

### 10.1 Construção (12 Etapas Técnicas)
1. **Projetos e Legalização**: Levantamento topográfico/sondagem, elaboração de projetos arquitetônicos e complementares, aprovação em prefeitura/alvará, ligações provisórias de água e energia.
2. **Terreno e Canteiro**: Limpeza e nivelamento do terreno, montagem de tapume/portões, canteiro de obras (banheiro, almoxarifado, refeitório), locação da obra (gabarito).
3. **Fundação e Contenção**: Cortes, aterros e muros de arrimo, escavação das fundações, concretagem de sapatas/estacas e vigas baldrame, impermeabilização das fundações.
4. **Estrutura**: Fôrmas e ferragens para pilares e vigas, concretagem de pilares, vigas e lajes, desforma e cura do concreto.
5. **Alvenaria e Vedação**: Elevação de paredes, vergas e contravergas, chumbamento de contramarcos.
6. **Cobertura e Aquecimento**: Estrutura do telhado, boiler e caixas d'água, telhas e subcobertura (manta térmica), calhas, rufos e condutores pluviais.
7. **Infraestrutura e Instalações Brutas**: Rasgos nas paredes, eletrodutos, quadros e fotovoltaica, cabeamento de rede/automação/CFTV, tubulações hidráulicas (água fria/quente/esgoto), infraestrutura de ar-condicionado, fechamento de rasgos.
8. **Revestimentos Brutos**: Chapisco, emboço e reboco, execução de contrapiso, impermeabilização de áreas molhadas e varandas.
9. **Revestimentos e Gesso**: Forros de gesso, assentamento de pisos e revestimentos, bancadas, soleiras e nichos.
10. **Acabamentos e Pintura**: Preparação, emassamento e lixamento, pintura, pisos quentes (laminado/vinílico) e rodapés, portas e esquadrias finais (vidro/alumínio).
11. **Área Externa e Paisagismo**: Piscina (escavação/revestimento), pavimentação externa, portões e grades, preparo de solo e plantio.
12. **Finalização**: Placas solares/inversor, aquecimento solar de boiler, louças/metais/espelhos, luminárias e tomadas, ar-condicionado, limpeza fina, desmobilização de canteiro, Habite-se e entrega de chaves. *(Nota: Testes operacionais e vistorias de acabamento foram migrados para o Checklist de Vistoria Final / Punch List de Entrega).*

### 10.2 Reforma (6 Etapas Técnicas)
1. **Isolamento e Preparação**: Proteção de elevadores e áreas comuns, proteção de pisos existentes, isolamento de móveis, desmontagem e armazenamento de itens reutilizáveis.
2. **Demolição**: Demolição de alvenarias e revestimentos, remoção de forros/drywall, descarte de louças antigas, ensacamento de entulho.
3. **Infraestrutura e Construção**: Novas paredes, adequação de pontos elétricos/iluminação, pontos hidráulicos/esgoto, fechamento de rasgos.
4. **Revestimentos e Gesso**: Forros de gesso, impermeabilização de áreas molhadas, assentamento de novos revestimentos, bancadas e nichos.
5. **Acabamentos e Pintura**: Preparação, emassamento e lixamento, pintura, pisos quentes e rodapés, portas.
6. **Finalização**: Louças, metais e espelhos, luminárias e espelhos de tomada, limpeza fina. *(Nota: A antiga etapa 7 "Testes" foi integralmente absorvida pelo Checklist de Vistoria Final / Punch List de Entrega).*

---

## 11. Relatórios Técnicos (Conclusão vs Medição Parcial) & Status Padronizados

- **Modelo Dual de Emissão de Relatório**:
  - **Relatório de Conclusão da Obra (100% Concluído)**: Dossiê executivo completo emitido quando todas as etapas e tarefas estiverem finalizadas. Contém o **Termo de Aceite Definitivo & Entrega de Chaves** formalizando a entrega física da obra, acompanhado de campos de assinatura física do construtor responsável e do cliente/proprietário.
  - **Relatório de Evolução Física e Medição (<100%)**: Emitido a qualquer momento durante a execução para fins de medição periódica, avanço físico e prestação de contas. Contém o **Termo de Responsabilidade & Declaração de Pendências**, acompanhado de tabela oficial discriminando todas as atividades ainda em andamento ou pendentes. **Os campos de assinatura física foram expressamente removidos deste relatório**, operando com autenticidade eletrônica nativa da plataforma Eixo com data de emissão.
- **Padrão Oficial de 3 Status (Proibição Estrita de Vermelho para Pendente)**:
  - **Concluído** (Verde `#15803d`, fundo `#dcfce7`, borda `#bbf7d0`): atividade finalizada com data/hora de conclusão.
  - **Em andamento** (Âmbar `#b45309`, fundo `#fef3c7`, borda `#fde68a`): atividade iniciada e em execução no canteiro (com fotos/anotações anexadas ou status manual).
  - **Pendente** (Cinza Neutro `#4b5563`, fundo `#f3f4f6`, borda `#e5e7eb`): atividade planejada para execução futura, evitando tons alarmistas de erro/vermelho e mantendo a sobriedade executiva da plataforma.
- **Dossiê Integral Anexo**:
  - Consolidação direta de todo o histórico: cronograma físico cumprido, diário fotográfico com observações de canteiro, decisões aprovadas com carimbos digitais bilaterais, projetos técnicos em PDF e termo de vistoria técnica.
  - Emissão e Entrega: **Baixar Relatório** (visualização executiva e impressão nativa A4 / Salvar como PDF via motor do navegador, 100% gratuita).
- **Vinculação de Empresa/Empreiteiro e Transição para Login**:
  - A propriedade `empresaResponsavel` foi estruturada nativamente na interface `Obra` (`src/types/obra.ts`).
  - No estágio atual (sem login obrigatório), o sistema utiliza a persistência local (`eixo_empresa_cadastrada`) para preencher e lembrar a empresa que registrou a obra.
  - **Diretriz para o Módulo de Login**: Quando o sistema de autenticação for implementado, o nome da empresa ou empreiteiro será populado automaticamente a partir do perfil do usuário logado (`user.organization` / `user.company_name`), garantindo preenchimento 100% automático e eliminando a necessidade de inserção manual.

---

## 12. Notificação e Cobrança via WhatsApp (Sugestão 7)

- **Acionamento em 1 Clique**:
  - Botão dedicado `[ Avisar no WhatsApp ]` integrado diretamente nos cartões de decisões pendentes de validação na aba `DecisoesTab`.
  - Utiliza o esquema universal `https://wa.me/?text=...` com codificação segura de caracteres (`encodeURIComponent`).
- **Mensagem Pré-Formatada Executiva**:
  - Título oficial da decisão em negrito.
  - Resumo contextual da descrição da pendência.
  - Impacto financeiro (se houver, ex: `+R$ 1.250,00`) e impacto em dias no prazo (se houver, ex: `+3 dias úteis`).
  - Link direto e inteligente para a aba da obra com o perfil destinatário correto (`?obra=ID&perfil=...&tab=decisoes`).

---

## 13. Painel Financeiro de Aditivos e Supressivos Contratuais (Sugestão 8)

- **Gestão Contratual Transparente**:
  - Campo opcional `orcamentoInicial` cadastrado na criação ou edição da obra (`ModalCreateObra`, `ModalEditObra`).
  - **Mecânica de Aditivo e Supressivo**:
    - **Aditivo (+R$)**: acréscimo de escopo ou melhoria técnica que eleva o investimento final.
    - **Supressivo (-R$)**: exclusão de escopo, permuta de acabamentos por itens mais econômicos ou reajuste contratual para baixo, deduzindo diretamente do saldo do contrato.
    - **Exclusão Mútua**: cada decisão pode conter estritamente um Aditivo ou um Supressivo (nunca ambos simultâneos), garantindo que cada pleito seja auditável e claro quanto à sua natureza de acréscimo ou dedução.
  - Soma automática e auditável de todos os aditivos e supressivos aprovados bilateralmente (`status === 'aprovada'`).
  - Fórmula matemática consolidada: `Investimento Atualizado = Orçamento Base + Aditivos Aprovados + Supressivos Aprovados (negativo)`.
- **Visualização em Pílulas e Cards**:
  - **Painel em `DecisoesTab`**: Grid executivo com indicadores dinâmicos: *Orçamento Contratual Base*, *Aditivos Aprovados*, *Supressivos Aprovados* (destaque em verde economia), *Investimento Atualizado* e *Propostas em Análise*.
  - **Badges de Decisões**: Decisões com acréscimo exibem `Aditivo: +R$ X,XX`; decisões com dedução exibem `Supressivo: -R$ X,XX` em verde; e decisões com ambos exibem os dois badges e o saldo líquido resultante.
  - **Notificação WhatsApp**: Mensagem gerada rotula explicitamente `(Aditivo)`, `(Supressivo / Redução)` ou o detalhamento de ambos com saldo.
  - **Faixa de Metadados em `ObraHeader`**: Exibição compacta do orçamento base e do saldo líquido de alterações acumuladas.
  - **Dossiê em `ModalPreviewRelatorio`**: Registro formal do orçamento base, aditivos aprovados, supressões aprovadas e investimento final nos metadados, KPIs e no Capítulo 3 e 4 do relatório impresso/PDF.

---

## 14. Remoção do Termômetro de Prazo e Ritmo de Cronograma

- **Decisão de Simplificação ("Menos é mais")**:
  - Removido da listagem geral (`ObraList`) e do cabeçalho detalhado (`ObraHeader`) para preservar a sobriedade executiva da interface e evitar ruídos visuais desnecessários.
  - O controle de cronograma permanece centrado na data prevista de entrega e no avanço físico real das etapas e tarefas.

---

## 15. Checklist de Vistoria Final (Sugestão 11)

- **Módulo Dedicado de Pré-Entrega (`VistoriaPunchList`)**:
  - Oficialmente denominado **"Vistoria Final"**.
  - Posicionado na aba de Etapas & Cronograma (`ObraDetail`), complementando o encerramento físico da obra.
  - **Zero Tarefas Pré-Definidas**: Sem itens ou checklists pré-carregados engessados. A lista inicia 100% limpa, permitindo ao construtor cadastrar livremente pendências customizadas por ambiente (ex: "Suíte", "Varanda Gourmet", "Fachada") através do botão "Adicionar Item".
  - Checkboxes interativos com registro de data/hora de resolução (`concluidoEm`).
  - Exclusão com modal de confirmação no Design System (`ModalConfirm`).
  - Selo visual de conformidade quando 100% das pendências forem sanadas.
- **Inclusão no Dossiê de Conclusão**:
  - Seção integrada no Capítulo 5 do Relatório de Conclusão (`ModalPreviewRelatorio`), servindo como termo de vistoria técnica e aceite de entrega de chaves.

---

## 16. Diário de Obra (Extrato Diário de Canteiro - "Extrato de Banco")

- **Conceito & Filosofia**:
  - Substituição da antiga aba "Anexos & Diário" pela aba exclusiva **"Diário de Obra"** (`DiarioObraTab`).
  - Consolidação unificada de todas as movimentações importantes da obra (serviços concluídos, etapas finalizadas, propostas e aprovações de decisões bilaterais com aditivos/supressivos, evidências fotográficas, anotações de canteiro e itens de vistoria técnica validados).
  - Apresentação em formato de **extrato de banco**, agrupando todos os eventos cronologicamente por dia (do mais recente ao mais antigo: `Hoje`, `Ontem`, seguido por datas anteriores formatadas com o dia da semana).
- **Estrutura por Dia ("Extrato Bancário")**:
  - **Cabeçalho Diário**: Data completa formatada, contador de eventos do dia e pílula de saldo financeiro do dia (se houver decisões com impacto monetário aprovadas ou propostas naquela data).
  - **Linhas de Lançamento (Movimentações)**:
    - Coluna de horário de registro (`HH:mm`).
    - Container de ícone temático vetorizado (Phosphor Icons) categorizado por cor.
    - Badge de categoria (`Etapa`, `Decisão`, `Evidência`, `Financeiro`).
    - Título do evento em destaque e subtítulo contextual (ex: Etapa de origem, autor da proposta, status).
    - Bloco de descrição e anotações técnicas quando houver.
    - Miniaturas de fotos com clique para abertura de **Lightbox em Tela Cheia** (com suporte à tecla `Escape`).
    - Badges de impacto financeiro (`+ R$ X,XX (Aditivo)` / `- R$ X,XX (Supressivo)`).
    - Botões de navegação rápida: atalho para abrir os detalhes da tarefa no Cronograma ou atalho para navegar diretamente até a aba de Decisões.
- **Cabeçalho Minimalista & Ausência de Contadores ("Menos é mais")**:
  - Remoção de contadores e pílulas de indicadores no topo do diário, mantendo o cabeçalho estritamente limpo e executivo em linha única.
  - Exibição de tag sutil de período ativo com botão de fechamento rápido (`✕`).
- **Filtro de Período em Ícone Flutuante (Design System `ProjetosTab`)**:
  - Eliminação de chips horizontais de categorias (`Todos`, `Serviços`, `Decisões`, etc.), desobstruindo a visualização do extrato.
  - Filtro de período encapsulado em botão de ícone de funil (`<Funnel size={18} />`) de 38x38px com dot de destaque em `coral-glow` quando ativo.
  - Popup flutuante com as opções `Todo o período`, `Hoje`, `Últimos 7 dias`, `Últimos 30 dias` e `Selecionar intervalo` (com inputs inline `De:` e `Até:`).
- **Busca em Ícone com Popup Flutuante (Design System `ProjetosTab`)**:
  - A barra de busca inline foi substituída por um botão de ícone de lupa (`<MagnifyingGlass size={18} />`) de 38x38px idêntico ao da aba Arquivos.
  - Exibe indicador (*dot* em `coral-glow`) quando há termo pesquisado.
  - Ao clicar, abre popup flutuante suspenso com campo de texto autofocado, ícone de limpeza (`✕`) e fechamento via clique fora ou tecla `Escape`.
- **Permissões Rigorosas por Perfil**:
  - **Construtor**: Visualização completa + botão `[ + Novo Registro ]` abrindo modal para lançar anotação técnica ou foto direcionada a um serviço específico de qualquer etapa ou como anotação geral de canteiro.
- **Card de Registro Responsivo (Accordion Exclusivo no Mobile)**:
  - **Versão Web / Desktop (> 768px)**: Mantém o layout horizontal cardless intacto e totalmente aberto, exibindo hora, ícone temático, tag de status, etapa, título, descrição, fotos, valores financeiros e atalhos rápidos de navegação.
  - **Versão Mobile (<= 768px)**: Opera como componente expansível (Accordion/Collapse). No **Estado Minimizado (Padrão)**, oculta a hora, caixa de texto com detalhes e botões de atalho, exibindo duas informações empilhadas: o **Título Principal** em destaque com o nome da Etapa (ex: 'Demolição') e o **Subtítulo** logo abaixo com o nome da tarefa executada (ex: 'Ensacamento e descarte de entulho.'), acompanhados do Chevron no canto direito indicando expansão. No **Estado Expandido (Ao clicar)**, expande para baixo revelando a hora, tag de status, etapa contextual, caixa de descrição detalhada, anotações de campo, miniaturas de fotos e botões de ação ("Cronograma" / "Decisões").

---

## 17. Otimizações de Engenharia Web Wizard (Frontend Design, CRO & A11y)

- **Cadastro de Obra em Tela Única (`ModalCreateObra`)**:
  - Substituição do antigo assistente de 3 etapas com 1 campo por tela por um modal unificado, fluido e direto, eliminando o timer artificial de 250ms contra duplo toque no mobile.
  - Permissão de data de entrega para a data atual (hoje em diante).
- **Máscara Monetária em Tempo Real & Proibição de Letras (`src/utils/moeda.ts`)**:
  - Implementação das funções `mascararMoedaInput(valor)` e `proibirNaoNumericosMoeda(e)` em todos os campos de entrada monetária (`ModalCreateObra`, `ModalEditObra` e campos de Aditivo e Supressivo em `ModalCreateDecisao`).
  - Máscara dinâmica com deslocamento de centavos em tempo real durante a digitação (`onChange`), com formatação no padrão brasileiro (`pt-BR`) e separadores automáticos de milhar e centavos.
  - Permite apagar completamente o campo com Backspace/Delete (retornando string vazia `""` para evitar engasgos em `"0,00"`).
  - Bloqueio estrito de digitação de letras, pontuações e símbolos não numéricos via interceptação em `onKeyDown` (`proibirNaoNumericosMoeda`), preservando atalhos de sistema/clipboard (`Ctrl/Cmd + C, V, A, X, Z`) e navegação por setas.
  - Teclado numérico invocado automaticamente no mobile com `inputMode="numeric"`.
- **Acessibilidade Universal & Fechamento com `Escape`**:
  - Implementação consistente de listeners da tecla `Escape` em todos os 11 modais e diálogos do sistema.
  - Tratamento de precedência no `DatePickerInput` para que pressionar `Escape` feche apenas o popover de calendário sem fechar o modal pai.
  - Alvos de toque expandidos para o padrão WCAG 2.5.5 (mínimo de 44px × 44px) em checkboxes de tarefas (`.task-checkbox::before`) e handles de arraste.
  - Navegação por teclado completa com `tabIndex={0}`, `role="button"` e estilos de `:focus-visible` em linhas de obras e cabeçalhos sanfonados de etapas, com bloqueio estrito de propagação de eventos (`e.target !== e.currentTarget`).
- **Code-Splitting & Otimização de Bundle**:
  - Divisão de código com `React.lazy()` e `Suspense` em telas e modais volumosos (`ModalPreviewRelatorio`, `ConfigTemplatesPage`, `PublicUploadProjetoPage`).
  - Importação dinâmica assíncrona do motor de celebração `canvas-confetti` apenas no ato de conclusão da etapa/tarefa.
  - Redução expressiva do chunk inicial de 668 kB para 588 kB.
- **Higienização de Código Morto**:
  - Remoção definitiva de componentes órfãos descontinuados (`AnexosTab.tsx` e `ModalShareClient.tsx`).

---

## 18. Módulo de Registro de Materiais & Histórico de Canteiro

- **Acesso Centralizado Exclusivo pelo Menu Lateral**:
  - O botão de acionamento do `[ Registro de Materiais ]` foi centralizado e vive **exclusivamente no menu lateral (`SandwichMenu.tsx`)**, tendo sido removido de dentro da obra (`DiarioObraTab`) para simplificar a visualização do canteiro.
  - A seleção da obra alvo é feita no próprio modal `ModalRegistroMaterial`, garantindo integridade e consistência.
- **Vínculo Obrigatório de Obra**:
  - O modal `ModalRegistroMaterial` exige a seleção obrigatória de uma obra já cadastrada via dropdown (`<select>`), garantindo integridade referencial dos dados (`obraId`).
- **Campos Oficiais do Formulário**:
  - **Status do Material**: Dropdown seletor com opção padrão `"Materiais"`, além de estados de conferência (`Entregue na Obra`, `Comprado / A caminho`, `Pendente / Em cotação`).
  - **Descrição / Nome do Material**: Campo de texto curto para denominação e especificação do insumo.
  - **Fotos e Comprovantes**: Upload múltiplo com miniaturas de pré-visualização, remoção rápida e compressão automática para notas fiscais e fotos físicas no canteiro.
  - **Observações**: Campo de texto longo para fornecedor, conferência quantitativa, lote e número de nota fiscal.
- **Exibição Bilateral Transparente**:
  - O material registrado é consolidado no feed e no histórico diário da obra (`DiarioObraTab`), visível tanto para o Construtor quanto para o Cliente.
  - Exibição com badge temático `MATERIAL`, linha temporal detalhada, notas e galeria de fotos com suporte a Lightbox em tela cheia.

---

## 19. Autenticação Frontend Mockada & Gerenciamento de Estado de Role

- **Tela de Login Dedicada (`LoginPage.tsx`)**:
  - Interface moderna e minimalista alinhada ao design system do Eixo (paleta terrosa, ícones Phosphor, zero emojis e zero alerts nativos).
  - Inputs de **E-mail** e **Senha** com toggle de visibilidade de senha (ícones `<Eye />` e `<EyeSlash />`).
  - Botão de submissão **Entrar** (`Submit`) e link **Esqueceu a senha?** com modal acessível de recuperação simulada.
  - Seletor de Perfil de Acesso (`[ Construtor ]` / `[ Cliente ]`) e atalhos de acesso rápido para testes de desenvolvimento.
- **Gerenciamento de Estado no Aplicativo (App State)**:
  - Variáveis de estado locais:
    - `isLogged` (Boolean): controla a exibição da tela de login vs. o aplicativo principal, persistido em `localStorage` (`eixo_auth_isLogged`).
    - `Role` ('Construtor' | 'Cliente'): define a credencial ativa do usuário logado, persistido em `localStorage` (`eixo_auth_role`).
  - Mapeamento transparente com o perfil ativo do sistema: `perfilAtivo = Role.toLowerCase() as PerfilUsuario`.
  - Links compartilhados com cliente (`?perfil=cliente`) e upload público de pranchas (`?upload=projeto`) contornam a autenticação inicial mantendo o acesso seguro e direto do cliente.
- **Simulação de Autenticação (Fake Login)**:
  - Validação de preenchimento dos campos no submit (rejeita e-mail ou senha em branco com aviso no padrão visual do sistema).
  - Ao aprovar, altera `isLogged` para `true`, define a `Role` selecionada, emite toast de boas-vindas e redireciona para a `Home`.
  - Botão de logout (`<SignOut />`) integrado ao cabeçalho (`Navbar`) para fácil alternância e testes de perfis.
- **Permissões Visuais e Renderização Condicional por Role**:
  - **`Role === 'Construtor'`**:
    - Acesso integral a menus de edição, criação de novas obras e gerenciamento de modelos de etapas (`ConfigTemplatesPage`).
    - Botão **Registro de Materiais** exibido na Página Inicial (`ObraList`) e no Diário de Obra (`DiarioObraTab`).
    - Modos de inserção e exclusão de etapas, serviços e arquivos habilitados.
  - **`Role === 'Cliente'`**:
    - O botão **Registro de Materiais** e menus de edição ficam estritamente ocultos.
    - Modo de leitura e acompanhamento no Cronograma, Arquivos e Diário de Obra.
    - Acesso exclusivo e interativo apenas na Central de Decisões e Aprovações.

---

## 20. Menu Sandwich Centralizador, Notificações, Registro de Materiais & Configuração de Perfil

- **Botão Sandwich no Header (`Navbar.tsx`)**:
  - Posicionado na barra de navegação com ícone Phosphor `<List size={22} weight="bold" />` e alvo de toque confortável (38x38px).
  - Dot indicador de notificações pendentes em `coral-glow` no canto superior direito do botão quando há decisões pendentes de assinatura.
- **Gaveta Deslizante (Slide-out Drawer) (`SandwichMenu.tsx`)**:
  - Painel lateral suspenso deslizando suavemente da direita com backdrop escurecido e desfocado (`backdrop-filter: blur(3px)`).
  - Fechamento imediato com clique no backdrop, botão `✕` ou tecla `Escape` (`aria-modal="true"`, `role="dialog"`).
  - Estrutura com abas superiores internas:
    - **Aba "Ações & Avisos"**:
      - **Notificações de Decisões**: Lista de decisões que requerem a assinatura do perfil ativo com badge de contagem, detalhes da proposta e clique para navegação direta à decisão na obra. Estado vazio limpo com `<CheckCircle />`.
      - **Registro de Materiais**: Card dedicado de acesso rápido para cadastro de compras, notas fiscais e fotos de canteiro vinculadas a uma obra.
      - **Atalhos Rápidos**: Botão "Todas as Obras (Home)" e acesso a "Modelos de Obra & Etapas Padrão" (para construtor).
    - **Aba "Configurar Perfil"**:
      - Seletor de perfil de acesso (`[ Construtor ]` / `[ Cliente ]`) com descrição contextual dos recursos de cada perfil.
      - Campos de dados cadastrais editáveis: Nome Completo / Exibição, E-mail de Contato e Empresa / Construtora.
      - Botão "Salvar Perfil" com feedback de sucesso em tempo real e persistência em `localStorage`.
- **Área de Sessão / Login no Rodapé do Sandwich Menu**:
  - Fixado no rodapé da gaveta com divisor sutil (`border-top: 1px solid var(--border-hairline)`).
  - Exibe avatar dinâmico com ícone temático (`<HardHat />` ou `<User />`), nome do usuário conectado, e-mail da sessão e badge de perfil ativo.
  - Ação de autenticação contextual:
    - Se logado: Botão executivo **"Sair da Conta (Logout)"** com `<SignOut />`.
    - Se não logado: Botão primário **"Fazer Login"** com `<SignIn />`.

---

## 21. Reformulação da Navegação Principal (Header & Menu Lateral Esquerdo)

- **Barra Superior (Header / App Bar) (`Navbar.tsx`)**:
  - **Canto Superior Esquerdo**: Ícone de Menu Hambúrguer (`<List size={22} weight="bold" />`), atuando como gatilho oficial para abrir a gaveta de navegação lateral.
  - **Canto Superior Direito**: Notificações de Decisões (`<Bell size={20} />` / `<BellRinging size={20} weight="fill" />`) com contador de pendências e dropdown de decisões, posicionado imediatamente ao lado do Ícone de Perfil de Usuário de contorno simples (`<User size={21} weight="regular" />`), atalho para **"Configurações do Cliente"** (`ModalConfiguracoesCliente.tsx`).
- **Menu Lateral Esquerdo (Side Drawer / Sidebar) (`SandwichMenu.tsx`)**:
  - **Comportamento**: Gaveta lateral com deslizamento fluido a partir da tela esquerda (`drawerSlideRight`).
  - **Corpo do Menu (Navegação em Camadas)**: Design limpo em lista vertical com textos alinhados à esquerda e divisórias sutis (*hairline*), contendo estritamente duas opções de navegação:
    1. **Obras**: Navegação e retorno para a lista de obras cadastradas.
    2. **Registro de materiais**: Atalho direto para abertura do modal de materiais (exibido para perfil Construtor).
  - **Rodapé do Menu (Footer)**: Botão de **Sair da Conta (Logout)** posicionado e fixado exclusivamente no rodapé do menu lateral esquerdo.

---

## 22. Refinamentos Recentes de Usabilidade e Layout (Mobile & Desktop)

### 22.1 Auto-Scroll ao Abrir Calendário no Modal (`DatePickerInput.tsx` & `ModalEditObra.tsx`)
- **Comportamento Mobile**: Ao clicar no ícone do calendário dentro do modal de edição no dispositivo móvel, a tela/modal-body executa rolagem suave automática (`scrollIntoView({ behavior: 'smooth', block: 'end' })`) trazendo o popover do calendário imediatamente para o campo de visão do usuário, sem necessidade de rolagem manual.
- **Espaçamento Dinâmico**: No mobile, a margem inferior do contêiner expande temporariamente para acomodar o popover sem cortes e volta ao padrão de 16px ao fechar.
- **Preservação Desktop**: O comportamento na versão web (> 768px) permanece 100% inalterado.

### 22.2 Botão "Relatório Final" (`ObraHeader.tsx` & `ModalRelatorioObra.tsx`)
- **Unificação Terminológica**: O botão de relatório no cabeçalho da obra foi padronizado oficialmente como **"Relatório Final"** (substituindo o antigo rótulo "Relatório de Evolução Física"), proporcionando maior clareza para construtores e clientes.
- **Modal e Dossiê**: O modal de emissão exibe o título **"Relatório Final"** e a ação **"Baixar Relatório Final"**, mantendo a estrutura interna de conclusão (com termo de aceite) ou evolução (com termo de responsabilidade).

### 22.3 Cabeçalho de Obra Otimizado no Mobile (`ObraHeader.tsx`)
- **Remoção de Banners Redundantes**: Removida a linha superior `"Obra Ativa • X etapas no cronograma"`, alinhando o título da obra diretamente no topo.
- **Ocultação de Endereço no Mobile**: O endereço é ocultado no cabeçalho principal no celular para poupar espaço vertical, permanecendo acessível no modal "Editar Dados da Obra".
- **Grid Lado a Lado (Data e Orçamento)**: Sem os rótulos de texto extensos, os ícones de calendário (data) e cifrão (orçamento) ficam organizados lado a lado em uma única linha flex logo abaixo do nome do cliente.
- **Isolamento Desktop**: A versão desktop mantém o layout completo intacto via classes responsivas isoladas (`.obra-meta-desktop` vs `.obra-meta-mobile`).

### 22.4 Cards de Obra na Página Inicial (`ObraList.tsx`)
- **Versão Mobile (`.obra-card-mobile`)**:
  - **Linha 1**: Nome do cliente (com ícone `<User />`) e data prevista (com ícone `<CalendarBlank />`) dispostos lado a lado (`justify-content: space-between`) logo abaixo das etapas, sem rótulos repetitivos.
  - **Linha 2**: Linha exclusiva para o endereço completo com ícone `<MapPin />` e botão de cópia rápida (`<Copy />`) alinhado à extrema direita com feedback visual temporário (`<Check /> Copiado`).
  - **Linhas 3 e 4**: Barra de progresso linear e linha inferior de ações (lixeira e seta) mantidas.
- **Versão Desktop (`.obra-card-desktop`)**:
  - **Coluna Principal Expandida**: Espaçamento flex expandido (`flex: 2.5`) para preencher a largura útil e eliminar vazios indesejados.
  - **Endereço em Linha Própria**: Endereço posicionado logo abaixo do nome do cliente, exibido por inteiro sem truncamento (`whiteSpace: 'nowrap'`).
  - **Botão "Copiar" Dedicado**: Botão em formato de pílula posicionado abaixo do endereço, permitindo cópia rápida para o clipboard com `e.stopPropagation()`.

### 22.5 Ativo Local para o Banner Hero (`public/hero-bg.jpg`)
- **Eliminação de 404 Externo**: Substituído o link externo quebrado do Unsplash por fotografia de canteiro de obras incorporada diretamente no repositório local (`public/hero-bg.jpg`).
- **Resiliência Offline**: Carregamento 100% local com latência zero e manipulador defensivo `onError` para ocultar o elemento caso qualquer erro ocorra, banindo ícones de imagem quebrada.

### 22.6 Menu Lateral Mobile (SandwichMenu) - Otimização de Viewport e Visibilidade
- **Exibição Irrestrita de Ações**: "Registro de materiais" disponibilizado de forma universal na gaveta de navegação sempre que disponível no aplicativo.
- **Correção de Viewport Dinâmico (`100dvh`)**: Substituição de `100vh` por `100dvh` com posicionamento ancorado (`top: 0; bottom: 0; left: 0; right: 0`), garantindo que o rodapé com a ação de "Sair da Conta" permaneça sempre visível acima da barra de navegação dos navegadores móveis (Safari iOS e Chrome Android).
- **Suporte a Safe Area**: Aplicação de `padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px))` no footer da gaveta para respeitar a barra inicial/gestos dos dispositivos iOS e Android.
- **Ergonomia e Toque**: Alturas mínimas de toque ampliadas (48px para itens e 46px para botões de autenticação) para garantir usabilidade ágil no smartphone.

### 22.7 Isolamento do Botão de Registro de Materiais (Exclusivo no Menu)
- **Remoção de Dentro da Obra**: O botão "Registrar Material" foi removido da barra superior do Diário de Obra (`DiarioObraTab.tsx`) e desacoplado dos detalhes da obra (`ObraDetail.tsx`).
- **Acesso Único e Centralizado**: A ação reside exclusivamente no menu lateral (`SandwichMenu.tsx`), preservando uma visualização mais limpa do canteiro físico e evitando redundância de botões dentro da obra.

### 22.8 Calendário em Modal Unificado (Web & Mobile via `createPortal`)
- **Abertura em Modal Centralizado**: Abertura do calendário customizado (`DatePickerInput.tsx`) migrada integralmente de popover/dropdown ancorado para **Modal dedicado** renderizado via `createPortal` diretamente em `document.body` com `z-index: 99999`.
- **Consistência Web & Mobile**: Experiência 100% idêntica e centralizada tanto no desktop quanto no smartphone, com backdrop fosco escurecido (`backdrop-filter: blur(5px)`), fechamento por clique fora ou tecla `Escape` e bloqueio de rolagem do fundo.
- **Eliminação de Cortes e Hacks de Scroll**: Extingue a necessidade de expansão de margens inferiores (`marginBottom: 330px`) ou auto-scrolls complexos dentro de modais pais (`ModalCreateObra`, `ModalEditObra`), garantindo exibição perfeita e desimpedida de qualquer limite de contêiner.
### 22.9 Painel Financeiro & Aditivos Contratuais (Accordion Exclusivo no Mobile)
- **Comportamento Mobile (`.painel-financeiro-mobile`)**:
  - Transformado em componente Accordion colapsável, **fechado por padrão** (`isPainelFinanceiroOpenMobile: false`).
  - **Estado Minimizado**: Exibe exclusivamente o ícone de cifrão (`<CurrencyDollar />`), o título em caixa alta ("PAINEL FINANCEIRO & ADITIVOS CONTRATUAIS"), o subtítulo descritivo ("Consolidação de orçamento base e alterações aprovadas") e o ícone de chevron à direita (`<CaretDown />`).
  - **Estado Expandido**: Ao clicar no cabeçalho interativo (`role="button"`, `tabIndex={0}`, `aria-expanded`), o chevron rotaciona 180° e o bloco revela com animação suave os cartões financeiros de valores (*Orçamento Base*, *Aditivos Aprovados*, *Supressivos Aprovados*, *Investimento Atualizado* e *Propostas em Análise*).
  - **Ergonomia Mobile**: Alvo de toque mínimo com altura de 44px e área de clique cobrindo toda a extensão do cabeçalho.
- **Preservação Desktop (`.painel-financeiro-desktop`)**:
  - A visualização na versão web (> 768px) permanece 100% inalterada, mantendo o painel financeiro aberto e com todos os cartões visíveis em grid contínuo.






