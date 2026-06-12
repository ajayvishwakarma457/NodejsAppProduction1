"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../modules/users/user.model");
const team_model_1 = require("../../modules/teams/team.model");
const project_model_1 = require("../../modules/projects/project.model");
const task_model_1 = require("../../modules/tasks/task.model");
const logger_1 = require("../../config/logger");
/**
 * Seeds a demo team, project, and tasks for local development.
 * Only runs in development and test environments.
 */
const seeder = {
    name: '002_seed_demo_team_and_project',
    description: 'Create demo team, project, and tasks',
    environments: ['development', 'test'],
    idempotent: true,
    async run({ environment }) {
        const ownerEmail = `demo.owner@${environment}.local`;
        const memberEmail = `demo.member@${environment}.local`;
        let owner = await user_model_1.UserModel.findOne({ email: ownerEmail }).lean();
        if (!owner) {
            owner = await user_model_1.UserModel.create({
                firstName: 'Demo',
                lastName: 'Owner',
                email: ownerEmail,
                password: 'Demo@123456',
                role: 'manager',
                isVerified: true,
                provider: 'local',
            });
            logger_1.logger.info(`Created demo owner: ${ownerEmail}`);
        }
        let member = await user_model_1.UserModel.findOne({ email: memberEmail }).lean();
        if (!member) {
            member = await user_model_1.UserModel.create({
                firstName: 'Demo',
                lastName: 'Member',
                email: memberEmail,
                password: 'Demo@123456',
                role: 'member',
                isVerified: true,
                provider: 'local',
            });
            logger_1.logger.info(`Created demo member: ${memberEmail}`);
        }
        const ownerId = owner._id.toString();
        const memberId = member._id.toString();
        let team = await team_model_1.TeamModel.findOne({ name: 'Demo Team' }).lean();
        if (!team) {
            team = await team_model_1.TeamModel.create({
                name: 'Demo Team',
                description: 'A demo team for local development and testing.',
                ownerId,
                members: [{ userId: memberId, role: 'member', joinedAt: new Date() }],
            });
            logger_1.logger.info('Created demo team: Demo Team');
        }
        let project = await project_model_1.ProjectModel.findOne({ name: 'Demo Project' }).lean();
        if (!project) {
            project = await project_model_1.ProjectModel.create({
                name: 'Demo Project',
                description: 'A demo project to explore the API.',
                status: 'active',
                ownerId,
                teamId: team._id.toString(),
                startDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
            logger_1.logger.info('Created demo project: Demo Project');
        }
        const existingTasks = await task_model_1.TaskModel.countDocuments({ projectId: project._id.toString() });
        if (existingTasks === 0) {
            const now = new Date();
            const projectId = project._id.toString();
            await task_model_1.TaskModel.insertMany([
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
            logger_1.logger.info('Created demo tasks');
        }
        else {
            logger_1.logger.info('Demo tasks already exist');
        }
    },
};
exports.default = seeder;
//# sourceMappingURL=002_seed_demo_team_and_project.js.map