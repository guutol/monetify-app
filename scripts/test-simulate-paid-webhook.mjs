/**
 * Testa a rota POST /api/dev/orders/[orderId]/simulate-paid-webhook
 * e a função compartilhada handlePackagePayment via Prisma direto.
 *
 * Uso: node scripts/test-simulate-paid-webhook.mjs
 * Requer: servidor dev rodando em http://localhost:3000
 *         e sessão autenticada via cookie (ou teste via Prisma direto)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(label, value, expected) {
  const ok = JSON.stringify(value) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`    esperado: ${JSON.stringify(expected)}`);
    console.error(`    recebido: ${JSON.stringify(value)}`);
    failed++;
  }
}

function assertTruthy(label, value) {
  if (value) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}: recebeu falsy (${JSON.stringify(value)})`);
    failed++;
  }
}

async function cleanup(userId, orderIds) {
  await prisma.creditTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  // Reset credits to 0
  await prisma.user.update({ where: { id: userId }, data: { credits: 0 } });
}

async function findOrCreateTestUser() {
  let user = await prisma.user.findFirst({
    where: { email: "test-simulate@monetify.test" },
    select: { id: true, credits: true },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test-simulate@monetify.test",
        name: "Test Simulate",
        credits: 0,
      },
      select: { id: true, credits: true },
    });
  }
  return user;
}

// ── Import shared function directly ─────────────────────────────────────────
// We test the function logic via Prisma, bypassing HTTP auth
const { handlePackagePayment } = await import("../src/lib/order-payment.ts").catch(() => null)
  ?? await import("../src/lib/order-payment.js").catch(() => {
    console.error("Não foi possível importar handlePackagePayment. Rode com tsx ou ts-node.");
    process.exit(1);
  });

async function main() {
  const user = await findOrCreateTestUser();
  const userId = user.id;

  const orderIds = [];

  try {
    // ── Cenário 1: PACKAGE payment — primeira vez ──────────────────────────
    console.log("\n── Cenário 1: handlePackagePayment — primeira entrega ──");

    const order1 = await prisma.order.create({
      data: {
        userId,
        amount: 4990,
        paymentMethod: "PIX",
        orderType: "PACKAGE",
        planId: "starter",
        paymentStatus: "PENDING",
        generationStatus: "PENDING",
        externalId: `test-sim-${Date.now()}-1`,
        rawWebhookData: {},
      },
      select: { id: true },
    });
    orderIds.push(order1.id);

    const result1 = await handlePackagePayment(
      order1.id,
      "starter",
      userId,
      { source: "test-script" },
    );

    assert("alreadyCredited = false (primeira entrega)", result1.alreadyCredited, false);
    // starter plan: 3 products
    assert("creditsAdded = 3", result1.creditsAdded, 3);

    const userAfter1 = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    assert("User.credits = 3", userAfter1?.credits, 3);

    const orderAfter1 = await prisma.order.findUnique({ where: { id: order1.id }, select: { paymentStatus: true } });
    assert("Order.paymentStatus = PAID", orderAfter1?.paymentStatus, "PAID");

    const txAfter1 = await prisma.creditTransaction.findFirst({
      where: { orderId: order1.id, type: "PURCHASED" },
      select: { amount: true },
    });
    assertTruthy("CreditTransaction PURCHASED criada", txAfter1);
    assert("CreditTransaction.amount = 3", txAfter1?.amount, 3);

    // ── Cenário 2: Idempotência — segunda chamada para o mesmo orderId ───────
    console.log("\n── Cenário 2: Idempotência — segunda chamada ──");

    const result2 = await handlePackagePayment(
      order1.id,
      "starter",
      userId,
      { source: "test-script-retry" },
    );

    assert("alreadyCredited = true (segunda entrega)", result2.alreadyCredited, true);
    assert("creditsAdded = 0 (sem duplicação)", result2.creditsAdded, 0);

    const userAfter2 = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    assert("User.credits ainda = 3 (não duplicou)", userAfter2?.credits, 3);

    const txCount = await prisma.creditTransaction.count({
      where: { orderId: order1.id, type: "PURCHASED" },
    });
    assert("Apenas 1 CreditTransaction PURCHASED", txCount, 1);

    // ── Cenário 3: planId inválido (single) ─────────────────────────────────
    console.log("\n── Cenário 3: planId 'single' deve lançar erro ──");

    const order3 = await prisma.order.create({
      data: {
        userId,
        amount: 990,
        paymentMethod: "PIX",
        orderType: "PACKAGE",
        planId: "single",
        paymentStatus: "PENDING",
        generationStatus: "PENDING",
        externalId: `test-sim-${Date.now()}-3`,
        rawWebhookData: {},
      },
      select: { id: true },
    });
    orderIds.push(order3.id);

    let threw = false;
    try {
      await handlePackagePayment(order3.id, "single", userId, {});
    } catch {
      threw = true;
    }
    assert("Lançou erro para planId 'single'", threw, true);

    // ── Cenário 4: planId null deve lançar erro ─────────────────────────────
    console.log("\n── Cenário 4: planId null deve lançar erro ──");

    let threw4 = false;
    try {
      await handlePackagePayment("fake-order-id", null, userId, {});
    } catch {
      threw4 = true;
    }
    assert("Lançou erro para planId null", threw4, true);

    // ── Cenário 5: seller plan (maior pacote) ───────────────────────────────
    console.log("\n── Cenário 5: seller plan — 10 produtos ──");

    // Reset credits
    await prisma.user.update({ where: { id: userId }, data: { credits: 0 } });

    const order5 = await prisma.order.create({
      data: {
        userId,
        amount: 6990,
        paymentMethod: "PIX",
        orderType: "PACKAGE",
        planId: "seller",
        paymentStatus: "PENDING",
        generationStatus: "PENDING",
        externalId: `test-sim-${Date.now()}-5`,
        rawWebhookData: {},
      },
      select: { id: true },
    });
    orderIds.push(order5.id);

    const result5 = await handlePackagePayment(order5.id, "seller", userId, {});
    assert("alreadyCredited = false", result5.alreadyCredited, false);
    assert("creditsAdded = 10 (seller plan)", result5.creditsAdded, 10);

    const userAfter5 = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    assert("User.credits = 10", userAfter5?.credits, 10);

  } finally {
    await cleanup(userId, orderIds);
    await prisma.$disconnect();
  }

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Resultado: ${passed} passou, ${failed} falhou`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
