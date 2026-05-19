# Ford Vision — Entrega Cybersecurity

Projeto acadêmico com foco em segurança de aplicação web para um cenário de retenção inteligente em concessionárias. Esta entrega prioriza proteção de API, sessão, dados sensíveis e operação em produção.

> Não é um produto oficial da Ford Motor Company. Marcas e logotipos pertencem aos seus respectivos donos e são usados aqui apenas para demonstração.

## Visão da entrega

A solução foi estruturada para operar em produção com Next.js (App Router) e backend seguro em rotas server-side, incluindo autenticação com cookies HTTP-only, autorização por papel, validação rigorosa de entrada, proteção de tráfego, trilha de auditoria e persistência criptografada com PostgreSQL.

## Stack

- Next.js 14 + React 18 + TypeScript
- TailwindCSS + Framer Motion
- Recharts + Leaflet/React-Leaflet
- PostgreSQL (`pg`)
- Zod, jose, bcryptjs

## Rotas principais da aplicação

| Rota       | Finalidade |
|------------|------------|
| `/`        | Autenticação |
| `/app`     | App cliente |
| `/command` | Command Center |
| `/motor`   | Visão técnica do motor |
| `/sessions` | Sessões ativas |
| `/admin`   | Gestão de usuários |
| `/admin/audit` | Auditoria |
| `/reset`   | Recuperação de senha |

## Endpoints principais

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot`
- `POST /api/auth/reset`
- `GET /api/auth/csrf`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/session`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`
- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/anon`
- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/maintenance`
- `POST /api/maintenance`
- `GET /api/audit`
- `GET /api/admin/metrics`
- `POST /api/admin/retention/run`
- `GET /api/admin/security-policy`
- `POST /api/admin/security-policy`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`

## Configuração local

Pré-requisito: Node.js 18+.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3001`.

### Scripts

```bash
npm run build
npm run start
npm run lint
npm run db:migrate
npm run test
```

## Produção (Vercel + PostgreSQL)

1. Configure variáveis de ambiente com base no `.env.example`.
2. Defina `ALLOWED_ORIGINS` com o domínio do deploy.
3. Configure `APP_BASE_URL` com o domínio do deploy (usado no reset de senha).
4. Configure `DATABASE_URL` e `DATABASE_SSL`.
5. Configure SMTP (`SMTP_HOST/PORT/USER/PASS/FROM`) para envio de reset.
6. Execute migração SQL antes de abrir tráfego: `npm run db:migrate`.
7. Use `SEED_DEMO_USERS=false` em produção e crie acesso administrativo via variáveis de bootstrap.

## Participantes do grupo

- Bento Rangel - RM559124
- Eric Yuji - RM554869
- Higor Batista - RM558907
- Kaue Pires - RM554403
- Ricardo Di Tilia - RM555155

## Observações

As credenciais demo existem apenas em ambiente de desenvolvimento quando `SEED_DEMO_USERS=true`.
