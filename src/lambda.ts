import awsLambdaFastify from "@fastify/aws-lambda"
import { app } from "./app"

/**
 * Entrypoint HTTP da AWS Lambda.
 *
 * O `app` é o mesmo objeto Fastify usado pelo `server.ts` — a diferença é que
 * aqui ninguém chama `listen()`. O adapter converte o evento do API Gateway em
 * uma request injetada no Fastify e devolve a resposta no formato que a Lambda
 * espera.
 *
 * `binaryMimeTypes` fica vazio de propósito: esta API responde só JSON. Arquivos
 * são entregues por URL assinada do Cloudinary, nunca pelo corpo da resposta.
 *
 * `callbackWaitsForEmptyEventLoop: false` impede que a invocação fique pendurada
 * esperando o event loop esvaziar — o pool de conexões do Prisma mantém sockets
 * abertos de propósito entre invocações, para reaproveitar em containers quentes.
 */
export const handler = awsLambdaFastify(app, {
  callbackWaitsForEmptyEventLoop: false,
})

export default handler
