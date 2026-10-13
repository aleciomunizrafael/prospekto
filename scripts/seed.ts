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
import { db } from "../src/lib/db";
import {
  activities,
  culturalProjects,
  leads,
  organizations,
  prospectingItems,
  prospectingLists,
  tenants,
  users as usersTable,
} from "../src/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

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

// Dados de demonstração da estrutura do CRM (ADR-004; plano, Fundação): uma lista de prospecção
// com seis empresas fictícias, três tarefas e telefone em duas organizações. Roda por padrão fora
// de ambiente implantado (SEED_DEMO=0 desliga) e só com SEED_DEMO=1 em produção. Idempotente pelo
// nome da lista. Nomes, telefones (+5554900000001 a 06) e e-mail (@example.test) são fictícios.
const seedDemo = process.env.SEED_DEMO === "1" || (process.env.SEED_DEMO !== "0" && !isDeployed);
if (seedDemo) {
  const DEMO_LIST = "Vinícolas do Vale";
  const [existingList] = await db
    .select({ id: prospectingLists.id })
    .from(prospectingLists)
    .where(and(eq(prospectingLists.tenantId, TENANT_ID), eq(prospectingLists.name, DEMO_LIST)));
  if (existingList) {
    console.log(`dados de demonstração já existem, pulados: ${DEMO_LIST}`);
  } else {
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

    // Organizações da demonstração com o telefone da empresa (ADR-004, 6.4.7).
    async function ensureCompany(name: string, phone: string, city: string) {
      const [found] = await db
        .select({ id: organizations.id, phone: organizations.phone })
        .from(organizations)
        .where(
          and(
            eq(organizations.tenantId, TENANT_ID),
            eq(organizations.type, "empresa"),
            eq(organizations.name, name),
          ),
        );
      if (found) {
        if (!found.phone) {
          await db.update(organizations).set({ phone }).where(eq(organizations.id, found.id));
        }
        return found.id;
      }
      const [created] = await db
        .insert(organizations)
        .values({ tenantId: TENANT_ID, type: "empresa", name, phone, city, uf: "RS" })
        .returning({ id: organizations.id });
      return created.id;
    }
    const vinicolaId = await ensureCompany("Vinícola Exemplo", "+5554900000001", "Bento Gonçalves");
    await ensureCompany("Metalúrgica Modelo", "+5554900000002", "Caxias do Sul");

    // Lead PJ fictício ligado à vinícola (para a tarefa em andamento ter vínculo).
    const leadEmail = "rodrigo.exemplo@example.test";
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
        subject: "Preparar o roteiro de ligações da semana",
        priority: "alta",
        position: basePosition + 1,
        dueAt: new Date(now.getTime() + day),
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      },
      {
        tenantId: TENANT_ID,
        type: "tarefa",
        subject: "Enviar proposta de patrocínio",
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
        subject: "Confirmar a reunião de diagnóstico",
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
}

process.exit(0);
