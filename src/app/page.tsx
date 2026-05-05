import Link from "next/link";

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="text-xl font-bold tracking-tight text-zinc-900">Monetify</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/generate"
            className="hidden sm:inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Começar agora
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const platforms = ["Shopee", "Mercado Livre", "TikTok Shop", "Instagram", "Lojas online"];

  return (
    <section className="bg-zinc-950 px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {platforms.map((p) => (
            <span
              key={p}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400"
            >
              {p}
            </span>
          ))}
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Transforme fotos simples de produtos em{" "}
          <span className="text-emerald-400">imagens profissionais</span>{" "}
          para vender mais
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Com inteligência artificial, você gera fotos com qualidade de estúdio para seus
          produtos — em segundos, sem fotógrafo, sem equipamento caro.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/generate"
            className="inline-flex items-center rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            Gerar minha imagem →
          </Link>
          <span className="text-sm text-zinc-500">R$ 9,90 por imagem · Sem assinatura</span>
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
    desc: "Em segundos sua imagem profissional está pronta para qualquer marketplace.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Como funciona
          </h2>
          <p className="mt-3 text-zinc-500">
            Quatro passos simples. Do celular à imagem profissional.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="flex flex-col">
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
    desc: "Produtos com foto profissional transmitem credibilidade e convertem mais. A primeira impressão é visual.",
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
    <section className="bg-zinc-50 px-4 py-20 sm:px-6">
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
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
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
    "Imagem gerada com IA em alta resolução",
    "Download imediato após a geração",
    "Pronto para Shopee, Mercado Livre e mais",
    "Pagamento via PIX — rápido e seguro",
  ];

  return (
    <section className="bg-white px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Preço simples
        </h2>
        <p className="mt-3 text-zinc-500">Sem planos confusos. Pague só pelo que usar.</p>

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
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
            className="mt-8 flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-3.5 text-base font-semibold text-white hover:bg-zinc-700 transition-colors"
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
          Comece agora mesmo. Sem assinatura, sem contrato. Pague apenas quando gerar.
        </p>
        <Link
          href="/generate"
          className="mt-8 inline-flex items-center rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-emerald-400 transition-colors"
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
        <Benefits />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
