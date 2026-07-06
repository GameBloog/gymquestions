import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest"
import { app } from "../../src/app"
import {
  cleanDatabase,
  createTestAdmin,
  createTestProfessor,
  generateTestToken,
  prismaTest,
  teardownTestDatabase,
} from "../helpers/test-helpers"
import { UserRole } from "../../src/domain/entities/user"

describe("Storage Cleanup E2E", () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    await app.close()
  })

  it("lists pending cleanup items for ADMIN without exposing publicId", async () => {
    const admin = await createTestAdmin()
    const token = generateTestToken({
      userId: admin.id,
      email: admin.email,
      role: UserRole.ADMIN,
    })

    await prismaTest.pendingStorageDeletion.create({
      data: {
        resourceCategory: "STUDENT_DOCUMENT",
        resourceType: "RAW",
        publicId: "gym/private/secret-file",
        relatedRecordId: "arquivo-1",
        status: "PENDING",
      },
    })

    const response = await app.inject({
      method: "GET",
      url: "/storage-cleanup",
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain("gym/private/secret-file")
    const body = JSON.parse(response.body)
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      resourceCategory: "STUDENT_DOCUMENT",
      resourceType: "RAW",
      status: "PENDING",
      attemptCount: 0,
      relatedRecordId: "arquivo-1",
    })
    expect(body[0]).not.toHaveProperty("publicId")
  })

  it("rejects non-admin users", async () => {
    const { user } = await createTestProfessor()
    const token = generateTestToken({
      userId: user.id,
      email: user.email,
      role: UserRole.PROFESSOR,
    })

    const response = await app.inject({
      method: "GET",
      url: "/storage-cleanup",
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
  })
})
