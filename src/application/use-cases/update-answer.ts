import {
  UpdateUserAnswerInput,
  UserAnswer,
} from "../../domain/entities/user-answer"
import { AppError } from "../../shared/errors/app-error"
import { UserAnswerRepository } from "../repositories/user-answer-repostiroy"

export class UpdateAnswerUseCase {
  constructor(private userAnswerRepository: UserAnswerRepository) {}

  async execute(id: string, data: UpdateUserAnswerInput): Promise<UserAnswer> {
    const exists = await this.userAnswerRepository.findById(id)

    if (!exists) {
      throw new AppError("Resposta não encontrada", 404)
    }

    return await this.userAnswerRepository.update(id, data)
  }
}
