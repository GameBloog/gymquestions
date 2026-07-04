ALTER TABLE "aluno_historico"
  ALTER COLUMN "cinturaCm" TYPE DOUBLE PRECISION USING "cinturaCm"::double precision,
  ALTER COLUMN "quadrilCm" TYPE DOUBLE PRECISION USING "quadrilCm"::double precision,
  ALTER COLUMN "pescocoCm" TYPE DOUBLE PRECISION USING "pescocoCm"::double precision;
