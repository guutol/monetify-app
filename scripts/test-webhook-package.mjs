/**
 * Test script: Etapa 3 — webhook crediting for PACKAGE orders
 *
 * Usage: node scripts/test-webhook-package.mjs
 * Requires: dev server running on localhost:3000
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const USER_ID = "cmoqadr6x0000lw4g6iom3r7f";
const WEBHOOK_URL = `${BASE_URL}/api/payments/webhook?secret=dev-secret-teste`;

// ── helpers ────────────────────────────────────────────────────────────────────

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function ok(msg) { console.log(`  ✓  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); process.exitCode = 1; }

function assert(condition, msg) {
  if (condition) ok(msg);
  else fail(msg);
}

async function sendWebhook(webhookId, externalId) {
  const payload = {
    id: webhookId,
    event: "checkout.completed",
    apiVersion: 2,
    devMode: true,
    data: { checkout: { id: externalId } },
  };
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ── setup: capture initial credits ────────────────────────────────────────────

section("Setup");

const userBefore = await prisma.user.findUniqueOrThrow({
  where: { id: USER_ID },
  select: { credits: true, email: true },
});
console.log(`  User: ${userBefore.email}`);
console.log(`  Credits antes: ${userBefore.credits}`);

// ── TEST 1: PACKAGE Order — checkout.completed ─────────────────────────────

section("Teste 1: PACKAGE checkout.completed → creditar +3");

const pkgExternalId = `test-pkg-ext-${randomUUID()}`;
const webhookId1 = `test-wh-pkg-${randomUUID()}`;

// Create PACKAGE Order
const pkgOrder = await prisma.order.create({
  data: {
    userId: USER_ID,
    amount: 2490,
    paymentMethod: "PIX",
    paymentStatus: "PENDING",
    generationStatus: "PENDING",
    orderType: "PACKAGE",
    planId: "starter",
    externalId: pkgExternalId,
  },
});
console.log(`  Order PACKAGE criada: ${pkgOrder.id}`);
console.log(`  externalId: ${pkgExternalId}`);

const res1 = await sendWebhook(webhookId1, pkgExternalId);
console.log(`  Webhook status: ${res1.status} | body: ${JSON.stringify(res1.body)}`);
assert(res1.status === 200, `HTTP 200 recebido`);
assert(res1.body.received === true, `body.received = true`);

// Verify DB
const pkgOrderAfter = await prisma.order.findUniqueOrThrow({
  where: { id: pkgOrder.id },
  select: { paymentStatus: true },
});
assert(pkgOrderAfter.paymentStatus === "PAID", `Order.paymentStatus = PAID`);

const userAfter1 = await prisma.user.findUniqueOrThrow({
  where: { id: USER_ID },
  select: { credits: true },
});
const creditsDelta = userAfter1.credits - userBefore.credits;
assert(creditsDelta === 3, `User.credits aumentou +3 (era ${userBefore.credits}, agora ${userAfter1.credits})`);

const creditTx = await prisma.creditTransaction.findFirst({
  where: { orderId: pkgOrder.id, type: "PURCHASED" },
  select: { id: true, amount: true, type: true },
});
assert(creditTx !== null, `CreditTransaction PURCHASED existe`);
assert(creditTx?.amount === 3, `CreditTransaction.amount = 3`);

const webhookEvent1 = await prisma.webhookEvent.findUnique({ where: { id: webhookId1 } });
assert(webhookEvent1?.status === "SUCCESS", `WebhookEvent status = SUCCESS`);

// ── TEST 2: Idempotência ───────────────────────────────────────────────────

section("Teste 2: Idempotência — mesmo externalId, novo webhookId");

const webhookId2 = `test-wh-idem-${randomUUID()}`;
const res2 = await sendWebhook(webhookId2, pkgExternalId);
console.log(`  Webhook status: ${res2.status} | body: ${JSON.stringify(res2.body)}`);
assert(res2.status === 200, `HTTP 200 recebido`);

const userAfterIdem = await prisma.user.findUniqueOrThrow({
  where: { id: USER_ID },
  select: { credits: true },
});
assert(userAfterIdem.credits === userAfter1.credits, `Credits não duplicou (continua ${userAfterIdem.credits})`);

const txCount = await prisma.creditTransaction.count({
  where: { orderId: pkgOrder.id, type: "PURCHASED" },
});
assert(txCount === 1, `Apenas 1 CreditTransaction PURCHASED (count=${txCount})`);

// ── TEST 3: Idempotência nível WebhookEvent (mesmo webhookId) ─────────────

section("Teste 3: Idempotência nível webhook — mesmo webhookId reenviado");

const res3 = await sendWebhook(webhookId1, pkgExternalId);
console.log(`  Webhook status: ${res3.status} | body: ${JSON.stringify(res3.body)}`);
assert(res3.status === 200, `HTTP 200 recebido`);
assert(res3.body.duplicate === true, `body.duplicate = true (ignorado por WebhookEvent)`);

const userAfterDup = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(userAfterDup.credits === userAfter1.credits, `Credits não duplicou após mesmo webhookId`);

// ── TEST 4: GENERATION Order — credits não mudam ──────────────────────────

section("Teste 4: GENERATION checkout.completed → credits inalterados");

const genExternalId = `test-gen-ext-${randomUUID()}`;
const webhookId4 = `test-wh-gen-${randomUUID()}`;

const genOrder = await prisma.order.create({
  data: {
    userId: USER_ID,
    amount: 990,
    paymentMethod: "PIX",
    paymentStatus: "PENDING",
    generationStatus: "PENDING",
    orderType: "GENERATION",
    externalId: genExternalId,
  },
});
console.log(`  Order GENERATION criada: ${genOrder.id}`);

const creditsBefore4 = userAfterDup.credits;
const res4 = await sendWebhook(webhookId4, genExternalId);
console.log(`  Webhook status: ${res4.status} | body: ${JSON.stringify(res4.body)}`);
assert(res4.status === 200, `HTTP 200 recebido`);

const genOrderAfter = await prisma.order.findUniqueOrThrow({
  where: { id: genOrder.id },
  select: { paymentStatus: true },
});
assert(genOrderAfter.paymentStatus === "PAID", `Order GENERATION.paymentStatus = PAID`);

const userAfter4 = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(userAfter4.credits === creditsBefore4, `Credits não mudou (continua ${userAfter4.credits})`);

const genTxCount = await prisma.creditTransaction.count({ where: { orderId: genOrder.id } });
assert(genTxCount === 0, `Nenhuma CreditTransaction para Order GENERATION (count=${genTxCount})`);

// ── Cleanup ────────────────────────────────────────────────────────────────

section("Cleanup");

await prisma.creditTransaction.deleteMany({ where: { orderId: pkgOrder.id } });
await prisma.webhookEvent.deleteMany({ where: { id: { in: [webhookId1, webhookId2, webhookId4] } } });
await prisma.order.delete({ where: { id: pkgOrder.id } });
await prisma.order.delete({ where: { id: genOrder.id } });

// Restore original credits
await prisma.user.update({
  where: { id: USER_ID },
  data: { credits: userBefore.credits },
});

console.log(`  Orders de teste removidas`);
console.log(`  User.credits restaurado para ${userBefore.credits}`);

section("Resultado final");
if (process.exitCode === 1) {
  console.error("  FALHOU — veja os itens ✗ acima\n");
} else {
  console.log("  TODOS OS TESTES PASSARAM\n");
}

await prisma.$disconnect();
