"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_model_1 = require("./user.model");
exports.userRepository = {
    async findAll() {
        return user_model_1.UserModel.find().lean();
    }
};
