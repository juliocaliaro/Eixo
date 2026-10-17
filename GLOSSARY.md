# Glossário do Eixo

Linguagem do domínio. Use estes termos no código, nos testes e nas conversas.

- **Obra**: projeto de construção ou reforma acompanhado no Eixo. Contém etapas, decisões, arquivos, notas e locações.
- **Etapa**: fase técnica da obra (ex.: Fundação, Alvenaria). Tem tarefas e data/hora de conclusão (`concluidaEm`).
- **Tarefa (serviço)**: item de trabalho dentro de uma etapa; pode ter ambiente, fotos (evidências) e anotações.
- **Ambiente / agrupamento**: rótulo que agrupa tarefas de uma etapa (ex.: Suíte, Varanda).
- **Evidência**: foto ou anotação de canteiro ligada a uma tarefa.
- **Construtor**: perfil que gerencia a obra (cria, edita, exclui, registra). Vem de `profiles.role`.
- **Cliente**: perfil de acompanhamento em leitura; só interage em Decisões. Acessa as obras cujo e-mail está em `emailsClientes`/`clienteEmail`.
- **Lista de acesso**: e-mails que podem ver uma obra, mantidos na aba Compartilhar (`emailsClientes`; `clienteEmail` é o primeiro da lista). Entrou na lista, tem acesso ao entrar com esse e-mail confirmado.
- **Decisão**: registro bilateral de alteração técnica, de acabamento ou contratual. O proponente assina ao criar; a contraparte concorda e assina ou recusa. Estados: `pendente`, `aprovada`, `recusada`.
- **Aditivo**: acréscimo de valor contratual (+R$). **Supressivo**: redução (-R$). Uma decisão tem um ou outro, nunca os dois.
- **Impacto de prazo**: dias a mais ou a menos (`impactoPrazoDias`), aplicados a `dataPrevista` quando a decisão é registrada e desfeitos se for recusada.
- **Investimento atualizado**: orçamento inicial + aditivos aprovados - supressivos aprovados.
- **Diário de obra (extrato)**: linha do tempo por dia com tudo que aconteceu na obra.
- **Vistoria final (punch list)**: lista livre de pendências por ambiente antes da entrega.
- **Registro de notas**: notas fiscais e comprovantes por obra, incluídos no Relatório Final.
- **Registro de locação**: equipamentos locados, com fornecedor, período e vencimento; pode ser prolongada (renovada) ou devolvida.
- **Relatório Final**: dossiê de conclusão (100%) ou de evolução/medição (<100%).
- **ObraStore**: módulo que carrega e salva obras por diff contra o último estado salvo (ADR 0002).
- **ObraRepository**: seam do ObraStore, com adapters Supabase e em memória.
- **Overlay**: modal, lightbox, popover ou drawer; o Escape fecha só o do topo.
