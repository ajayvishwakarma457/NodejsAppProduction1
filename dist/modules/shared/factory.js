"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCrudModule = void 0;
const express_1 = require("express");
const createCrudModule = (name) => {
    const collection = [];
    const repository = {
        async findAll() {
            return collection;
        }
    };
    const service = {
        async list() {
            return repository.findAll();
        }
    };
    const controller = {
        async list(_req, res) {
            const items = await service.list();
            res.json({ success: true, module: name, data: items });
        }
    };
    const router = (0, express_1.Router)();
    router.get("/", (req, res, next) => {
        void controller.list(req, res).catch(next);
    });
    return {
        repository,
        service,
        controller,
        router
    };
};
exports.createCrudModule = createCrudModule;
