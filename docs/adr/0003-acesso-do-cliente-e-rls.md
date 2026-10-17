# 0003. Uma regra de acesso do cliente, imposta pela RLS

Status: aceita

## Contexto
"Este usuário vê esta obra?" existia em quatro cópias (consulta PostgREST, varredura do cache, filtro do App, normalização no mapeador) que já divergiam, e havia um fallback que devolvia a lista sem filtro. As policies tinham `auth.uid() IS NULL` em escrita e o cliente convidado por e-mail não lia diário, notas, locações nem assinaturas.

## Decisão
- `src/services/obraAccess.ts` é o único lugar com a regra no cliente (e-mail normalizado em minúsculas, `clienteId`, `emailsClientes`, `clienteEmail`) e nunca devolve a lista sem filtro para cliente.
- No banco, `private.can_access_obra` e `private.can_write_obra` (`SECURITY DEFINER`, `search_path=''`) são usadas em todas as policies, que são `TO authenticated` e usam `(select auth.uid())`. `caller_email()` só vale para e-mail confirmado.
- Integridade das decisões por trigger: a contraparte aprova/recusa, `pendente` só vai para `aprovada`/`recusada`, valores, prazo e texto são imutáveis.
- `profiles.role` e `email` não podem ser alterados pelo usuário; o papel da aplicação vem de `profiles.role`.
- O construtor vincula clientes pelo campo "E-mail do cliente" ao criar/editar a obra.

## Consequências
Qualquer tabela nova precisa de policies com os helpers. Filtro no cliente é conveniência, não segurança.
