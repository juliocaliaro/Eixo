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
- **Modal de Criação Minimalista**: Apenas título, descrição, campos financeiros dedicados de **Aditivo (R$)** (+ Acréscimo) e **Supressivo (R$)** (- Redução Contratual) — com suporte a preenchimento conjunto na mesma decisão para compensação direta (ex: troca de material com crédito e acréscimo simultâneos) — e upload opcional de fotos de amostra, sem textos redundantes nem campo de categoria.
- **Remoção de Categorias**: O seletor de categorias foi removido da criação para desburocratizar o registro de decisões pelo usuário.
- **Central de Notificações**: Sininho com contador em tempo real no topo informando decisões pendentes da assinatura do perfil logado, com dropdown para navegação direta.

---

## 5. Navegação & Desacoplamento Estrutural

1. **Header Geral Limpo**:
   - O header contém estritamente o logotipo, o seletor de perfil pill (`[ Construtor ]` / `[ Cliente ]`) e o sininho de notificações.
   - O botão "Nova Obra" foi removido do header e vive apenas na listagem de obras do construtor.
2. **Seta de Voltar no Corpo**:
   - O botão `[ ← Todas as Obras ]` fica dentro do corpo de `ObraDetail`, totalmente desacoplado da barra superior.
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

## 9. Central de Projetos Técnicos em PDF (`ProjetosTab` & `ModalUploadProjeto`)

- **Aba "Projetos (PDF)" na Obra**:
  - Aba integrada na visualização da obra (`ObraDetail`), posicionada como 2ª aba, logo após Etapas & Cronograma e antes de Decisões & Aprovações.
  - Exibe contador dinâmico de pranchas/projetos anexados.
- **Upload com Classificação Técnica Obrigatória**:
  - O modal `ModalUploadProjeto` exige a definição da disciplina do projeto (Elétrico, Hidráulico, Demolição, Arquitetônico, Estrutural, Climatização, Marcenaria ou Outro com digitação livre).
  - Ícones e cores temáticas exclusivas para cada disciplina (`src/utils/projetoConfig.ts`).
  - Suporte a drag & drop de arquivos PDF, extração automática de título sugerido a partir do nome do arquivo, versão/revisão (ex: *Rev. 02*) e observações técnicas.
- **Visualização e Download Integrados**:
  - Ações rápidas de **Visualizar** (modal com visualizador embutido ou abertura em nova guia) e **Baixar** direto no dispositivo.
  - Filtros rápidos por chips de categoria e busca textual em tempo real.

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
    - **Registro Conjunto**: capacidade de lançar na mesma decisão tanto o Aditivo quanto o Supressivo (ex: permuta onde se deduz o revestimento original e se acrescenta o novo padrão), calculando automaticamente o saldo líquido da decisão e somando corretamente cada componente nos painéis gerais.
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
  - **Cliente**: Modo 100% Read-Only de acompanhamento transparente (sem botões de inserção ou exclusão, permitindo inspecionar evidências, fotos em tela cheia e extrato completo).

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

- **Acesso pelo Menu / Página Inicial**:
  - Botão dedicado `[ Registro de Materiais ]` com ícone `<Package />` disponível na Página Inicial (`ObraList`) para o perfil Construtor, tanto na listagem de obras quanto no cabeçalho.
  - Acesso contextual complementar disponibilizado diretamente na aba de Diário (`DiarioObraTab`) com a obra já pré-selecionada.
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


