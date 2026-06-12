"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainAggregate = exports.paginatedAggregate = exports.timedAggregate = exports.buildDateGroupStage = exports.buildFacetPagination = exports.sanitizePipeline = exports.SLOW_AGGREGATE_THRESHOLD_MS = exports.DEFAULT_AGGREGATE_TIMEOUT_MS = void 0;
const logger_1 = require("../config/logger");
exports.DEFAULT_AGGREGATE_TIMEOUT_MS = 5000;
exports.SLOW_AGGREGATE_THRESHOLD_MS = 300;
const FORBIDDEN_STAGES = new Set(['$out', '$merge']);
/**
 * Prevent write-stage aggregation pipelines from being executed accidentally.
 * Production aggregations should be read-only.
 */
const sanitizePipeline = (pipeline) => {
    for (const stage of pipeline) {
        const key = Object.keys(stage)[0];
        if (FORBIDDEN_STAGES.has(key)) {
            throw new Error(`Forbidden aggregation stage: ${key}`);
        }
    }
    return pipeline;
};
exports.sanitizePipeline = sanitizePipeline;
/**
 * Build a $facet stage for paginated aggregations.
 */
const buildFacetPagination = (page = 1, limit = 10, dataStageName = 'data', totalStageName = 'total') => ({
    $facet: {
        [dataStageName]: [{ $skip: Math.max(0, (page - 1) * limit) }, { $limit: Math.max(1, limit) }],
        [totalStageName]: [{ $count: 'count' }],
    },
});
exports.buildFacetPagination = buildFacetPagination;
/**
 * Build a date-truncation group stage for time-series rollups.
 */
const buildDateGroupStage = (options) => {
    const { field, granularity = 'day', outputField = '_id' } = options;
    const dateToStringFormat = {
        day: '%Y-%m-%d',
        week: '%Y-W%V',
        month: '%Y-%m',
        year: '%Y',
    };
    return {
        $group: {
            _id: {
                [outputField]: {
                    $dateToString: { format: dateToStringFormat[granularity], date: `$${field}` },
                },
            },
            count: { $sum: 1 },
        },
    };
};
exports.buildDateGroupStage = buildDateGroupStage;
const timedAggregate = async (model, pipeline, options = {}) => {
    const { maxTimeMS = exports.DEFAULT_AGGREGATE_TIMEOUT_MS, allowDiskUse = true, session } = options;
    (0, exports.sanitizePipeline)(pipeline);
    const start = Date.now();
    const collection = model.collection.collectionName;
    try {
        let aggregate = model.aggregate(pipeline).option({ maxTimeMS, allowDiskUse });
        if (session) {
            aggregate = aggregate.session(session);
        }
        const result = (await aggregate.exec());
        const durationMs = Date.now() - start;
        if (durationMs >= exports.SLOW_AGGREGATE_THRESHOLD_MS) {
            logger_1.logger.warn('Slow aggregation detected', {
                collection,
                operation: options.operation ?? 'aggregate',
                durationMs,
                stages: pipeline.length,
                thresholdMs: exports.SLOW_AGGREGATE_THRESHOLD_MS,
            });
        }
        return result;
    }
    catch (error) {
        const durationMs = Date.now() - start;
        logger_1.logger.error('Aggregation failed', {
            collection,
            operation: options.operation ?? 'aggregate',
            durationMs,
            stages: pipeline.length,
            error,
        });
        throw error;
    }
};
exports.timedAggregate = timedAggregate;
/**
 * Run a paginated aggregation using $facet and return `{ data, total }`.
 */
const paginatedAggregate = async (model, pipeline, options = {}) => {
    const { page = 1, limit = 10, ...aggregateOptions } = options;
    const facetStage = (0, exports.buildFacetPagination)(page, limit);
    const result = await (0, exports.timedAggregate)(model, [...pipeline, facetStage], aggregateOptions);
    const first = result[0] ?? {};
    const data = (first.data ?? []);
    const total = first.total?.[0]?.count ?? 0;
    return { data, total };
};
exports.paginatedAggregate = paginatedAggregate;
/**
 * Explain an aggregation pipeline without executing the data path.
 * Useful for index tuning in development/staging.
 */
const explainAggregate = async (model, pipeline, options = {}) => {
    const { maxTimeMS = exports.DEFAULT_AGGREGATE_TIMEOUT_MS, allowDiskUse = true, session } = options;
    (0, exports.sanitizePipeline)(pipeline);
    let aggregate = model.aggregate(pipeline).option({ maxTimeMS, allowDiskUse });
    if (session) {
        aggregate = aggregate.session(session);
    }
    return aggregate.explain('executionStats');
};
exports.explainAggregate = explainAggregate;
//# sourceMappingURL=aggregation.js.map