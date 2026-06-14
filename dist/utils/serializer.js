"use strict";
/**
 * Document serializer.
 *
 * Mongoose `.lean()` results and documents without a custom `toJSON` transform
 * expose `_id`. API consumers expect `id`, so these helpers normalize responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeDocuments = exports.serializeDocument = void 0;
const serializeDocument = (doc) => {
    if (!doc)
        return null;
    // Mongoose documents need to be converted to plain objects before destructuring
    // so that virtuals and getters are captured. Lean results are already plain.
    const plain = typeof doc.toObject === 'function'
        ? doc.toObject()
        : doc;
    const { _id, ...rest } = plain;
    return {
        id: String(_id),
        ...rest,
    };
};
exports.serializeDocument = serializeDocument;
const serializeDocuments = (docs) => {
    return docs.map((doc) => (0, exports.serializeDocument)(doc));
};
exports.serializeDocuments = serializeDocuments;
//# sourceMappingURL=serializer.js.map