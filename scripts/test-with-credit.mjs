/**
 * Test script: Etapa 4 — geração com produto disponível (with-credit)
 *
 * Testa a lógica de banco (transaction, debit, rollback) diretamente via Prisma.
 * Para testar o fluxo HTTP completo (com auth), veja as instruções no final do output.
 *
 * Usage: node scripts/test-with-credit.mjs
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const USER_ID = "cmoqadr6x0000lw4g6iom3r7f";
const FAKE_PROMPT = "Pure white background, product centered.";

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}
function ok(msg) { console.log(`  ✓  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); process.exitCode = 1; }
function assert(condition, msg) { if (condition) ok(msg); else fail(msg); }

// Simulates the core transaction from the with-credit endpoint
async function runDebitTransaction(tx, userId, prompt, uploadKey = null) {
  const debit = await tx.user.updateMany({
    where: { id: userId, credits: { gt: 0 } },
    data: { credits: { decrement: 1 } },
  });

  if (debit.count === 0) throw new Error("NO_CREDITS");

  const order = await tx.order.create({
    data: {
      userId,
      amount: 0,
      paymentMethod: "PIX",
      paymentStatus: "PAID",
      generationStatus: "PROCESSING",
      orderType: "GENERATION",
      prompt,
      originalImageKey: uploadKey,
    },
  });

  await tx.creditTransaction.create({
    data: { userId, type: "CONSUMED", amount: -1, orderId: order.id },
  });

  return order;
}

// Simulates the compensation (refund) transaction
async function runRefundTransaction(tx, userId, orderId) {
  await tx.order.update({
    where: { id: orderId },
    data: { generationStatus: "FAILED" },
  });
  await tx.user.update({
    where: { id: userId },
    data: { credits: { increment: 1 } },
  });
  await tx.creditTransaction.create({
    data: { userId, type: "PURCHASED", amount: 1, orderId },
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

section("Setup");

const userBefore = await prisma.user.findUniqueOrThrow({
  where: { id: USER_ID },
  select: { email: true, credits: true },
});
console.log(`  User: ${userBefore.email}`);
console.log(`  Credits antes: ${userBefore.credits}`);

// Ensure at least 2 credits for the tests
await prisma.user.update({
  where: { id: USER_ID },
  data: { credits: 2 },
});
console.log("  Credits ajustados para 2 para os testes");

const createdOrderIds = [];

// ── TEST 1: Debit + Order criada ──────────────────────────────────────────────

section("Teste 1: debit 1 crédito → Order PAID/PROCESSING + CreditTransaction CONSUMED");

const order1 = await prisma.$transaction((tx) =>
  runDebitTransaction(tx, USER_ID, FAKE_PROMPT)
);
createdOrderIds.push(order1.id);

const user1 = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(user1.credits === 1, `User.credits = 1 (era 2, debitou 1)`);

const dbOrder1 = await prisma.order.findUniqueOrThrow({
  where: { id: order1.id },
  select: { paymentStatus: true, generationStatus: true, orderType: true, amount: true, planId: true },
});
assert(dbOrder1.paymentStatus === "PAID", `Order.paymentStatus = PAID`);
assert(dbOrder1.generationStatus === "PROCESSING", `Order.generationStatus = PROCESSING`);
assert(dbOrder1.orderType === "GENERATION", `Order.orderType = GENERATION`);
assert(dbOrder1.amount === 0, `Order.amount = 0`);
assert(dbOrder1.planId === null, `Order.planId = null`);

const tx1 = await prisma.creditTransaction.findFirst({
  where: { orderId: order1.id, type: "CONSUMED" },
  select: { amount: true, type: true },
});
assert(tx1 !== null, `CreditTransaction CONSUMED existe`);
assert(tx1?.amount === -1, `CreditTransaction.amount = -1`);

// ── TEST 2: segundo debit (credits de 2 → 1 → 0) ─────────────────────────────

section("Teste 2: debit com 1 crédito restante → ainda funciona");

const order2 = await prisma.$transaction((tx) =>
  runDebitTransaction(tx, USER_ID, FAKE_PROMPT)
);
createdOrderIds.push(order2.id);

const user2 = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(user2.credits === 0, `User.credits = 0 após segundo debit`);

// ── TEST 3: créditos = 0 → 402 ────────────────────────────────────────────────

section("Teste 3: User.credits = 0 → NO_CREDITS (retornaria 402)");

let noCreditsError = null;
try {
  await prisma.$transaction((tx) => runDebitTransaction(tx, USER_ID, FAKE_PROMPT));
} catch (err) {
  noCreditsError = err;
}

assert(noCreditsError?.message === "NO_CREDITS", `Lança NO_CREDITS quando credits = 0`);

const user3 = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(user3.credits === 0, `Credits não mudou (permanece 0) após tentativa bloqueada`);

const failedOrders = await prisma.order.count({ where: { userId: USER_ID, amount: 0, prompt: FAKE_PROMPT } });
// Only the 2 orders from tests 1 and 2 should exist — test 3 rolled back
assert(failedOrders === 2, `Nenhuma Order extra criada pelo attempt bloqueado (total=${failedOrders})`);

// ── TEST 4: falha de geração → crédito devolvido ─────────────────────────────

section("Teste 4: geração falha → crédito reembolsado (transaction de compensação)");

// Give back 1 credit so we can debit again
await prisma.user.update({ where: { id: USER_ID }, data: { credits: 1 } });

const order4 = await prisma.$transaction((tx) =>
  runDebitTransaction(tx, USER_ID, FAKE_PROMPT)
);
createdOrderIds.push(order4.id);

const userAfterDebit4 = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(userAfterDebit4.credits === 0, `Credits debitado: agora 0`);

// Simulate generation failure → refund
await prisma.$transaction((tx) => runRefundTransaction(tx, USER_ID, order4.id));

const userAfterRefund4 = await prisma.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { credits: true } });
assert(userAfterRefund4.credits === 1, `Credits reembolsado: de volta a 1`);

const dbOrder4 = await prisma.order.findUniqueOrThrow({
  where: { id: order4.id },
  select: { generationStatus: true },
});
assert(dbOrder4.generationStatus === "FAILED", `Order.generationStatus = FAILED após falha`);

const refundTx = await prisma.creditTransaction.findFirst({
  where: { orderId: order4.id, type: "PURCHASED" },
  select: { amount: true },
});
assert(refundTx !== null, `CreditTransaction de reembolso (PURCHASED) criada`);
assert(refundTx?.amount === 1, `Reembolso amount = 1`);

// Verify ledger for order4: net = CONSUMED(-1) + PURCHASED(+1) = 0
const order4Txns = await prisma.creditTransaction.findMany({
  where: { orderId: order4.id },
  select: { type: true, amount: true },
});
const net4 = order4Txns.reduce((s, t) => s + t.amount, 0);
assert(net4 === 0, `Ledger neutro para order4 (net = ${net4})`);

// ── Cleanup ────────────────────────────────────────────────────────────────────

section("Cleanup");

await prisma.creditTransaction.deleteMany({ where: { orderId: { in: createdOrderIds } } });
await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
await prisma.user.update({ where: { id: USER_ID }, data: { credits: userBefore.credits } });

console.log(`  ${createdOrderIds.length} orders de teste removidas`);
console.log(`  User.credits restaurado para ${userBefore.credits}`);

// ── HTTP test instructions ─────────────────────────────────────────────────────

section("Como testar via browser/devtools (requer login)");

console.log(`
  Cole no console do browser em http://localhost:3000 (logado):

  const res = await fetch('/api/generate/with-credit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      selectedStyle: 'marketplace',
      backgroundColorMode: null,
      backgroundColor: null,
      uploadKey: null,
    }),
  });
  console.log(res.status, await res.json());

  Esperado com USER_ID que tenha credits > 0:
    200 → { previews: [...], orderId: "..." }

  Esperado com credits = 0:
    402 → { error: "Sem produtos disponíveis" }
`);

// ── SQL verification ──────────────────────────────────────────────────────────

section("SQL para verificar após teste HTTP real");

console.log(`
  -- Checar Order criada pelo with-credit
  SELECT id, "paymentStatus", "generationStatus", "orderType", amount, "planId", prompt
  FROM "Order"
  WHERE "userId" = '${USER_ID}'
    AND amount = 0
    AND "paymentStatus" = 'PAID'
  ORDER BY "createdAt" DESC LIMIT 5;

  -- Checar User.credits
  SELECT id, email, credits FROM "User" WHERE id = '${USER_ID}';

  -- Checar CreditTransactions recentes
  SELECT id, "userId", type, amount, "orderId", "createdAt"
  FROM "CreditTransaction"
  WHERE "userId" = '${USER_ID}'
  ORDER BY "createdAt" DESC LIMIT 10;
`);

// ── Result ────────────────────────────────────────────────────────────────────

section("Resultado final");
if (process.exitCode === 1) {
  console.error("  FALHOU — veja os itens ✗ acima\n");
} else {
  console.log("  TODOS OS TESTES PASSARAM\n");
}

await prisma.$disconnect();
