import { UserAnswer } from "../../domain/entities/user-answer"
import { AppError } from "../../shared/errors/app-error"
import { UserAnswerRepository } from "../repositories/user-answer-repostiroy"

export class GetAnswerByIdUseCase {
  constructor(private userAnswerRepository: UserAnswerRepository) {}

  async execute(id: string): Promise<UserAnswer> {
    const answer = await this.userAnswerRepository.findById(id)

    if (!answer) {
      throw new AppError("Resposta não encontrada", 404)
    }

    return answer
  }
}
