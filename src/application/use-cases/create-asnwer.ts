import { CreateUserAnswerInput, UserAnswer } from "../../domain/entities/user-answer";
import { UserAnswerRepository } from "../repositories/user-answer-repostiroy";

export class CreateAnswerUseCase{
  constructor(private userAnswerRepository: UserAnswerRepository){}

  async execute(data: CreateUserAnswerInput): Promise<UserAnswer> {
    return await this.userAnswerRepository.create(data)
  }
}