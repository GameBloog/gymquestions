import {
  CreateUserAnswerInput,
  UpdateUserAnswerInput,
  UserAnswer,
} from "../../domain/entities/user-answer"

export interface UserAnswerRepository {
  create(data: CreateUserAnswerInput): Promise<UserAnswer>
  findMany(limit?: number): Promise<UserAnswer[]>
  findById(id: string): Promise<UserAnswer | null>
  update(id: string, data: UpdateUserAnswerInput): Promise<UserAnswer>
  delete(id: string): Promise<void>
}
