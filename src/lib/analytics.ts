// Eventos de analytics do site (estrutura-e-copy.md, seção 9.2) sobre o Vercel Web Analytics.
// `page_view` é automático pelo componente <Analytics /> do layout raiz. Nunca enviar nome,
// e-mail, telefone ou valores exatos: as propriedades passam por um filtro de chaves proibidas.
// Funciona só no navegador; no servidor é um no-op (os eventos de servidor ficam no CRM).
import { track as vercelTrack } from "@vercel/analytics";

export type AnalyticsEvent =
  | "cta_click"
  | "whatsapp_click"
  | "email_click"
  | "phone_click"
  | "form_start"
  | "form_submit"
  | "form_error"
  | "consent_marketing"
  | "guide_download"
  | "deadline_banner_view"
  | "outbound_click"
  | "scroll_depth"
  | "simulator_start"
  | "simulator_step"
  | "simulator_summary_view"
  | "simulator_disqualified"
  | "simulator_gate_submit"
  | "simulator_detail_view"
  | "simulator_pdf_download"
  | "diagnostic_requested"
  | "project_view"
  | "project_sponsor_click"
  | "project_deck_download"
  | "waitlist_join"
  | "article_read";

export type AnalyticsValue = string | number | boolean | null;
export type AnalyticsProps = Record<string, AnalyticsValue>;

export type WhatsappContext = "hero" | "footer" | "floating" | "thanks_page" | "project" | "page";

// Chaves que nunca saem para o analytics, mesmo por engano (seção 9.1).
const FORBIDDEN_KEY =
  /(^|_)(nome|name|e-?mail|phone|telefone|celular|whatsapp_number|cpf|cnpj|mensagem|message|valor|amount|irpj$|ir_devido$)($|_)/i;

export function sanitizeProps(props: AnalyticsProps = {}): AnalyticsProps {
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_KEY.test(key)) continue;
    if (value === undefined) continue;
    out[key] = typeof value === "string" ? value.slice(0, 200) : value;
  }
  return out;
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    vercelTrack(event, sanitizeProps(props));
  } catch {
    // Analytics nunca quebra a página.
  }
}

export function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

// Atribuição da visita (UTM, referrer, página de entrada), guardada na sessão do navegador para
// preencher os campos ocultos dos formulários (estrutura-e-copy.md, seção 5.1). Só sessionStorage,
// sem cookie; falha em silêncio quando o armazenamento está bloqueado.
export type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  referrer: string;
  landing_path: string;
};

const ATTRIBUTION_KEY = "prospekto.attribution";

export function captureAttribution(): Attribution {
  const empty: Attribution = {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    referrer: "",
    landing_path: "",
  };
  if (typeof window === "undefined") return empty;
  let stored: Attribution | null = null;
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    stored = raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    stored = null;
  }
  const params = new URLSearchParams(window.location.search);
  const fromUrl = {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
  };
  const hasUtm = Boolean(fromUrl.utm_source || fromUrl.utm_medium || fromUrl.utm_campaign);
  const next: Attribution = {
    utm_source: hasUtm ? fromUrl.utm_source : (stored?.utm_source ?? ""),
    utm_medium: hasUtm ? fromUrl.utm_medium : (stored?.utm_medium ?? ""),
    utm_campaign: hasUtm ? fromUrl.utm_campaign : (stored?.utm_campaign ?? ""),
    referrer: stored?.referrer || externalReferrer(),
    landing_path: stored?.landing_path || window.location.pathname,
  };
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // sem armazenamento: usa só o que está na URL
  }
  return next;
}

function externalReferrer(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    const ref = new URL(document.referrer);
    return ref.host === window.location.host ? "" : document.referrer.slice(0, 500);
  } catch {
    return "";
  }
}

// Leitura estável da atribuição para useSyncExternalStore (um objeto por URL; sem efeito nem
// setState, e sem divergência de hidratação: no servidor o snapshot é o vazio).
export const EMPTY_ATTRIBUTION: Attribution = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  referrer: "",
  landing_path: "",
};

let attributionHref = "";
let attributionSnapshot: Attribution = EMPTY_ATTRIBUTION;

export function getAttributionSnapshot(): Attribution {
  if (typeof window === "undefined") return EMPTY_ATTRIBUTION;
  if (window.location.href !== attributionHref) {
    attributionHref = window.location.href;
    attributionSnapshot = captureAttribution();
  }
  return attributionSnapshot;
}

export function getEmptyAttribution(): Attribution {
  return EMPTY_ATTRIBUTION;
}

// Assinatura vazia: os valores só mudam com a URL, que já re-renderiza pelo roteador.
export function subscribeNoop(): () => void {
  return () => {};
}
