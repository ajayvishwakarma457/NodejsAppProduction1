import { commentRepository } from "./comment.repository";

export const commentService = {
  async list() {
    return commentRepository.findAll();
  }
};

