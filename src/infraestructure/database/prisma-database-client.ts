import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"

export type PrismaDatabaseClient = typeof prisma | Prisma.TransactionClient
