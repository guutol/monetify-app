import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/UserMenu";

// ─── Navbar ───────────────────────────────────────────────────────────────────

async function Navbar() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-zinc-900">Monetify</span>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/generate"
                className="hidden sm:inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
              >
                Gerar imagem
              </Link>
              <UserMenu
                name={session.user.name ?? null}
                image={session.user.image ?? null}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
              >
                Entrar
              </Link>
              <Link
                href="/generate"
                className="hidden sm:inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Começar agora
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── HeroMockup ───────────────────────────────────────────────────────────────

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Main card */}
      <div className="relative rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-sm">
        {/* Card header */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Monetify
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Pronto
          </span>
        </div>

        {/* Before / After */}
        <div className="relative grid grid-cols-2 gap-3">
          {/* Before — foto original: produto pequeno, desfocado, fundo escuro */}
          <div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800">
              <span className="text-2xl opacity-30 blur-[1px]">📦</span>
              <div className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-zinc-400">
                Foto original
              </div>
            </div>
          </div>

          {/* After — imagem gerada: produto grande, nítido, sombra, fundo branco */}
          <div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white shadow-inner">
              {/* Sombra do produto */}
              <div className="absolute bottom-4 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full bg-zinc-200 blur-sm" />
              <span className="relative text-5xl drop-shadow-sm">📦</span>
              <div className="absolute bottom-2 left-2 rounded bg-black/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                Imagem gerada
              </div>
            </div>
          </div>

          {/* Arrow between columns */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-bold text-emerald-400 shadow-lg">
            →
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
          <span className="text-sm text-emerald-400">✓</span>
          <span className="text-xs font-medium text-emerald-300">Pronta para marketplace</span>
        </div>

        {/* Price row */}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
          <span className="text-xs text-zinc-500">Custo por imagem</span>
          <span className="text-sm font-bold text-white">R$ 9,90</span>
        </div>

      </div>

      {/* Floating platform badges */}
      <div className="absolute -bottom-4 -left-2 flex gap-1.5">
        {["Shopee", "Mercado Livre", "TikTok Shop", "Instagram"].map((p) => (
          <span
            key={p}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400 shadow-lg"
          >
            {p}
          </span>
        ))}
      </div>

      {/* Floating AI badge */}
      <div className="absolute -right-3 -top-3 rounded-xl bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/40">
        IA
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const platforms = ["Shopee", "Mercado Livre", "TikTok Shop", "Instagram", "Lojas online"];

  return (
    <section className="relative overflow-hidden bg-zinc-950 px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
      {/* Grid pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Primary glow — center-top */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2">
        <div className="h-[600px] w-[900px] rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      {/* Secondary glow — bottom-right, desktop only */}
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-20 hidden lg:block">
        <div className="h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — text content */}
          <div>
            <div className="mb-6 flex flex-wrap gap-2">
              {platforms.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400"
                >
                  {p}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Transforme fotos simples em{" "}
              <span className="text-emerald-400">imagens profissionais</span>{" "}
              para vender mais
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-zinc-400">
              Com inteligência artificial, você transforma qualquer foto de produto em imagem
              com qualidade de estúdio — de forma rápida, sem fotógrafo e sem equipamento caro.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/generate"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-emerald-500/50 transition-all"
              >
                Gerar minha imagem →
              </Link>
              <span className="text-sm text-zinc-500">R$ 9,90 por imagem · Sem assinatura</span>
            </div>
          </div>

          {/* Right — product mockup */}
          <div className="flex justify-center pb-8 lg:justify-end lg:pb-0">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Como funciona ────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: "📷",
    step: "01",
    title: "Envie a foto do produto",
    desc: "Use qualquer foto tirada no celular ou câmera. Não precisa ser perfeita.",
  },
  {
    icon: "🎨",
    step: "02",
    title: "Escolha o estilo",
    desc: "Fundo branco, ambiente profissional, lifestyle — você define o visual ideal.",
  },
  {
    icon: "💳",
    step: "03",
    title: "Pague com PIX",
    desc: "Pagamento rápido e seguro. Só R$ 9,90 por geração, sem assinatura.",
  },
  {
    icon: "⬇️",
    step: "04",
    title: "Baixe a imagem pronta",
    desc: "Em poucos instantes sua imagem profissional está pronta para usar em qualquer marketplace.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-zinc-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Como funciona
          </h2>
          <p className="mt-3 text-zinc-500">
            Quatro passos simples. Do celular à imagem profissional.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-2xl">
                {s.icon}
              </div>
              <span className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Passo {s.step}
              </span>
              <h3 className="mb-2 text-base font-semibold text-zinc-900">{s.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Showcase ────────────────────────────────────────────────────────────────

const SHOWCASE = [
{
  before: "/produto-1-antes.png",
  after: "/produto-1-depois.png",
},
{
  before: "/produto-2-antes.jpg",
  after: "/produto-2-depois.png",
},
{
  before: "/produto-3-antes.jpg",
  after: "/produto-3-depoiss.png",
},
];

function Showcase() {
  return (
    <section className="bg-zinc-950 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold text-emerald-400">Resultados reais</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Veja a diferença na prática
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Fotos simples de produtos transformadas em imagens mais limpas, profissionais e prontas para vender.
          </p>
        </div>

        <div className="space-y-6">
          {SHOWCASE.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
            >
              {/* Card header */}
              <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-zinc-400">Produto real</span>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Before */}
                <div>
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-800">
                    <Image
                      src={item.before}
                      alt={`Produto ${i + 1} — antes`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-zinc-400 backdrop-blur-sm">
                        Antes
                      </span>
                    </div>
                  </div>
                  <p className="px-4 py-3 text-xs text-zinc-500">Foto original enviada</p>
                </div>

                {/* After */}
                <div className="border-t border-zinc-800 sm:border-l sm:border-t-0">
                  <div className="relative aspect-square w-full overflow-hidden bg-zinc-800">
                    <Image
                      src={item.after}
                      alt={`Produto ${i + 1} — depois`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-sm">
                        Depois
                      </span>
                    </div>
                  </div>
                  <p className="px-4 py-3 text-xs text-zinc-500">Imagem gerada pelo Monetify</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Benefícios ───────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: "✨",
    title: "Imagens profissionais",
    desc: "Qualidade de estúdio fotográfico sem sair de casa. Resultado limpo, moderno e atraente para qualquer vitrine digital.",
  },
  {
    icon: "🛡️",
    title: "Mais confiança para o comprador",
    desc: "Produtos com foto profissional transmitem credibilidade e geram mais confiança no comprador. A primeira impressão sempre é visual.",
  },
  {
    icon: "🏪",
    title: "Pronto para marketplaces",
    desc: "Dimensões e qualidade ideais para Shopee, Mercado Livre, TikTok Shop, Instagram e qualquer loja online.",
  },
  {
    icon: "📸",
    title: "Sem contratar fotógrafo",
    desc: "Economize centenas de reais por sessão fotográfica. Pague apenas R$ 9,90 por imagem, só quando precisar.",
  },
];

function Benefits() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Por que usar o Monetify?
          </h2>
          <p className="mt-3 text-zinc-500">
            Feito para quem vende online e precisa de resultado rápido e profissional.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-zinc-100 bg-zinc-50 p-7 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <span className="text-3xl">{b.icon}</span>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Preço ────────────────────────────────────────────────────────────────────

function Pricing() {
  const includes = [
    "Imagem gerada com IA em qualidade profissional",
    "Download imediato após a geração",
    "Pronto para Shopee, Mercado Livre e mais",
    "Pagamento via PIX — rápido e seguro",
  ];

  return (
    <section className="bg-zinc-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Preço simples
        </h2>
        <p className="mt-3 text-zinc-500">Sem planos confusos. Pague só pelo que usar.</p>

        <div className="mt-10 rounded-2xl border border-emerald-200 bg-white p-8 shadow-md shadow-emerald-500/10">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Sem assinatura obrigatória
          </span>

          <div className="mt-6">
            <div className="flex items-end justify-center gap-1">
              <span className="text-xl font-medium text-zinc-400">R$</span>
              <span className="text-6xl font-bold tracking-tight text-zinc-900">9</span>
              <span className="mb-2 text-3xl font-bold text-zinc-900">,90</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">por imagem gerada</p>
          </div>

          <ul className="mt-8 space-y-3 text-left text-sm text-zinc-600">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/generate"
            className="mt-8 flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-500/40 transition-all"
          >
            Gerar minha primeira imagem
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="bg-zinc-950 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Pronto para vender mais com imagens profissionais?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Sem assinatura, sem contrato, sem compromisso. Pague apenas quando precisar gerar.
        </p>
        <Link
          href="/generate"
          className="mt-8 inline-flex items-center rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-500/40 transition-all"
        >
          Gerar minha imagem →
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-zinc-400 sm:flex-row">
        <span className="font-semibold text-zinc-900">Monetify</span>
        <span>© {new Date().getFullYear()} Monetify. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Showcase />
        <Benefits />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
