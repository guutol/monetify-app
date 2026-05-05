# TODO pós-MVP

Itens identificados na revisão técnica. Nenhum bloqueia o MVP.

## Geração de imagem

- [ ] **PROCESSING travado por timeout** — Se a função Next.js atingir o timeout durante a geração (OpenAI pode levar 30–40s; Vercel Hobby tem limite menor), o catch não executa e o pedido fica preso em PROCESSING indefinidamente. Solução: cron ou endpoint admin que reseta para FAILED pedidos com `generationStatus = 'PROCESSING'` e `updatedAt` há mais de N minutos.

- [ ] **Revisar billing OpenAI antes de produção** — Testar com `USE_MOCK_IMAGE=false` requer conta OpenAI com crédito ativo. Validar limite de gasto, modelo `gpt-image-1` e custo por geração antes do primeiro deploy real.

## Dashboard

- [ ] **Thumbnails do dashboard para imagens S3 reais** — `dashboard/page.tsx` usa `imageUrl` que fica vazio (`""`) no fluxo real. O fallback é exibido (sem erro), mas sem thumbnail. Solução: gerar presigned URL no SSR ou buscar via `/api/images/[imageId]/url` client-side.

## Histórico

- [ ] **Download on-demand em /history** — Presigned URLs geradas no SSR expiram em 1 hora. Se o usuário deixar a aba aberta e tentar baixar depois, o link falha. Solução: trocar o `<a href={displayUrl}>` por um botão que chama `/api/images/[imageId]/url` no clique e faz download programático.

## Deploy / Segurança

- [ ] **Rotacionar todas as chaves antes do deploy real** — As chaves atuais no `.env.local` (OpenAI, AWS, AbacatePay, Auth) são de desenvolvimento. Gerar chaves novas para produção e configurar no ambiente de destino (Vercel, etc.) sem reutilizar as de dev.

- [ ] **Configurar `ABACATEPAY_WEBHOOK_SIGNATURE_KEY`** — Confirmar no dashboard AbacatePay qual valor usar (chave por-conta ou chave global da documentação). Obrigatório em produção — webhook rejeita requisições sem HMAC válido.
