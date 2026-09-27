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
- Modo de acompanhamento transparente (cronograma físico em **Read-Only**).
- **Restrição de Criação/Exclusão**: O cliente **não visualiza** botões de criar nova obra nem ícones de lixeira para excluir projetos ou etapas.
- **Read-Only no Cronograma**: Checkboxes de serviços e botões de edição ficam desabilitados, impedindo alterações não autorizadas no planejamento técnico.
- **Acesso Completo às Evidências**: Visualização irrestrita de fotos, anotações do diário e datas de conclusão de cada serviço.
- **Participação Plena em Decisões**: O cliente pode propor alterações, aprovar/assinar decisões e recusar propostas.

### 3.3 Compartilhamento e Sincronização
- Parâmetros de URL sincronizados automaticamente (`?perfil=cliente&obra=ID_DA_OBRA`).
- Aba dedicada no corpo da obra (**Link do Cliente**) com botão de cópia rápida e resumo claro de permissões.

---

## 4. Central de Decisões & Aprovações (Assinatura Digital)

- **Mecânica de Aceite Bilateral**:
  - Tanto o Construtor quanto o Cliente podem registrar decisões técnicas ou de acabamento (escolha de pisos, pontos de tomada, aditivos de contrato).
  - O proponente assina a decisão automaticamente no ato da criação.
  - A decisão fica em estado `pendente` (com selo e ícone `<Clock />`) até a contraparte analisar.
  - A contraparte possui ações imediatas de **Concordar e Assinar** ou **Recusar / Pedir Ajuste**.
  - Uma vez assinada pela contraparte, a decisão torna-se `aprovada` e exibe carimbo digital auditável com nome, perfil e data/hora exatos de ambas as assinaturas.
- **Timeline Vertical**: Exibição cronológica das decisões com linha espinhal conectando os eventos.
- **Modal de Criação Minimalista**: Apenas título, descrição, linha compacta de categoria/custo/prazo e upload opcional de fotos de amostra, sem textos redundantes.
- **Central de Notificações**: Sininho com contador em tempo real no topo informando decisões pendentes da assinatura do perfil logado, com dropdown para navegação direta.

---

## 5. Navegação & Desacoplamento Estrutural

1. **Header Geral Limpo**:
   - O header contém estritamente o logotipo, o seletor de perfil pill (`[ Construtor ]` / `[ Cliente ]`) e o sininho de notificações.
   - O botão "Nova Obra" foi removido do header e vive apenas na listagem de obras do construtor.
2. **Seta de Voltar no Corpo**:
   - O botão `[ ← Todas as Obras ]` fica dentro do corpo de `ObraDetail`, totalmente desacoplado da barra superior.
3. **Link do Cliente como Aba**:
   - O compartilhamento com o cliente foi integrado como a 4ª aba da obra (`Etapas & Cronograma`, `Decisões & Aprovações`, `Anexos & Diário`, `Link do Cliente`).
4. **Navegação Cruzada (Anexos $\rightarrow$ Cronograma)**:
   - Clicar nos detalhes de uma anotação ou serviço na aba de Anexos navega instantaneamente para a aba de etapas.
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
  - Nova aba integrada na visualização da obra (`ObraDetail`), posicionada estrategicamente entre Decisões e Anexos.
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

### 10.1 Construção (13 Etapas Técnicas)
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
12. **Finalização**: Placas solares/inversor, aquecimento solar de boiler, louças/metais/espelhos, luminárias e tomadas, ar-condicionado, limpeza fina.
13. **Testes, Desmobilização e Entrega**: Testes elétricos/solar, testes de vazão/pressão hidráulica, testes de ar-condicionado, vistoria geral de acabamentos, desmobilização de canteiro, Habite-se e entrega de chaves.

### 10.2 Reforma (7 Etapas Técnicas)
1. **Isolamento e Preparação**: Proteção de elevadores e áreas comuns, proteção de pisos existentes, isolamento de móveis, desmontagem e armazenamento de itens reutilizáveis.
2. **Demolição**: Demolição de alvenarias e revestimentos, remoção de forros/drywall, descarte de louças antigas, ensacamento de entulho.
3. **Infraestrutura e Construção**: Novas paredes, adequação de pontos elétricos/iluminação, pontos hidráulicos/esgoto, fechamento de rasgos.
4. **Revestimentos e Gesso**: Forros de gesso, impermeabilização de áreas molhadas, assentamento de novos revestimentos, bancadas e nichos.
5. **Acabamentos e Pintura**: Preparação, emassamento e lixamento, pintura, pisos quentes e rodapés, portas.
6. **Finalização**: Louças, metais e espelhos, luminárias e espelhos de tomada, limpeza fina.
7. **Testes**: Teste de elétrica/iluminação, teste de pressão/vazão de água, teste de equipamentos (ar-condicionado, aquecedores), vistoria geral de portas, esquadrias e acabamentos.


