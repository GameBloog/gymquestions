import { UserAnswer } from "../../domain/entities/user-answer"
import { UserAnswerRepository } from "../repositories/user-answer-repostiroy"

export class GetAnswerUseCase {
  constructor(private userAnswerRepository: UserAnswerRepository) {}

  async execute(limit = 100): Promise<UserAnswer[]> {
    return await this.userAnswerRepository.findMany(limit)
  }
}
