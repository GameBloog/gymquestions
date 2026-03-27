# Modulos Novos Do Backend

Use `src/modules/` para novas features orientadas a dominio.

## Estrutura Base

```text
src/modules/<bounded-context>/
  domain/
  application/
  infrastructure/
```

## Regra Pratica

- `domain`: regra pura e invariantes.
- `application`: casos de uso e portas.
- `infrastructure`: Fastify, Prisma e adapters.
- comece simples e crie subpastas so quando a feature realmente precisar.

O legado fora de `src/modules/` continua valido. Nao migre tudo de uma vez.
