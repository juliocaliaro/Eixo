import { PresetTipoObra } from '../types/obra';

export const PRESET_TIPOS_OBRA: PresetTipoObra[] = [
  {
    id: "O01",
    nome: "Construção",
    etapas: [
      {
        id: "E01_C",
        nome: "Projetos e Legalização",
        tarefas: [
          { id: "T01_C01", nome: "Levantamento topográfico planialtimétrico e sondagem do solo (SPT)" },
          { id: "T01_C02", nome: "Projetos executivos (arquitetônico, estrutural, hidrossanitário e elétrico)" },
          { id: "T01_C03", nome: "Aprovação na prefeitura, condomínio (se aplicável) e alvará de construção" },
          { id: "T01_C04", nome: "Registro de ARTs/RRTs de responsabilidade técnica e matrícula CNO na Receita Federal" },
          { id: "T01_C05", nome: "Montagem do padrão de entrada de energia e cavalete de água da concessionária" },
          { id: "T01_C06", nome: "Solicitação e ligação provisória de água e luz para início do canteiro" }
        ]
      },
      {
        id: "E02_C",
        nome: "Terreno e Canteiro",
        tarefas: [
          { id: "T02_C01", nome: "Limpeza do terreno, destocamento e bota-fora de entulhos e vegetação" },
          { id: "T02_C02", nome: "Terraplenagem, corte, aterro e compactação do platô da construção" },
          { id: "T02_C03", nome: "Montagem do tapume perimetral e portão de acesso com tranca" },
          { id: "T02_C04", nome: "Instalação do barracão de canteiro (almoxarifado trancado, sanitário e refeitório)" },
          { id: "T02_C05", nome: "Distribuição de pontos elétricos provisórios (quadro de obra) e torneiras de apoio" },
          { id: "T02_C06", nome: "Locação da obra e marcação do gabarito de madeira com eixos estruturais" }
        ]
      },
      {
        id: "E03_C",
        nome: "Fundação e Contenção",
        tarefas: [
          { id: "T03_C01", nome: "Execução de contenções de talude, cortes e muros de arrimo (se aplicável)" },
          { id: "T03_C02", nome: "Perfuração mecânica de estacas ou escavação de sapatas e blocos" },
          { id: "T03_C03", nome: "Concretagem de estacas/sapatas e posicionamento dos arranques de pilares" },
          { id: "T03_C04", nome: "Instalação prévia de passagens de esgoto sob as vigas baldrames" },
          { id: "T03_C05", nome: "Armação, fôrmas e concretagem das vigas baldrames" },
          { id: "T03_C06", nome: "Impermeabilização asfáltica das vigas baldrames e reaterro compactado" }
        ]
      },
      {
        id: "E04_C",
        nome: "Estrutura",
        tarefas: [
          { id: "T04_C01", nome: "Montagem das armaduras dos pilares com espaçadores plásticos para cobrimento" },
          { id: "T04_C02", nome: "Montagem de fôrmas, escoramento e concretagem vibrada dos pilares" },
          { id: "T04_C03", nome: "Montagem do escoramento e fôrmas das vigas e lajes" },
          { id: "T04_C04", nome: "Posicionamento de vigotas, lajotas/EPS, malhas de aço e caixas elétricas de teto" },
          { id: "T04_C05", nome: "Concretagem usinada de vigas, lajes e escadas estruturais" },
          { id: "T04_C06", nome: "Cura úmida diária do concreto e desforma técnica no prazo correto" }
        ]
      },
      {
        id: "E05_C",
        nome: "Alvenaria e Vedação",
        tarefas: [
          { id: "T05_C01", nome: "Marcação e assentamento da primeira fiada com argamassa impermeabilizante" },
          { id: "T05_C02", nome: "Elevação das paredes de alvenaria com controle rigoroso de prumo e alinhamento" },
          { id: "T05_C03", nome: "Instalação de vergas e contravergas de concreto sobre vãos de portas e janelas" },
          { id: "T05_C04", nome: "Amarração da alvenaria na estrutura de concreto e encunhamento sob as vigas" },
          { id: "T05_C05", nome: "Chumbamento de contramarcos de esquadrias e requadro de vãos" },
          { id: "T05_C06", nome: "Fechamento de platibandas de telhado, oitões e shafts de tubulações" }
        ]
      },
      {
        id: "E06_C",
        nome: "Cobertura e Telhado",
        tarefas: [
          { id: "T06_C01", nome: "Montagem da estrutura de apoio do telhado (madeiramento ou perfis metálicos)" },
          { id: "T06_C02", nome: "Içamento e assentamento das caixas d'água e reservatório do boiler no sótão" },
          { id: "T06_C03", nome: "Instalação de subcobertura com manta térmica de isolamento" },
          { id: "T06_C04", nome: "Assentamento e fixação de telhas, cumeeiras e arremates" },
          { id: "T06_C05", nome: "Instalação de calhas metálicas com teste de caimento e rufos contra platibandas" },
          { id: "T06_C06", nome: "Instalação e descida dos condutores de águas pluviais até o solo" }
        ]
      },
      {
        id: "E07_C",
        nome: "Infraestrutura e Instalações Brutas",
        tarefas: [
          { id: "T07_C01", nome: "Abertura de cortes e rasgos nas paredes com máquina riscadora de alvenaria" },
          { id: "T07_C02", nome: "Chumbamento de caixas de tomada (4x2/4x4), eletrodutos e quadros (QDG e VDI)" },
          { id: "T07_C03", nome: "Passagem de tubulações de água fria e água quente (PPR, CPVC ou PEX)" },
          { id: "T07_C04", nome: "Instalação de ramais de esgoto, caixas sifonadas e colunas de ventilação" },
          { id: "T07_C05", nome: "Teste hidrostático de pressão das tubulações de água (estanqueidade)" },
          { id: "T07_C06", nome: "Linhas frigorígenas de ar-condicionado e fechamento de rasgos com argamassa antifissura" }
        ]
      },
      {
        id: "E08_C",
        nome: "Revestimentos Brutos",
        tarefas: [
          { id: "T08_C01", nome: "Aplicação de chapisco com aditivo de aderência em alvenarias e concreto" },
          { id: "T08_C02", nome: "Mesteamento, emboço e reboco desempenado nas paredes internas" },
          { id: "T08_C03", nome: "Execução de reboco nas paredes externas e fachadas com aditivo impermeabilizante" },
          { id: "T08_C04", nome: "Execução e regularização de contrapiso com caimentos adequados para ralos" },
          { id: "T08_C05", nome: "Impermeabilização de banheiros, lavanderias, varandas e lajes expostas" },
          { id: "T08_C06", nome: "Teste de estanqueidade por lâmina d'água durante 72 horas com laudo" }
        ]
      },
      {
        id: "E09_C",
        nome: "Revestimentos e Gesso",
        tarefas: [
          { id: "T09_C01", nome: "Estruturação e fechamento do forro de gesso acartonado (drywall)" },
          { id: "T09_C02", nome: "Execução de cortineiros, sancas e juntas de dilatação tabicadas" },
          { id: "T09_C03", nome: "Tratamento de juntas e parafusos do gesso com fita e massa para drywall" },
          { id: "T09_C04", nome: "Assentamento de porcelanatos e pisos com argamassa AC e niveladores" },
          { id: "T09_C05", nome: "Assentamento de azulejos e revestimentos de parede em áreas molhadas" },
          { id: "T09_C06", nome: "Rejuntamento geral e instalação de bancadas de pedra, soleiras e nichos" }
        ]
      },
      {
        id: "E10_C",
        nome: "Acabamentos e Pintura",
        tarefas: [
          { id: "T10_C01", nome: "Proteção de pisos e bancadas instalados com papelão ondulado ou salva-piso" },
          { id: "T10_C02", nome: "Emassamento de paredes e forros com massa corrida e massa acrílica" },
          { id: "T10_C03", nome: "Lixamento com luz rasante e aplicação de fundo preparador" },
          { id: "T10_C04", nome: "Pintura de acabamento de tetos e paredes (selador e demãos finais de tinta)" },
          { id: "T10_C05", nome: "Instalação de pisos vinílicos, laminados ou madeira nas áreas secas" },
          { id: "T10_C06", nome: "Montagem de portas internas com fechaduras, rodapés e esquadrias de alumínio" }
        ]
      },
      {
        id: "E11_C",
        nome: "Área Externa e Paisagismo",
        tarefas: [
          { id: "T11_C01", nome: "Estrutura, impermeabilização e revestimento da piscina e casa de máquinas" },
          { id: "T11_C02", nome: "Pavimentação externa de garagens, rampas de acesso e calçadas perimetrais" },
          { id: "T11_C03", nome: "Muros divisórios com pingadeiras, reboco/textura externa e portões" },
          { id: "T11_C04", nome: "Instalação de rede de drenagem pluvial do quintal, grelhas e caixas de inspeção" },
          { id: "T11_C05", nome: "Preparação da terra vegetal, adubação e plantio de grama e paisagismo" },
          { id: "T11_C06", nome: "Instalação de iluminação externa de jardim, postes e balizadores" }
        ]
      },
      {
        id: "E12_C",
        nome: "Finalização e Entrega",
        tarefas: [
          { id: "T12_C01", nome: "Montagem do quadro de disjuntores, tomadas, interruptores e luminárias" },
          { id: "T12_C02", nome: "Instalação de louças sanitárias, torneiras, registros, cubas e sifões" },
          { id: "T12_C03", nome: "Instalação das condensadoras de ar-condicionado e testes de funcionamento" },
          { id: "T12_C04", nome: "Instalação de módulos fotovoltaicos, inversores e teste do aquecimento solar" },
          { id: "T12_C05", nome: "Limpeza pesada pós-obra e limpeza fina de entrega com remoção de películas" },
          { id: "T12_C06", nome: "Checklist de vistoria técnica (punch list), Habite-se e entrega formal das chaves" }
        ]
      }
    ]
  },
  {
    id: "O02",
    nome: "Reforma",
    etapas: [
      {
        id: "E01_R",
        nome: "Isolamento e Preparação",
        tarefas: [
          { id: "T01_R01", nome: "Proteção de elevadores e áreas comuns." },
          { id: "T01_R02", nome: "Proteção do piso existente (se for mantido)." },
          { id: "T01_R03", nome: "Isolamento de móveis e portas que permanecerão no local." },
          { id: "T01_R04", nome: "Desmontagem cuidadosa de móveis, metais e louças a serem preservados." },
          { id: "T01_R05", nome: "Organização e armazenamento seguro dos itens para reaproveitamento." }
        ]
      },
      {
        id: "E02_R",
        nome: "Demolição",
        tarefas: [
          { id: "T02_R01", nome: "Demolição de alvenarias, pisos e revestimentos." },
          { id: "T02_R02", nome: "Remoção de forros de gesso e paredes de drywall." },
          { id: "T02_R03", nome: "Retirada de louças e metais antigos para descarte." },
          { id: "T02_R04", nome: "Ensacamento e descarte de entulho." }
        ]
      },
      {
        id: "E03_R",
        nome: "Infraestrutura e Construção",
        tarefas: [
          { id: "T03_R01", nome: "Elevação de novas paredes." },
          { id: "T03_R02", nome: "Adequação de pontos de elétrica e iluminação." },
          { id: "T03_R03", nome: "Adequação de pontos de água e esgoto." },
          { id: "T03_R04", nome: "Fechamento e regularização de rasgos nas paredes." }
        ]
      },
      {
        id: "E04_R",
        nome: "Revestimentos e Gesso",
        tarefas: [
          { id: "T04_R01", nome: "Montagem e fechamento de forros de gesso." },
          { id: "T04_R02", nome: "Impermeabilização de áreas molhadas (boxes de banheiro e áreas externas)." },
          { id: "T04_R03", nome: "Assentamento de novos pisos e revestimentos de parede." },
          { id: "T04_R04", nome: "Instalação de bancadas e nichos." }
        ]
      },
      {
        id: "E05_R",
        nome: "Acabamentos e Pintura",
        tarefas: [
          { id: "T05_R01", nome: "Preparação, emassamento e lixamento de paredes." },
          { id: "T05_R02", nome: "Aplicação da pintura." },
          { id: "T05_R03", nome: "Instalação de pisos quentes (laminado/vinílico) e rodapés." },
          { id: "T05_R04", nome: "Instalação ou pintura de portas." }
        ]
      },
      {
        id: "E06_R",
        nome: "Finalização",
        tarefas: [
          { id: "T06_R01", nome: "Instalação de louças, metais e espelhos." },
          { id: "T06_R02", nome: "Instalação de luminárias e espelhos de tomada." },
          { id: "T06_R03", nome: "Limpeza fina." }
        ]
      }
    ]
  }
];
