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
              Envie uma foto do seu produto, escolha o estilo e veja o resultado antes de pagar.
              Se gostar, libere a imagem final por R$&nbsp;9,90.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/generate"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-emerald-500/50 transition-all"
              >
                Testar grátis agora →
              </Link>
              <a
                href="#exemplos"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-7 py-3.5 text-base font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Ver exemplos
              </a>
            </div>
            <p className="mt-4 text-sm text-zinc-600">
              Sem cartão para testar · Login só na hora de gerar · Pague apenas se gostar
            </p>
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
    desc: "Use uma foto simples do item. Pode ser tirada pelo celular, sem equipamento.",
  },
  {
    icon: "🎨",
    step: "02",
    title: "Escolha o estilo",
    desc: "Marketplace, premium, fundo colorido, cenário ou redes sociais — você decide.",
  },
  {
    icon: "👁️",
    step: "03",
    title: "Veja a prévia grátis",
    desc: "Você recebe prévias para avaliar o resultado antes de pagar qualquer coisa.",
  },
  {
    icon: "✅",
    step: "04",
    title: "Libere sem marca",
    desc: "Gostou? Pague R$ 9,90 para baixar a imagem final pronta para usar.",
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
            Quatro passos simples. Veja o resultado antes de pagar.
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
    <section id="exemplos" className="bg-zinc-950 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold text-emerald-400">Resultados reais</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Veja a diferença entre uma foto comum e uma imagem pronta para anúncio
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Use suas próprias fotos de produto e gere versões com aparência profissional para marketplace, redes sociais e anúncios.
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
    icon: "🏪",
    title: "Ideal para marketplaces e redes sociais",
    desc: "Shopee, Mercado Livre, TikTok Shop, Instagram e qualquer loja online. Imagens no padrão de cada canal.",
  },
  {
    icon: "👁️",
    title: "Teste o resultado antes de pagar",
    desc: "Avalie o resultado antes de pagar. Só pague quando gostar — sem risco.",
  },
  {
    icon: "📸",
    title: "Sem ensaio fotográfico",
    desc: "Economize centenas de reais por sessão. Pague apenas R$ 9,90 por imagem, só quando precisar.",
  },
  {
    icon: "📦",
    title: "Pacotes para quem vende com frequência",
    desc: "De avulso a pacotes de 30 imagens. Quanto mais você gera, menor o custo por imagem.",
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
  const packages = [
    { qty: 5, price: "R$ 34,90", perUnit: "R$ 6,98/img" },
    { qty: 15, price: "R$ 79,90", perUnit: "R$ 5,33/img" },
    { qty: 30, price: "R$ 129,90", perUnit: "R$ 4,33/img" },
  ];

  return (
    <section className="bg-zinc-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Teste grátis. Pague só se gostar.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-500">
            Veja o resultado gratuitamente antes de pagar. Para usar a imagem final, libere por
            R$&nbsp;9,90 ou escolha um pacote.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Free preview card */}
          <div className="flex flex-col rounded-2xl border border-emerald-200 bg-white p-7 shadow-md shadow-emerald-500/10">
            <span className="mx-auto inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 lg:mx-0">
              Para novos usuários
            </span>
            <h3 className="mt-5 text-center text-xl font-bold text-zinc-900 lg:text-left">Prévia grátis</h3>
            <div className="mt-3 flex items-end justify-center gap-1 lg:justify-start">
              <span className="text-5xl font-bold tracking-tight text-zinc-900">R$&nbsp;0</span>
            </div>
            <p className="mt-2 text-center text-sm text-zinc-500 lg:text-left">
              Veja uma prévia do resultado antes de pagar.
            </p>
            <ul className="mx-auto mt-5 w-fit space-y-2 text-sm text-zinc-600 lg:mx-0">
              <li className="flex items-center gap-2">
                <span className="shrink-0 text-emerald-500">✓</span>
                Veja o resultado antes de pagar
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0 text-emerald-500">✓</span>
                Pague apenas se gostar
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0 text-emerald-500">✓</span>
                Sem assinatura
              </li>
            </ul>
            <p className="mt-4 text-center text-xs text-zinc-400 lg:text-left">
              A prévia gratuita possui marca d&apos;água.
            </p>
            <div className="mt-auto pt-6">
              <Link
                href="/generate"
                className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:bg-emerald-400"
              >
                Testar grátis
              </Link>
            </div>
          </div>

          {/* Paid options card */}
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
            <span className="mx-auto inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 lg:mx-0">
              Sem assinatura
            </span>
            <h3 className="mt-5 text-center text-xl font-bold text-zinc-900 lg:text-left">Imagem sem marca</h3>
            <div className="mt-3 flex items-end justify-center gap-1 lg:justify-start">
              <span className="text-xl font-medium text-zinc-400">R$</span>
              <span className="text-5xl font-bold tracking-tight text-zinc-900">9</span>
              <span className="mb-1 text-2xl font-bold text-zinc-900">,90</span>
            </div>
            <p className="mt-2 text-center text-sm text-zinc-500 lg:text-left">
              Libere o download da imagem final. Pague só se gostar do resultado.
            </p>

            <div className="mt-5 border-t border-zinc-100 pt-5">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400 lg:text-left">
                Pacotes para quem gera mais
              </p>
              <ul className="space-y-2">
                {packages.map((p) => (
                  <li key={p.qty} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm">
                    <span className="font-medium text-zinc-700">{p.qty} imagens</span>
                    <div className="text-right">
                      <span className="font-bold text-zinc-900">{p.price}</span>
                      <span className="ml-2 text-xs text-zinc-400">{p.perUnit}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-6">
              <Link
                href="/generate"
                className="flex w-full items-center justify-center rounded-xl border border-zinc-300 px-6 py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                Gerar agora
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Pagamento via PIX. Produtos não expiram. Sem assinatura mensal.
        </p>
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
          Teste com um produto real antes de pagar
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Envie uma foto simples, veja o resultado e pague apenas se quiser liberar a imagem final.
        </p>
        <Link
          href="/generate"
          className="mt-8 inline-flex items-center rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-500/40 transition-all"
        >
          Gerar minha prévia grátis →
        </Link>
        <p className="mt-4 text-sm text-zinc-600">Sem cartão · Sem assinatura · Teste antes de pagar</p>
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
