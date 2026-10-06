// Família semântica e ícone de cada estágio, status de aporte, temperatura e tipo de organização
// (crm-design-system.md, seção 6). Só o StatusBadge consome este mapa; os rótulos continuam em
// labels.ts e enum-labels.ts. A chave do estágio é (pipeline, estágio): `inscrito` é meio de funil
// em projetos e fechamento em alunos. Testado em tests/lib/status-tones.test.ts.
import type {
  ActivityType,
  ContributionStatus,
  LeadTemperature,
  OrganizationType,
} from "@/lib/domain/enums";
import type { Pipeline } from "@/lib/domain/pipelines";
import {
  Archive,
  Award,
  BadgeCheck,
  Banknote,
  Building2,
  Calculator,
  CheckSquare,
  Circle,
  CircleCheck,
  CircleDot,
  CircleHelp,
  CirclePause,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  Crown,
  Download,
  FileSignature,
  FileText,
  Flag,
  Flame,
  GraduationCap,
  HandCoins,
  Handshake,
  Landmark,
  Mail,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
  Play,
  Presentation,
  Receipt,
  RotateCw,
  Search,
  Send,
  Settings2,
  Snowflake,
  StickyNote,
  Theater,
  Thermometer,
  Ticket,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

// `outline` é o tom dos estados terminais (perdido, arquivado, cancelado): só borda e ícone.
export type StatusTone =
  "neutral" | "info" | "brand" | "success" | "warning" | "danger" | "outline";

export type ToneAndIcon = { tone: StatusTone; icon: LucideIcon };

const STAGE_TONES: Record<Pipeline, Record<string, ToneAndIcon>> = {
  patrocinadores: {
    novo: { tone: "neutral", icon: Circle },
    qualificado: { tone: "info", icon: CircleDot },
    diagnostico: { tone: "info", icon: Search },
    proposta: { tone: "brand", icon: FileText },
    termo: { tone: "brand", icon: FileSignature },
    aporte: { tone: "brand", icon: HandCoins },
    recibo: { tone: "success", icon: Receipt },
    renovacao: { tone: "success", icon: RotateCw },
    perdido: { tone: "outline", icon: CircleX },
  },
  contadores: {
    novo: { tone: "neutral", icon: Circle },
    contato: { tone: "info", icon: Phone },
    apresentacao: { tone: "info", icon: Presentation },
    parceria: { tone: "brand", icon: Handshake },
    ativo: { tone: "success", icon: CircleCheck },
    inativo: { tone: "warning", icon: CirclePause },
    perdido: { tone: "outline", icon: CircleX },
  },
  municipios: {
    novo: { tone: "neutral", icon: Circle },
    contato: { tone: "info", icon: Phone },
    diagnostico: { tone: "info", icon: Search },
    proposta: { tone: "brand", icon: FileText },
    contrato: { tone: "brand", icon: FileSignature },
    execucao: { tone: "success", icon: Play },
    encerrado: { tone: "success", icon: Flag },
    perdido: { tone: "outline", icon: CircleX },
  },
  projetos: {
    prospeccao: { tone: "neutral", icon: Circle },
    avaliacao: { tone: "info", icon: Search },
    elaboracao: { tone: "info", icon: PenLine },
    inscrito: { tone: "info", icon: Send },
    autorizado: { tone: "brand", icon: BadgeCheck },
    captando: { tone: "brand", icon: HandCoins },
    execucao: { tone: "success", icon: Play },
    prestacao_contas: { tone: "warning", icon: ClipboardList },
    encerrado: { tone: "success", icon: Flag },
    arquivado: { tone: "outline", icon: Archive },
  },
  alunos: {
    lista_espera: { tone: "neutral", icon: Circle },
    pesquisado: { tone: "info", icon: ClipboardCheck },
    inscrito: { tone: "brand", icon: Ticket },
    aluno: { tone: "success", icon: GraduationCap },
    alumni: { tone: "success", icon: Award },
    perdido: { tone: "outline", icon: CircleX },
  },
};

const UNKNOWN: ToneAndIcon = { tone: "neutral", icon: Circle };

// Estágio fora do mapa (dado antigo) cai em neutro com círculo, nunca quebra a tela.
export function stageTone(pipeline: string, stage: string): ToneAndIcon {
  return (STAGE_TONES as Record<string, Record<string, ToneAndIcon>>)[pipeline]?.[stage] ?? UNKNOWN;
}

const CONTRIBUTION_TONES: Record<ContributionStatus, ToneAndIcon> = {
  proposta: { tone: "neutral", icon: FileText },
  termo_assinado: { tone: "info", icon: FileSignature },
  depositado: { tone: "success", icon: Banknote },
  recibo_emitido: { tone: "success", icon: Receipt },
  cancelado: { tone: "outline", icon: CircleX },
};

export function contributionTone(status: string): ToneAndIcon {
  return (CONTRIBUTION_TONES as Record<string, ToneAndIcon>)[status] ?? UNKNOWN;
}

const TEMPERATURE_TONES: Record<LeadTemperature, ToneAndIcon> = {
  quente: { tone: "danger", icon: Flame },
  morno: { tone: "warning", icon: Thermometer },
  frio: { tone: "neutral", icon: Snowflake },
};

export function temperatureTone(temperature: string): ToneAndIcon {
  return (TEMPERATURE_TONES as Record<string, ToneAndIcon>)[temperature] ?? UNKNOWN;
}

const ORG_TYPE_TONES: Record<OrganizationType, ToneAndIcon> = {
  empresa: { tone: "info", icon: Building2 },
  contabilidade: { tone: "neutral", icon: Calculator },
  municipio: { tone: "neutral", icon: Landmark },
  proponente: { tone: "brand", icon: Theater },
  outro: { tone: "neutral", icon: CircleHelp },
};

export function orgTypeTone(type: string): ToneAndIcon {
  return (ORG_TYPE_TONES as Record<string, ToneAndIcon>)[type] ?? UNKNOWN;
}

// Alertas de projeto (regra R-13), decisor e publicação: texto fixo ao lado do ícone.
export const PROJECT_ALERT_TONES: Record<"prazo" | "captacao", ToneAndIcon & { label: string }> = {
  prazo: { tone: "warning", icon: TriangleAlert, label: "menos de 6 meses" },
  captacao: { tone: "warning", icon: TriangleAlert, label: "abaixo de 10 %" },
};

export const DECISION_MAKER_TONE: ToneAndIcon & { label: string } = {
  tone: "brand",
  icon: Crown,
  label: "decisor",
};

// Ícone por tipo de atividade na Timeline; o rótulo vem de ACTIVITY_TYPE_LABELS.
export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  ligacao: Phone,
  reuniao: Users,
  email: Mail,
  whatsapp: MessageCircle,
  visita: MapPin,
  nota: StickyNote,
  tarefa: CheckSquare,
  formulario: FileText,
  download: Download,
  sistema: Settings2,
};
