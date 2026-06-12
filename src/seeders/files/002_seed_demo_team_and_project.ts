import { Seeder } from '../seeder.types';
import { UserModel } from '../../modules/users/user.model';
import { TeamModel } from '../../modules/teams/team.model';
import { ProjectModel } from '../../modules/projects/project.model';
import { TaskModel } from '../../modules/tasks/task.model';
import { logger } from '../../config/logger';

/**
 * Seeds a demo team, project, and tasks for local development.
 * Only runs in development and test environments.
 */
const seeder: Seeder = {
  name: '002_seed_demo_team_and_project',
  description: 'Create demo team, project, and tasks',
  environments: ['development', 'test'],
  idempotent: true,
  async run({ environment }) {
    const ownerEmail = `demo.owner@${environment}.local`;
    const memberEmail = `demo.member@${environment}.local`;

    let owner = await UserModel.findOne({ email: ownerEmail }).lean();
    if (!owner) {
      owner = await UserModel.create({
        firstName: 'Demo',
        lastName: 'Owner',
        email: ownerEmail,
        password: 'Demo@123456',
        role: 'manager',
        isVerified: true,
        provider: 'local',
      });
      logger.info(`Created demo owner: ${ownerEmail}`);
    }

    let member = await UserModel.findOne({ email: memberEmail }).lean();
    if (!member) {
      member = await UserModel.create({
        firstName: 'Demo',
        lastName: 'Member',
        email: memberEmail,
        password: 'Demo@123456',
        role: 'member',
        isVerified: true,
        provider: 'local',
      });
      logger.info(`Created demo member: ${memberEmail}`);
    }

    const ownerId = owner._id.toString();
    const memberId = member._id.toString();

    let team = await TeamModel.findOne({ name: 'Demo Team' }).lean();
    if (!team) {
      team = await TeamModel.create({
        name: 'Demo Team',
        description: 'A demo team for local development and testing.',
        ownerId,
        members: [{ userId: memberId, role: 'member', joinedAt: new Date() }],
      });
      logger.info('Created demo team: Demo Team');
    }

    let project = await ProjectModel.findOne({ name: 'Demo Project' }).lean();
    if (!project) {
      project = await ProjectModel.create({
        name: 'Demo Project',
        description: 'A demo project to explore the API.',
        status: 'active',
        ownerId,
        teamId: team._id.toString(),
        startDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      logger.info('Created demo project: Demo Project');
    }

    const existingTasks = await TaskModel.countDocuments({ projectId: project._id.toString() });
    if (existingTasks === 0) {
      const now = new Date();
      const projectId = project._id.toString();

      await TaskModel.insertMany([
        {
          title: 'Explore the API',
          description: 'Review the API documentation and try the endpoints.',
          priority: 'medium',
          status: 'todo',
          projectId,
          createdBy: ownerId,
          assignedTo: memberId,
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          estimatedHours: 4,
          actualHours: 0,
        },
        {
          title: 'Set up local environment',
          description: 'Install dependencies and configure environment variables.',
          priority: 'high',
          status: 'in-progress',
          projectId,
          createdBy: ownerId,
          assignedTo: ownerId,
          dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          estimatedHours: 2,
          actualHours: 1,
        },
        {
          title: 'Write integration tests',
          description: 'Add tests for the team and project modules.',
          priority: 'critical',
          status: 'todo',
          projectId,
          createdBy: ownerId,
          assignedTo: memberId,
          dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          estimatedHours: 8,
          actualHours: 0,
        },
      ]);

      logger.info('Created demo tasks');
    } else {
      logger.info('Demo tasks already exist');
    }
  },
};

export default seeder;
