# Mianatra Manisa

*Ao manisa lisany! Ray, roa … telo.*

Mianatra Manisa dia rindrambaiko tsotra hanisan-tena: mamorona tetikasa (« projects ») ianao, avy eo miditra isa isan'andro momba azy. Araho maso ny fandrosoanao, ampio na amboary ny isa, ary jereo ny lisitra voasivana araka ny daty.

## Teknolojia

- [Next.js 16](https://nextjs.org) (App Router) sy [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org) ary [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma 7](https://www.prisma.io) miaraka amin'ny [PostgreSQL](https://www.postgresql.org) (driver adapter `@prisma/adapter-pg`)
- Fanamarinana: JWT ([jose](https://github.com/panva/jose)) ao anaty cookie `session`, tenimiafina voahidy amin'ny bcrypt
- Mailaka tonga soa amin'ny [Resend](https://resend.com) rehefa misoratra anarana
- Fitsapana: [Vitest](https://vitest.dev) sy [Testcontainers](https://node.testcontainers.org)

## Fanombohana

### Zava-dranga ilaina

- Node.js
- PostgreSQL
- Docker (ilaina amin'ny fitsapana integration)

### Tontolo iainana

Adikao ny rakitra ohatra, avy eo fenoy ny soatoavina:

```bash
cp .env.example .env
```

| Variable | Fanazavana |
| --- | --- |
| `DATABASE_URL` | URL fifandraisana amin'ny PostgreSQL |
| `JWT_SECRET` | Lakile tsiambaratelona hanasoniarana ny JWT (ilaina indrindra) |
| `RESEND_SECRET_KEY` | Lakile Resend, ahafahana mandefa ny mailaka tonga soa |

### Database

Ampandehano ity baiko ity mba hamoronana ny tabilao araka ny `prisma/schema.prisma`:

```bash
npx prisma db push
```

### Mandefosa ny server

```bash
npm run dev
```

Sokafy [http://localhost:3000](http://localhost:3000) ao amin'ny navigateur. Hosoloina any amin'ny `/login` ianao raha tsy mbola tafiditra.

## Baiko

| Baiko | Asa |
| --- | --- |
| `npm run dev` | Server ho an'ny fampandrosoana |
| `npm run build` | Fanamboarana ny version production |
| `npm run start` | Andefaso ny version production |
| `npm run lint` | Fanamarinana amin'ny ESLint |
| `npm run test` | Fitsapana rehetra |
| `npm run test:unit` | Fitsapana unit (tsy mila database) |
| `npm run test:integration` | Fitsapana integration amin'ny database tena izy |

Fanamarihana: ny fitsapana integration mampiasa container `postgres:16-alpine` amin'ny [Testcontainers](https://node.testcontainers.org), ka mila Docker mandeha izy. Averina ny database alohan'ny fitsapana tsirairay.

## Fandaminana ny kaody

- `app/` — pejy sy routes (App Router): `app/(auth)/` ho an'ny fidirana, `app/(client)/` ho an'ny pejy voaaro, `app/api/` ho an'ny REST API
- `features/` — components client isaky ny domane (`auth`, `home`, `project`)
- `libs/` — serivisy amin'ny lafiny server (`users`, `projects`, `counts`), Prisma, JWT, cookie, validation, ary mpitatitra hadisoana iraisana
- `components/` — UI iraisana (dialog, field, banner, sns.)
- `prisma/` — schema sy client voahosika
- `tests/` — `unit-test/` (serivisy amin'ny mock) ary `integration-test/` (routes feno amin'ny database)
- `proxy.ts` — fanamarinana ny cookie `session` amin'ny fangatahana rehetra

### Fitantanana sesiny

Ny fidirana dia mifototra amin'ny JWT HS256 7 andro voatahiry ao anaty cookie `HttpOnly` anarana `session`. Ny `proxy.ts` manamarina azy isaky ny fangatahana:

- raha tsy voamarina ny fangatahana API → `401`
- raha tsy tafiditra ny mpampiasa ka mijery pejy → hosoloina any `/login`
- raha efa tafiditra izay mikajy `/login` na `/register` → haverina any amin'ny pejy feny

## API

Ny famaritana feno amin'ny [OpenAPI 3.0](https://spec.openapis.org/oas/latest.html) dia ao amin'ny [docs/api.yml](docs/api.yml): Auth (`register`, `login`, `logout`, `me`), Projects ary Counts.
