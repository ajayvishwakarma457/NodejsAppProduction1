"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseRouter = void 0;
const express_1 = require("express");
const sse_controller_1 = require("../controllers/sse.controller");
const router = (0, express_1.Router)();
router.get('/stream', (req, res, next) => {
    try {
        (0, sse_controller_1.streamEvents)(req, res);
    }
    catch (err) {
        next(err);
    }
});
exports.sseRouter = router;
//# sourceMappingURL=sse.routes.js.map