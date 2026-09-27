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
          { id: "T01_C01", nome: "Execução de levantamento topográfico e sondagem do solo." },
          { id: "T01_C02", nome: "Elaboração dos projetos (arquitetônico e complementares)." },
          { id: "T01_C03", nome: "Aprovação na prefeitura e emissão de alvará de construção." },
          { id: "T01_C04", nome: "Solicitação de ligações provisórias (água e energia)." }
        ]
      },
      {
        id: "E02_C",
        nome: "Terreno e Canteiro",
        tarefas: [
          { id: "T02_C01", nome: "Limpeza e nivelamento do terreno." },
          { id: "T02_C02", nome: "Montagem do tapume e portões de acesso." },
          { id: "T02_C03", nome: "Montagem do canteiro de obras (banheiro, almoxarifado e refeitório)." },
          { id: "T02_C04", nome: "Locação da obra (marcação do gabarito)." }
        ]
      },
      {
        id: "E03_C",
        nome: "Fundação e Contenção",
        tarefas: [
          { id: "T03_C01", nome: "Execução de cortes, aterros e muros de arrimo (contenção)." },
          { id: "T03_C02", nome: "Escavação das fundações." },
          { id: "T03_C03", nome: "Concretagem de sapatas/estacas e vigas baldrame." },
          { id: "T03_C04", nome: "Impermeabilização das fundações (baldrames)." }
        ]
      },
      {
        id: "E04_C",
        nome: "Estrutura",
        tarefas: [
          { id: "T04_C01", nome: "Montagem de fôrmas e ferragens para pilares e vigas." },
          { id: "T04_C02", nome: "Concretagem de pilares, vigas e lajes." },
          { id: "T04_C03", nome: "Desforma e cura do concreto." }
        ]
      },
      {
        id: "E05_C",
        nome: "Alvenaria e Vedação",
        tarefas: [
          { id: "T05_C01", nome: "Elevação de paredes." },
          { id: "T05_C02", nome: "Execução de vergas e contravergas (vãos de portas e janelas)." },
          { id: "T05_C03", nome: "Chumbamento de contramarcos." }
        ]
      },
      {
        id: "E06_C",
        nome: "Cobertura e Aquecimento",
        tarefas: [
          { id: "T06_C01", nome: "Montagem da estrutura do telhado." },
          { id: "T06_C02", nome: "Instalação do reservatório térmico (boiler) e caixas d'água." },
          { id: "T06_C03", nome: "Instalação das telhas e subcobertura (manta térmica)." },
          { id: "T06_C04", nome: "Instalação de calhas, rufos e condutores pluviais." }
        ]
      },
      {
        id: "E07_C",
        nome: "Infraestrutura e Instalações Brutas",
        tarefas: [
          { id: "T07_C01", nome: "Abertura de rasgos nas paredes." },
          { id: "T07_C02", nome: "Passagem de eletrodutos, quadros e infraestrutura para energia fotovoltaica." },
          { id: "T07_C03", nome: "Passagem de infraestrutura de rede (internet), automação e segurança (CFTV)." },
          { id: "T07_C04", nome: "Passagem de tubulação de água (fria/quente) e esgoto." },
          { id: "T07_C05", nome: "Passagem de infraestrutura de ar-condicionado." },
          { id: "T07_C06", nome: "Fechamento e regularização de rasgos nas paredes." }
        ]
      },
      {
        id: "E08_C",
        nome: "Revestimentos Brutos",
        tarefas: [
          { id: "T08_C01", nome: "Aplicação de chapisco, emboço e reboco." },
          { id: "T08_C02", nome: "Execução de contrapiso." },
          { id: "T08_C03", nome: "Impermeabilização de áreas molhadas e varandas." }
        ]
      },
      {
        id: "E09_C",
        nome: "Revestimentos e Gesso",
        tarefas: [
          { id: "T09_C01", nome: "Montagem e fechamento de forros de gesso." },
          { id: "T09_C02", nome: "Assentamento de pisos e revestimentos de parede." },
          { id: "T09_C03", nome: "Instalação de bancadas, soleiras e nichos." }
        ]
      },
      {
        id: "E10_C",
        nome: "Acabamentos e Pintura",
        tarefas: [
          { id: "T10_C01", nome: "Preparação, emassamento e lixamento de paredes." },
          { id: "T10_C02", nome: "Aplicação da pintura." },
          { id: "T10_C03", nome: "Instalação de pisos quentes (laminado/vinílico) e rodapés." },
          { id: "T10_C04", nome: "Instalação de portas e esquadrias finais (vidro/alumínio)." }
        ]
      },
      {
        id: "E11_C",
        nome: "Área Externa e Paisagismo",
        tarefas: [
          { id: "T11_C01", nome: "Escavação, impermeabilização e revestimento de piscina." },
          { id: "T11_C02", nome: "Pavimentação de calçadas, acessos e garagens." },
          { id: "T11_C03", nome: "Instalação de portões e grades." },
          { id: "T11_C04", nome: "Preparo do solo e plantio de paisagismo." }
        ]
      },
      {
        id: "E12_C",
        nome: "Finalização",
        tarefas: [
          { id: "T12_C01", nome: "Instalação de módulos fotovoltaicos (placas solares) e inversor." },
          { id: "T12_C02", nome: "Instalação de placas de aquecimento solar para o boiler." },
          { id: "T12_C03", nome: "Instalação de louças, metais e espelhos." },
          { id: "T12_C04", nome: "Instalação de luminárias, tomadas, interruptores e equipamentos de rede/automação." },
          { id: "T12_C05", nome: "Instalação das máquinas de ar-condicionado." },
          { id: "T12_C06", nome: "Limpeza fina." }
        ]
      },
      {
        id: "E13_C",
        nome: "Testes, Desmobilização e Entrega",
        tarefas: [
          { id: "T13_C01", nome: "Teste de funcionamento da rede elétrica, automação e geração solar." },
          { id: "T13_C02", nome: "Teste de vazão, escoamento e pressão de água." },
          { id: "T13_C03", nome: "Teste de funcionamento de ar-condicionado e equipamentos." },
          { id: "T13_C04", nome: "Vistoria geral de acabamentos." },
          { id: "T13_C05", nome: "Desmontagem do canteiro de obras e retirada do tapume." },
          { id: "T13_C06", nome: "Emissão do Habite-se e entrega das chaves." }
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
      },
      {
        id: "E07_R",
        nome: "Testes",
        tarefas: [
          { id: "T07_R01", nome: "Teste de funcionamento de elétrica e iluminação." },
          { id: "T07_R02", nome: "Teste de vazão, escoamento e pressão de água (hidráulica)." },
          { id: "T07_R03", nome: "Teste de funcionamento de equipamentos (ar-condicionado, aquecedores)." },
          { id: "T07_R04", nome: "Vistoria geral de portas, esquadrias e acabamentos." }
        ]
      }
    ]
  }
];
