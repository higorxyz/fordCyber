# Ford Vision - Entrega Cybersecurity

Projeto acadêmico desenvolvido para a disciplina de Cybersecurity, com foco em proteção de APIs, autenticação segura, controle de acesso por papéis, privacidade de dados e auditoria de eventos.

> Este projeto não é um produto oficial da Ford Motor Company. Marcas e logotipos são usados apenas para fins educacionais.

## Objetivo desta entrega

A entrega prioriza requisitos de segurança ponta a ponta em um cenário de concessionária:

- validação rigorosa de entrada
- autenticação com JWT e cookies HTTP-only
- autorização por papel (usuario, analista, admin)
- proteção contra abuso com rate limit
- trilha de auditoria com logs estruturados
- criptografia de dados sensíveis em repouso

## Tecnologias utilizadas

- Next.js 16 (App Router), React 18 e TypeScript
- TailwindCSS e Framer Motion
- Recharts e Leaflet
- PostgreSQL (`pg`)
- Zod, jose e bcryptjs

## Rotas principais

| Rota | Finalidade |
|------|------------|
| `/` | Login e autenticação |
| `/app` | Visão do cliente |
| `/command` | Command Center |
| `/motor` | Visão técnica do motor |
| `/sessions` | Gestão de sessões ativas |
| `/admin` | Gestão administrativa |
| `/admin/audit` | Auditoria de eventos |
| `/reset` | Redefinição de senha |

## API (resumo)

### Autenticação e sessão

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

### Domínio de negócio

- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/anon`
- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/maintenance`
- `POST /api/maintenance`

### Auditoria e administração

- `GET /api/audit`
- `GET /api/admin/metrics`
- `POST /api/admin/retention/run`
- `GET /api/admin/security-policy`
- `POST /api/admin/security-policy`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`

## Como rodar localmente

Pré-requisito: Node.js 18+.

```bash
npm install
npm run dev
```

A aplicação sobe em: `http://localhost:3001`

### Scripts úteis

```bash
npm run build
npm run start
npm run lint
npm run db:migrate
npm run test
```

## Acesso para avaliação

Para facilitar os testes do sistema, existem usuários de demonstração com usuário e senha iguais:

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Admin | `admin` | `admin` |
| Analista | `analista` | `analista` |
| Cliente | `cliente` | `cliente` |

Observação: os usuários de teste devem ser usados apenas para avaliação/homologação.

## Deploy em produção (Vercel + PostgreSQL)

1. Configure variáveis de ambiente com base no `.env.example`.
2. Defina `ALLOWED_ORIGINS` com o domínio oficial do deploy.
3. Configure `APP_BASE_URL` com a URL pública (usada no reset de senha).
4. Configure `DATABASE_URL`, `DATABASE_SSL` e parâmetros de certificado.
5. Configure SMTP (`SMTP_HOST/PORT/USER/PASS/FROM`) para envio de e-mails.
6. Rode as migrações antes de abrir tráfego: `npm run db:migrate`.
7. Em produção, mantenha `SEED_DEMO_USERS=false`.

## Integrantes

- Bento Rangel - RM559124
- Eric Yuji - RM554869
- Higor Batista - RM558907
- Kaue Pires - RM554403
- Ricardo Di Tilia - RM555155
