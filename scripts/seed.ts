// scaffold.md, seção 5.6: tenant `prospekto` e usuários de SEED_USERS ("Nome <email>;Nome <email>").
// SEED_RESET_PASSWORD=1 gera senha temporária nova para os e-mails que já existem.
// Idempotente: pula e-mails já existentes. Sem e-mails reais neste arquivo.
//
// Criação de usuário com cadastro fechado (disableSignUp): o Better Auth 1.7.7 recusa
// auth.api.signUpEmail; usamos o contexto interno (auth.$context), que é exatamente o que a
// rota de sign-up faz por dentro (node_modules/better-auth/dist/api/routes/sign-up.mjs):
// password.hash + internalAdapter.createUser + internalAdapter.linkAccount(providerId "credential").
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateRandomString } from "better-auth/crypto";
import { isDeployed } from "../src/env";
import { auth } from "../src/lib/auth";
import { prospectingMessages, variantIndexFor } from "../src/lib/crm/prospecting-messages";
import { db } from "../src/lib/db";
import {
  activities,
  contributions,
  culturalProjects,
  leads,
  organizations,
  prospectingItems,
  prospectingLists,
  tenants,
  users as usersTable,
} from "../src/lib/db/schema";
import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";

const TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "prospekto";
const TENANT_NAME = "Prospekto Consultoria & Projetos";

// Sem credenciais nem e-mails no stdout (R-16; logs da CI e do Vercel persistem): a senha temporária
// vai para um arquivo 0600 em diretório temporário fora do repositório, e o e-mail sai mascarado.
const maskEmail = (email: string) => `${email.slice(0, 1)}***@${email.split("@")[1] ?? ""}`;
let credentialsFile: string | null = null;
async function storeCredentials(email: string, password: string) {
  if (!credentialsFile) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "prospekto-seed-"));
    await chmod(dir, 0o700);
    credentialsFile = path.join(dir, "credenciais.txt");
    await writeFile(credentialsFile, "", { mode: 0o600 });
  }
  await writeFile(credentialsFile, `${email}\t${password}\n`, { flag: "a", mode: 0o600 });
}

type SeedUser = { name: string; email: string };

function parseSeedUsers(raw: string | undefined): SeedUser[] {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const match = entry.match(/^(.*?)\s*<([^>]+)>$/);
      // Sem o texto da entrada: ela traz nome e e-mail de uma pessoa, e o log é compartilhado (R-16).
      if (!match) {
        throw new Error(
          `SEED_USERS: entrada ${index + 1} inválida; use "Nome <email>" (nome, espaço, e-mail entre < e >)`,
        );
      }
      return { name: match[1].trim() || match[2].trim(), email: match[2].trim().toLowerCase() };
    });
}

await db.insert(tenants).values({ id: TENANT_ID, name: TENANT_NAME }).onConflictDoNothing();
console.log(`tenant ${TENANT_ID} pronto`);

const users = parseSeedUsers(process.env.SEED_USERS);
if (users.length === 0) {
  console.log("SEED_USERS vazio: nenhum usuário criado");
} else {
  const ctx = await auth.$context;
  for (const [index, user] of users.entries()) {
    const existing = await ctx.internalAdapter.findUserByEmail(user.email);
    const password = generateRandomString(20, "a-z", "A-Z", "0-9");
    const hash = await ctx.password.hash(password);
    if (existing?.user) {
      // SEED_RESET_PASSWORD=1: redefine a senha de quem já existe (mesmo hash scrypt do cadastro).
      if (process.env.SEED_RESET_PASSWORD === "1") {
        await ctx.internalAdapter.updatePassword(existing.user.id, hash);
        await storeCredentials(user.email, password);
        console.log(`senha redefinida: ${maskEmail(user.email)}`);
      } else {
        console.log(`usuário já existe, pulado: ${maskEmail(user.email)}`);
      }
      continue;
    }
    const created = await ctx.internalAdapter.createUser(
      {
        name: user.name,
        email: user.email,
        emailVerified: true,
        tenantId: TENANT_ID,
        role: index === 0 ? "owner" : "operator",
      },
      { method: "email-password" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: hash,
    });
    await storeCredentials(user.email, password);
    console.log(`usuário criado: ${maskEmail(user.email)} (${index === 0 ? "owner" : "operator"})`);
  }
  if (credentialsFile) {
    console.log(`senhas temporárias em ${credentialsFile} (0600); apague após o primeiro acesso`);
  }
}

// SEED_EXAMPLE=1: organização proponente e projeto de exemplo com os dados PÚBLICOS do deck
// docs/fontes/materiais/exemplo-projeto-a-tacada-perfeita-deck.txt. Idempotente pelo slug.
// Sem telefone nem e-mail de terceiros. Valor aprovado e saldo em branco: o deck traz só o recurso
// FSA/BRDE (R$ 2 milhões, fomento direto), não o valor da captação incentivada pelo art. 1º-A.
// Publicação no site exige autorização por escrito do proponente (R-11): published_on_site = false.
if (process.env.SEED_EXAMPLE === "1") {
  const slug = "a-tacada-perfeita";
  const [existing] = await db
    .select({ id: culturalProjects.id })
    .from(culturalProjects)
    .where(and(eq(culturalProjects.tenantId, TENANT_ID), eq(culturalProjects.slug, slug)));
  if (existing) {
    console.log(`projeto de exemplo já existe, pulado: ${slug}`);
  } else {
    let [proponent] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.tenantId, TENANT_ID),
          eq(organizations.type, "proponente"),
          eq(organizations.name, "Ocotea Filmes"),
        ),
      );
    if (!proponent) {
      [proponent] = await db
        .insert(organizations)
        .values({
          tenantId: TENANT_ID,
          type: "proponente",
          name: "Ocotea Filmes",
          city: "Balneário Camboriú",
          uf: "SC",
          sector: "Produção audiovisual",
          notes:
            "Produtora com mais de 25 anos de mercado (deck do projeto A Tacada Perfeita). Sem telefone nem e-mail cadastrados: obter com o proponente.",
        })
        .returning({ id: organizations.id });
    }
    await db.insert(culturalProjects).values({
      tenantId: TENANT_ID,
      proponentOrgId: proponent.id,
      name: "A Tacada Perfeita",
      slug,
      mechanism: "audiovisual_art1A",
      stage: "avaliacao",
      city: "Balneário Camboriú",
      uf: "SC",
      culturalSegment: "Audiovisual: longa-metragem de comédia",
      summary:
        "Longa-metragem de comédia sobre segundas chances. Gracinha, atriz esquecida que vive com antigos companheiros de teatro numa mansão decadente em Balneário Camboriú, acredita ter encontrado sua chance ao conhecer Don Ramón, famoso ator argentino que imagina ser milionário; ele atravessou a fronteira pelo mesmo motivo. Dois golpes cruzados viram uma relação verdadeira entre dois artistas que passaram a vida interpretando personagens. Elenco veterano confirmado, direção com humor de observação e Balneário Camboriú como personagem. Produção da Ocotea Filmes com recurso de R$ 2 milhões aprovado na chamada BRDE/FSA Produção Seletivo Cinema 2024; captação complementar pelo art. 1º-A da Lei do Audiovisual; distribuição prevista com a Pandora Filmes.",
      counterparts:
        "Associação da marca a um filme popular com elenco de prestígio; visibilidade em cinema, streaming, TV aberta e paga e mercado internacional (trilha da produtora em festivais, Europa e companhias aéreas). Cotas e contrapartidas detalhadas a definir com o proponente.",
      publishedOnSite: false,
      // Em branco de propósito: o deck não traz o valor da captação incentivada (art. 1º-A).
      approvedAmount: null,
      fundraisingDeadline: null,
      fundraisingFeeAmount: null,
    });
    console.log(
      `projeto de exemplo criado: ${slug} (estágio avaliacao, sem valor aprovado; publicação no site exige autorização por escrito do proponente)`,
    );
  }
}

// Dados de demonstração da estrutura do CRM (ADR-004; plano, Fundação e Integração): uma lista de
// prospecção com seis empresas fictícias, três tarefas, telefone em duas organizações e, no bloco
// seguinte, leads em todos os estágios de Patrocinadores com um projeto e aportes para o quadro e
// a régua "Carteira". Roda por padrão fora de ambiente implantado (SEED_DEMO=0 desliga) e só com
// SEED_DEMO=1 em produção. Idempotente pelo nome da lista e pelo e-mail de cada lead. Nomes,
// CNPJs, telefones (+5554900000001 a 11) e e-mails (@example.test) são fictícios.
//
// Dono dos dados: o primeiro usuário do tenant. Quando o seed roda antes de SEED_USERS (o README
// permite `npm run db:seed` sozinho), tudo nasce sem dono e os blocos "Minhas tarefas", "Só as
// minhas" e "quem liga" ficam vazios; a execução seguinte, já com usuário, preenche o que ficou
// vazio em vez de só pular.
const seedDemo = process.env.SEED_DEMO === "1" || (process.env.SEED_DEMO !== "0" && !isDeployed);
if (seedDemo) {
  const DEMO_LIST = "Vinícolas do Vale";
  const DEMO_TASKS = [
    "Preparar o roteiro de ligações da semana",
    "Enviar proposta de patrocínio",
    "Confirmar a reunião de diagnóstico",
  ] as const;
  const leadEmail = "rodrigo.exemplo@example.test";
  const projectSlug = "festival-ficticio-de-inverno";
  const [owner] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.tenantId, TENANT_ID))
    .orderBy(usersTable.createdAt)
    .limit(1);
  const ownerId = owner?.id ?? null;
  const now = new Date();
  const day = 24 * 60 * 60_000;
  const calendar = (d: Date) => d.toISOString().slice(0, 10);

  const [existingList] = await db
    .select({ id: prospectingLists.id })
    .from(prospectingLists)
    .where(and(eq(prospectingLists.tenantId, TENANT_ID), eq(prospectingLists.name, DEMO_LIST)));
  if (existingList) {
    // Base criada sem usuário: preenche lista, atividades e tarefas (só os assuntos das três
    // tarefas e os itens da lista, para não alcançar atividades de formulário público, que também
    // nascem sem created_by), leads e projeto. Espelha a primeira execução: os leads "novo" do
    // quadro continuam sem dono de propósito, o Rodrigo recebe dono; leads.stage não é tocado.
    let filled = 0;
    if (ownerId) {
      const listRows = await db
        .update(prospectingLists)
        .set({ assigneeUserId: ownerId, createdByUserId: ownerId })
        .where(
          and(eq(prospectingLists.id, existingList.id), isNull(prospectingLists.assigneeUserId)),
        )
        .returning({ id: prospectingLists.id });
      const listItemIds = db
        .select({ id: prospectingItems.id })
        .from(prospectingItems)
        .where(eq(prospectingItems.listId, existingList.id));
      const activityRows = await db
        .update(activities)
        .set({ ownerUserId: ownerId, createdByUserId: ownerId })
        .where(
          and(
            eq(activities.tenantId, TENANT_ID),
            isNull(activities.createdByUserId),
            or(
              inArray(activities.subject, [...DEMO_TASKS]),
              inArray(activities.prospectingItemId, listItemIds),
            ),
          ),
        )
        .returning({ id: activities.id });
      const leadRows = await db
        .update(leads)
        .set({ ownerUserId: ownerId })
        .where(
          and(
            eq(leads.tenantId, TENANT_ID),
            eq(leads.sourceDetail, "dados de demonstração"),
            isNull(leads.ownerUserId),
            or(ne(leads.stage, "novo"), eq(leads.email, leadEmail)),
          ),
        )
        .returning({ id: leads.id });
      const projectRows = await db
        .update(culturalProjects)
        .set({ ownerUserId: ownerId })
        .where(
          and(
            eq(culturalProjects.tenantId, TENANT_ID),
            eq(culturalProjects.slug, projectSlug),
            isNull(culturalProjects.ownerUserId),
          ),
        )
        .returning({ id: culturalProjects.id });
      filled = listRows.length + activityRows.length + leadRows.length + projectRows.length;
    }
    if (filled > 0) {
      console.log(
        `dados de demonstração já existem: responsáveis preenchidos (${filled} registros)`,
      );
    } else {
      console.log(`dados de demonstração já existem, pulados: ${DEMO_LIST}`);
    }
  } else {
    // Organizações da demonstração com o telefone da empresa (ADR-004, 6.4.7) e CNPJ fictício
    // (dígitos verificadores válidos, para a folha "Editar" aceitar salvar).
    const vinicolaId = await ensureCompany(
      "Vinícola Exemplo",
      "+5554900000001",
      "Bento Gonçalves",
      "11222333000181",
    );
    await ensureCompany("Metalúrgica Modelo", "+5554900000002", "Caxias do Sul", "12345678000195");

    // Lead PJ fictício ligado à vinícola (para a tarefa em andamento ter vínculo), com o telefone
    // da pessoa para o "Ligar" e o "Abrir WhatsApp" do lead.
    let [lead] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(eq(leads.tenantId, TENANT_ID), eq(leads.email, leadEmail), eq(leads.segment, "PJ")),
      );
    if (!lead) {
      [lead] = await db
        .insert(leads)
        .values({
          tenantId: TENANT_ID,
          segment: "PJ",
          pipeline: "patrocinadores",
          stage: "novo",
          interest: "rouanet",
          name: "Rodrigo Exemplo",
          email: leadEmail,
          phone: "+5554900000011",
          source: "outro",
          sourceDetail: "dados de demonstração",
          orgId: vinicolaId,
          ownerUserId: ownerId,
          attributes: { empresa: "Vinícola Exemplo", cargo: "dono_ou_socio" },
        })
        .returning({ id: leads.id });
    }

    const [list] = await db
      .insert(prospectingLists)
      .values({
        tenantId: TENANT_ID,
        name: DEMO_LIST,
        region: "Bento Gonçalves/RS",
        sourceDetail: "busca pública (dados de demonstração)",
        notes:
          "Ligar entre 9h e 11h. Abertura: quem é você, o que a Prospekto faz e o convite para contar como decidem apoios.",
        assigneeUserId: ownerId,
        createdByUserId: ownerId,
      })
      .returning({ id: prospectingLists.id });

    const items = await db
      .insert(prospectingItems)
      .values([
        {
          tenantId: TENANT_ID,
          listId: list.id,
          name: "Vinícola Exemplo",
          segment: "Vinícolas",
          phone: "+5554900000001",
          hook: "Lançaram um rótulo novo em setembro.",
          address: "Vale dos Vinhedos",
          size: "Média",
          position: 1,
          status: "a_ligar",
        },
        {
          tenantId: TENANT_ID,
          listId: list.id,
          name: "Vinícola Modelo",
          segment: "Vinícolas",
          phone: "+5554900000002",
          hook: "Patrocinam a festa da colheita há anos.",
          position: 2,
          status: "sem_resposta",
          calledAt: new Date(now.getTime() - 2 * day),
        },
        {
          tenantId: TENANT_ID,
          listId: list.id,
          name: "Adega Fictícia",
          segment: "Vinícolas",
          phone: "+5554900000003",
          hook: "Abriram loja na serra.",
          position: 3,
          status: "retornar",
          calledAt: new Date(now.getTime() - day),
          callbackAt: calendar(new Date(now.getTime() + 2 * day)),
          notes: "Falar com o financeiro na quinta.",
        },
        {
          tenantId: TENANT_ID,
          listId: list.id,
          name: "Cantina Exemplar",
          segment: "Vinícolas",
          phone: null,
          info: "Telefone informado: ramal interno, sem número externo.",
          position: 4,
          status: "a_ligar",
        },
        {
          tenantId: TENANT_ID,
          listId: list.id,
          name: "Metalúrgica Modelo",
          segment: "Metalúrgicas",
          phone: "+5554900000005",
          hook: "Ampliaram a fábrica este ano.",
          position: 5,
          status: "descartado",
          calledAt: new Date(now.getTime() - 3 * day),
        },
        {
          tenantId: TENANT_ID,
          listId: list.id,
          name: "Espumantes Ilustrativos",
          segment: "Vinícolas",
          phone: "+5554900000006",
          hook: "Prêmio em concurso nacional.",
          position: 6,
          status: "a_ligar",
          // "WhatsApp aberto há 2 d": o CRM só sabe que a mensagem foi aberta com o texto.
          whatsappSentAt: new Date(now.getTime() - 2 * day),
        },
      ])
      .returning({ id: prospectingItems.id, name: prospectingItems.name });
    const byName = Object.fromEntries(items.map((i) => [i.name, i.id]));

    // Ligações registradas nos itens (sem resposta, retorno e descarte com motivo).
    await db.insert(activities).values([
      {
        tenantId: TENANT_ID,
        type: "ligacao",
        subject: "Ligação: sem resposta",
        data: { result: "sem_resposta" },
        occurredAt: new Date(now.getTime() - 2 * day),
        prospectingItemId: byName["Vinícola Modelo"],
        createdByUserId: ownerId,
      },
      {
        tenantId: TENANT_ID,
        type: "ligacao",
        subject: "Ligação: retornar",
        data: { result: "retornar", callbackAt: calendar(new Date(now.getTime() + 2 * day)) },
        occurredAt: new Date(now.getTime() - day),
        prospectingItemId: byName["Adega Fictícia"],
        createdByUserId: ownerId,
      },
      {
        tenantId: TENANT_ID,
        type: "ligacao",
        subject: "Ligação: descartada (sem interesse)",
        data: { result: "descartado", reason: "sem_interesse" },
        occurredAt: new Date(now.getTime() - 3 * day),
        prospectingItemId: byName["Metalúrgica Modelo"],
        createdByUserId: ownerId,
      },
      // O mesmo registro que recordWhatsappSent grava: o CRM só sabe que a mensagem foi aberta com
      // este texto (ADR-004, 6.6: "aberto", nunca "enviado"), e o texto é a variação que o produto
      // escolhe para o item.
      {
        tenantId: TENANT_ID,
        type: "whatsapp",
        subject: "WhatsApp aberto pela prospecção",
        body: prospectingMessages("Espumantes Ilustrativos")[
          variantIndexFor(byName["Espumantes Ilustrativos"], 3)
        ],
        data: { channel: "whatsapp" },
        occurredAt: new Date(now.getTime() - 2 * day),
        prospectingItemId: byName["Espumantes Ilustrativos"],
        createdByUserId: ownerId,
      },
    ]);

    // Três tarefas: uma solta, uma em andamento ligada ao lead, uma concluída. Posição acima da
    // última tarefa aberta do tenant (P16: toda inserção de tarefa grava max + 1).
    const [{ maxPosition }] = await db
      .select({ maxPosition: sql<number>`coalesce(max(${activities.position}), 0)::float8` })
      .from(activities)
      .where(
        and(
          eq(activities.tenantId, TENANT_ID),
          eq(activities.type, "tarefa"),
          isNull(activities.doneAt),
        ),
      );
    const basePosition = Number(maxPosition);
    await db.insert(activities).values([
      {
        tenantId: TENANT_ID,
        type: "tarefa",
        subject: DEMO_TASKS[0],
        priority: "alta",
        position: basePosition + 1,
        dueAt: new Date(now.getTime() + day),
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      },
      {
        tenantId: TENANT_ID,
        type: "tarefa",
        subject: DEMO_TASKS[1],
        body: "Montar a simulação com o contador antes de enviar.",
        priority: "media",
        position: basePosition + 2,
        startedAt: new Date(now.getTime() - day),
        dueAt: new Date(now.getTime() + 3 * day),
        leadId: lead.id,
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      },
      {
        tenantId: TENANT_ID,
        type: "tarefa",
        subject: DEMO_TASKS[2],
        priority: "baixa",
        position: basePosition + 3,
        dueAt: new Date(now.getTime() - 2 * day),
        doneAt: new Date(now.getTime() - day),
        leadId: lead.id,
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      },
    ]);
    console.log(
      `dados de demonstração criados: lista ${DEMO_LIST} (6 empresas), 3 tarefas, 2 organizações com telefone`,
    );
  }

  // Quadro de leads e régua "Carteira" (frente A; Integração): leads fictícios em todos os
  // estágios de Patrocinadores, um proponente com um projeto captando e aportes em proposta,
  // termo assinado e depositado. Idempotente por e-mail (um lead a mais numa base antiga entra).
  const at = (days: number) => new Date(now.getTime() + days * day);

  const metalurgicaId = await ensureCompany(
    "Metalúrgica Modelo",
    "+5554900000002",
    "Caxias do Sul",
    "12345678000195",
  );
  const farmaciasId = await ensureCompany(
    "Rede Farmácias Fictícia",
    "+5554900000007",
    "Garibaldi",
    "98765432000198",
  );
  let [proponent] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.tenantId, TENANT_ID),
        eq(organizations.type, "proponente"),
        eq(organizations.name, "Produtora Fictícia"),
      ),
    );
  if (!proponent) {
    [proponent] = await db
      .insert(organizations)
      .values({
        tenantId: TENANT_ID,
        type: "proponente",
        name: "Produtora Fictícia",
        city: "Caxias do Sul",
        uf: "RS",
      })
      .returning({ id: organizations.id });
  }
  let [project] = await db
    .select({ id: culturalProjects.id })
    .from(culturalProjects)
    .where(and(eq(culturalProjects.tenantId, TENANT_ID), eq(culturalProjects.slug, projectSlug)));
  if (!project) {
    [project] = await db
      .insert(culturalProjects)
      .values({
        tenantId: TENANT_ID,
        proponentOrgId: proponent.id,
        name: "Festival Fictício de Inverno",
        slug: projectSlug,
        mechanism: "rouanet_art18",
        stage: "captando",
        stageEnteredAt: at(-40),
        approvedAmount: 1_500_000,
        // Já conta o aporte depositado abaixo (regra R-6: soma dos depositados).
        raisedAmount: 150_000,
        fundraisingDeadline: calendar(at(200)),
        fundraisingFeeAmount: 150_000,
        city: "Caxias do Sul",
        uf: "RS",
        culturalSegment: "Música",
        ownerUserId: ownerId,
      })
      .returning({ id: culturalProjects.id });
  }

  type DemoLead = {
    name: string;
    email: string;
    stage: string;
    segment: "PJ" | "PF";
    company?: string;
    orgId?: string | null;
    temperature: "frio" | "morno" | "quente";
    nextActionAt?: Date | null;
    stageEnteredAt: Date;
    lostReason?: "sem_interesse" | "sem_irpj";
    contribution?: {
      amount: number;
      status: "proposta" | "termo_assinado" | "depositado";
      deposited?: number;
    };
  };
  const demoLeads: DemoLead[] = [
    {
      name: "Fernanda Lorenzi",
      email: "fernanda.ficticia@example.test",
      stage: "novo",
      segment: "PJ",
      company: "Cooperativa Fictícia",
      temperature: "morno",
      nextActionAt: at(-2),
      stageEnteredAt: at(-3),
    },
    {
      name: "Carlos Bettin",
      email: "carlos.ficticio@example.test",
      stage: "novo",
      segment: "PJ",
      company: "Transportes Fictícios",
      temperature: "frio",
      stageEnteredAt: at(-1),
    },
    {
      name: "Joana Pires",
      email: "joana.ficticia@example.test",
      stage: "qualificado",
      segment: "PJ",
      company: "Metalúrgica Modelo",
      orgId: metalurgicaId,
      temperature: "quente",
      nextActionAt: at(1),
      stageEnteredAt: at(-4),
    },
    {
      name: "Marcos Dalla Costa",
      email: "marcos.ficticio@example.test",
      stage: "qualificado",
      segment: "PF",
      temperature: "morno",
      nextActionAt: at(3),
      stageEnteredAt: at(-2),
    },
    {
      name: "Beatriz Maggioni",
      email: "beatriz.ficticia@example.test",
      stage: "diagnostico",
      segment: "PJ",
      company: "Rede Farmácias Fictícia",
      orgId: farmaciasId,
      temperature: "quente",
      nextActionAt: at(0.2),
      stageEnteredAt: at(-6),
    },
    {
      name: "Paulo Zanella",
      email: "paulo.ficticio@example.test",
      stage: "proposta",
      segment: "PJ",
      company: "Rede Farmácias Fictícia",
      orgId: farmaciasId,
      temperature: "quente",
      nextActionAt: at(2),
      stageEnteredAt: at(-8),
      contribution: { amount: 250_000, status: "proposta" },
    },
    {
      name: "Lúcia Sartori",
      email: "lucia.ficticia@example.test",
      stage: "proposta",
      segment: "PF",
      temperature: "morno",
      nextActionAt: at(5),
      stageEnteredAt: at(-3),
      contribution: { amount: 100_000, status: "proposta" },
    },
    {
      name: "André Bortolini",
      email: "andre.ficticio@example.test",
      stage: "termo",
      segment: "PJ",
      company: "Metalúrgica Modelo",
      orgId: metalurgicaId,
      temperature: "quente",
      nextActionAt: at(4),
      stageEnteredAt: at(-10),
      contribution: { amount: 400_000, status: "termo_assinado" },
    },
    {
      name: "Cláudio Bertolini",
      email: "claudio.ficticio@example.test",
      stage: "aporte",
      segment: "PJ",
      company: "Rede Farmácias Fictícia",
      orgId: farmaciasId,
      temperature: "quente",
      nextActionAt: at(6),
      stageEnteredAt: at(-12),
      contribution: { amount: 150_000, status: "depositado", deposited: 150_000 },
    },
    {
      name: "Helena Casagrande",
      email: "helena.ficticia@example.test",
      stage: "perdido",
      segment: "PJ",
      company: "Vidraçaria Fictícia",
      temperature: "frio",
      stageEnteredAt: at(-30),
      lostReason: "sem_interesse",
    },
  ];
  let createdLeads = 0;
  for (const d of demoLeads) {
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(eq(leads.tenantId, TENANT_ID), eq(leads.email, d.email), eq(leads.segment, d.segment)),
      );
    if (existing) continue;
    const [lead] = await db
      .insert(leads)
      .values({
        tenantId: TENANT_ID,
        segment: d.segment,
        pipeline: "patrocinadores",
        stage: d.stage,
        stageEnteredAt: d.stageEnteredAt,
        interest: "rouanet",
        name: d.name,
        email: d.email,
        source: "outro",
        sourceDetail: "dados de demonstração",
        orgId: d.orgId ?? null,
        ownerUserId: d.stage === "novo" ? null : ownerId,
        temperature: d.temperature,
        score: d.temperature === "quente" ? 60 : d.temperature === "morno" ? 30 : 5,
        nextActionAt: d.nextActionAt ?? null,
        lastContactAt: d.stage === "novo" ? null : at(-1),
        lostReason: d.lostReason ?? null,
        attributes: d.company ? { empresa: d.company, cargo: "dono_ou_socio" } : {},
      })
      .returning({ id: leads.id });
    createdLeads += 1;
    if (d.contribution) {
      const c = d.contribution;
      await db.insert(contributions).values({
        tenantId: TENANT_ID,
        projectId: project.id,
        leadId: lead.id,
        orgId: d.orgId ?? null,
        type: "patrocinio",
        mechanism: "rouanet_art18",
        status: c.status,
        proposedAmount: c.amount,
        expectedCloseAt: c.status === "proposta" ? calendar(at(10)) : null,
        termSignedAt: c.status === "proposta" ? null : calendar(at(-5)),
        depositedAmount: c.deposited ?? null,
        depositedAt: c.deposited ? calendar(at(-2)) : null,
      });
    }
  }
  if (createdLeads > 0) {
    console.log(`leads de demonstração criados: ${createdLeads} (projeto ${projectSlug})`);
  } else {
    console.log("leads de demonstração já existem, pulados");
  }
}

// Organização "empresa" de demonstração por nome: cria com telefone e CNPJ, ou completa o que
// faltar numa existente. Fora do bloco da lista porque o bloco do quadro também a usa.
async function ensureCompany(name: string, phone: string, city: string, cnpj: string) {
  const [found] = await db
    .select({ id: organizations.id, phone: organizations.phone, cnpj: organizations.cnpj })
    .from(organizations)
    .where(
      and(
        eq(organizations.tenantId, TENANT_ID),
        eq(organizations.type, "empresa"),
        eq(organizations.name, name),
      ),
    );
  if (found) {
    if (!found.phone || !found.cnpj) {
      await db
        .update(organizations)
        .set({ phone: found.phone ?? phone, cnpj: found.cnpj ?? cnpj })
        .where(eq(organizations.id, found.id));
    }
    return found.id;
  }
  const [created] = await db
    .insert(organizations)
    .values({ tenantId: TENANT_ID, type: "empresa", name, phone, cnpj, city, uf: "RS" })
    .returning({ id: organizations.id });
  return created.id;
}

process.exit(0);
