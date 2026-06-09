export interface ProjectModel {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "archived";
  ownerId: string;
  teamId: string;
  startDate?: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

