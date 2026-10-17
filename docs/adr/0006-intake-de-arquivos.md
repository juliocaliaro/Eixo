# 0006. Um módulo para entrada de arquivos

Status: aceita

## Contexto
A compressão de imagem (lado maior 1400, JPEG 0,82) estava copiada em três modais e ausente em três; `FileReader` aparecia em nove lugares; o upload com fallback para data URL se repetia. O fallback silencioso gravava base64 ou URLs `blob:` quando o upload falhava.

## Decisão
`utils/fileIntake.ts` (`normalizeFile`, `storeNormalized`, `storeFile`, `buildStoragePath`) e `useFileIntake`. PDFs passam intactos; imagens são reduzidas e recodificadas com fundo branco. Falha de upload lança `UploadError` e a tela mostra o erro. `storageApi.uploadBlob`/`uploadFile` lançam erro em vez de devolver `null`.

## Consequências
Sem Supabase configurado, uploads falham com mensagem clara. Os modais de mídia e decisão ainda devolvem data URL e dependem de `assets.ts` ao salvar (ver `docs/BACKLOG.md`).
