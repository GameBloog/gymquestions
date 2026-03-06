CREATE TYPE "GrupamentoMuscular" AS ENUM (
  'PEITO',
  'COSTAS',
  'PERNAS',
  'OMBRO',
  'BICEPS',
  'TRICEPS',
  'ABDOMEN',
  'GLUTEOS',
  'CARDIO',
  'OUTRO'
);

CREATE TYPE "OrigemExercicio" AS ENUM ('SISTEMA', 'EXTERNO', 'PROFESSOR');

CREATE TYPE "CheckinStatus" AS ENUM ('INICIADO', 'CONCLUIDO');

CREATE TABLE "exercicios" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "grupamentoMuscular" "GrupamentoMuscular" NOT NULL,
  "origem" "OrigemExercicio" NOT NULL DEFAULT 'PROFESSOR',
  "externalId" TEXT,
  "externalSource" TEXT,
  "professorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "exercicios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exercicios_nome_idx" ON "exercicios"("nome");
CREATE INDEX "exercicios_professorId_idx" ON "exercicios"("professorId");
CREATE UNIQUE INDEX "exercicios_origem_externalSource_externalId_key"
  ON "exercicios"("origem", "externalSource", "externalId");

CREATE TABLE "planos_treino" (
  "id" TEXT NOT NULL,
  "alunoId" TEXT NOT NULL,
  "professorId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "observacoes" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "planos_treino_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "planos_treino_alunoId_ativo_idx" ON "planos_treino"("alunoId", "ativo");

CREATE TABLE "treino_dias" (
  "id" TEXT NOT NULL,
  "planoTreinoId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL,
  "diaSemana" INTEGER,
  "observacoes" TEXT,
  "metodo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "treino_dias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "treino_dias_planoTreinoId_ordem_key" ON "treino_dias"("planoTreinoId", "ordem");

CREATE TABLE "treino_dia_exercicios" (
  "id" TEXT NOT NULL,
  "treinoDiaId" TEXT NOT NULL,
  "exercicioId" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL,
  "series" INTEGER,
  "repeticoes" TEXT,
  "cargaSugerida" DOUBLE PRECISION,
  "observacoes" TEXT,
  "metodo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "treino_dia_exercicios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "treino_dia_exercicios_treinoDiaId_ordem_key"
  ON "treino_dia_exercicios"("treinoDiaId", "ordem");

CREATE TABLE "treino_checkins" (
  "id" TEXT NOT NULL,
  "alunoId" TEXT NOT NULL,
  "professorId" TEXT NOT NULL,
  "planoTreinoId" TEXT NOT NULL,
  "treinoDiaId" TEXT NOT NULL,
  "status" "CheckinStatus" NOT NULL DEFAULT 'INICIADO',
  "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizadoEm" TIMESTAMP(3),
  "dataTreino" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comentarioAluno" TEXT,
  "comentarioProfessor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "treino_checkins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "treino_checkins_alunoId_dataTreino_idx" ON "treino_checkins"("alunoId", "dataTreino");
CREATE INDEX "treino_checkins_treinoDiaId_status_idx" ON "treino_checkins"("treinoDiaId", "status");

CREATE TABLE "treino_exercicio_checkins" (
  "id" TEXT NOT NULL,
  "checkinId" TEXT NOT NULL,
  "treinoDiaExercicioId" TEXT NOT NULL,
  "exercicioId" TEXT NOT NULL,
  "concluido" BOOLEAN NOT NULL DEFAULT false,
  "cargaReal" DOUBLE PRECISION,
  "repeticoesReal" TEXT,
  "comentarioAluno" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "treino_exercicio_checkins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "treino_exercicio_checkins_checkinId_treinoDiaExercicioId_key"
  ON "treino_exercicio_checkins"("checkinId", "treinoDiaExercicioId");
CREATE INDEX "treino_exercicio_checkins_exercicioId_createdAt_idx"
  ON "treino_exercicio_checkins"("exercicioId", "createdAt");

ALTER TABLE "exercicios"
  ADD CONSTRAINT "exercicios_professorId_fkey"
  FOREIGN KEY ("professorId") REFERENCES "professores"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "planos_treino"
  ADD CONSTRAINT "planos_treino_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planos_treino"
  ADD CONSTRAINT "planos_treino_professorId_fkey"
  FOREIGN KEY ("professorId") REFERENCES "professores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_dias"
  ADD CONSTRAINT "treino_dias_planoTreinoId_fkey"
  FOREIGN KEY ("planoTreinoId") REFERENCES "planos_treino"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_dia_exercicios"
  ADD CONSTRAINT "treino_dia_exercicios_treinoDiaId_fkey"
  FOREIGN KEY ("treinoDiaId") REFERENCES "treino_dias"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_dia_exercicios"
  ADD CONSTRAINT "treino_dia_exercicios_exercicioId_fkey"
  FOREIGN KEY ("exercicioId") REFERENCES "exercicios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_checkins"
  ADD CONSTRAINT "treino_checkins_alunoId_fkey"
  FOREIGN KEY ("alunoId") REFERENCES "alunos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_checkins"
  ADD CONSTRAINT "treino_checkins_professorId_fkey"
  FOREIGN KEY ("professorId") REFERENCES "professores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_checkins"
  ADD CONSTRAINT "treino_checkins_planoTreinoId_fkey"
  FOREIGN KEY ("planoTreinoId") REFERENCES "planos_treino"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_checkins"
  ADD CONSTRAINT "treino_checkins_treinoDiaId_fkey"
  FOREIGN KEY ("treinoDiaId") REFERENCES "treino_dias"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_exercicio_checkins"
  ADD CONSTRAINT "treino_exercicio_checkins_checkinId_fkey"
  FOREIGN KEY ("checkinId") REFERENCES "treino_checkins"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_exercicio_checkins"
  ADD CONSTRAINT "treino_exercicio_checkins_treinoDiaExercicioId_fkey"
  FOREIGN KEY ("treinoDiaExercicioId") REFERENCES "treino_dia_exercicios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "treino_exercicio_checkins"
  ADD CONSTRAINT "treino_exercicio_checkins_exercicioId_fkey"
  FOREIGN KEY ("exercicioId") REFERENCES "exercicios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
