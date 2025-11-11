export class CreateAnswerUseCase{
  constructor(private userAnswerRepository: UserAnswerRepository){}

  async execute(data: CreateAnswerInput): Promise<UserAnswer> {
    return await this.userAnswerRepository.create(data)
  }
}