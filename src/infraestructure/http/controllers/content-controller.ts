import { FastifyReply, FastifyRequest } from "fastify"
import { YoutubeContentService } from "@/application/use-cases/content/youtube-content-service"

const service = new YoutubeContentService()

export class ContentController {
  async latestYoutubeVideo(_request: FastifyRequest, reply: FastifyReply) {
    const payload = await service.getLatestVideo()
    return reply.send(payload)
  }
}
