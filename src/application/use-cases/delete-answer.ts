import { AppError } from "../../shared/errors/app-error"
import { UserAnswerRepository } from "../repositories/user-answer-repostiroy"

export class DeleteAnswerUseCase {
  constructor(private userAnswerRepository: UserAnswerRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.userAnswerRepository.findById(id)

    if (!exists) {
      throw new AppError("Reposta não encontrada", 404)
    }

    await this.userAnswerRepository.delete(id)
  }
}
