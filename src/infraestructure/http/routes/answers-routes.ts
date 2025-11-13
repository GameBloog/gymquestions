import { FastifyInstance } from "fastify";
import { AnswerController } from "../controllers/answers-controller";

const controller = new AnswerController()

export async function answersRoutes(app: FastifyInstance) {
  app.post("/answers", controller.create.bind(controller))
  app.get("/answers", controller.list.bind(controller))
  app.get("/answers/:id", controller.getById.bind(controller))
  app.put("/answers/:id", controller.update.bind(controller))
  app.delete("/answers/:id", controller.delete.bind(controller))
}