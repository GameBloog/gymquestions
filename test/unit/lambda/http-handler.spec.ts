import { describe, expect, it } from "vitest"
import { handler } from "../../../src/lambda"

const apiGatewayV2Event = {
  version: "2.0",
  routeKey: "GET /health",
  rawPath: "/health",
  rawQueryString: "",
  headers: {
    "content-length": "0",
    host: "api-dev.gforcecoach.com",
    "user-agent": "vitest",
  },
  requestContext: {
    accountId: "605618941761",
    apiId: "test-api",
    domainName: "api-dev.gforcecoach.com",
    http: {
      method: "GET",
      path: "/health",
      protocol: "HTTP/1.1",
      sourceIp: "203.0.113.10",
      userAgent: "vitest",
    },
    requestId: "test-request-id",
    routeKey: "GET /health",
    stage: "$default",
    time: "31/Jul/2026:12:00:00 +0000",
    timeEpoch: 1785456000000,
  },
  isBase64Encoded: false,
}

const lambdaContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: "gforce-api-dev-api",
  functionVersion: "$LATEST",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-2:605618941761:function:gforce-api-dev-api",
  memoryLimitInMB: "1024",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/gforce-api-dev-api",
  logStreamName: "test-stream",
  getRemainingTimeInMillis: () => 29000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
}

describe("handler HTTP da Lambda", () => {
  it("responde /health igual ao servidor HTTP", async () => {
    const response = await handler(
      apiGatewayV2Event as never,
      lambdaContext as never,
    )

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body as string)).toMatchObject({ status: "ok" })
  })

  it("devolve 404 em rota inexistente", async () => {
    const response = await handler(
      {
        ...apiGatewayV2Event,
        rawPath: "/rota-que-nao-existe",
        routeKey: "GET /rota-que-nao-existe",
        requestContext: {
          ...apiGatewayV2Event.requestContext,
          http: {
            ...apiGatewayV2Event.requestContext.http,
            path: "/rota-que-nao-existe",
          },
        },
      } as never,
      lambdaContext as never,
    )

    expect(response.statusCode).toBe(404)
  })

  it("não altera o callbackWaitsForEmptyEventLoop do contexto recebido", async () => {
    const context = { ...lambdaContext, callbackWaitsForEmptyEventLoop: true }
    expect(context.callbackWaitsForEmptyEventLoop).toBe(true)

    await handler(apiGatewayV2Event as never, context as never)

    expect(context.callbackWaitsForEmptyEventLoop).toBe(false)
  })
})
