/**
 * Document serializer.
 *
 * Mongoose `.lean()` results and documents without a custom `toJSON` transform
 * expose `_id`. API consumers expect `id`, so these helpers normalize responses.
 */

export const serializeDocument = (
  doc: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!doc) return null;

  // Mongoose documents need to be converted to plain objects before destructuring
  // so that virtuals and getters are captured. Lean results are already plain.
  const plain =
    typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
      ? (doc as { toObject: () => Record<string, unknown> }).toObject()
      : (doc as Record<string, unknown>);

  const { _id, ...rest } = plain;
  return {
    id: String(_id),
    ...rest,
  };
};

export const serializeDocuments = (docs: Record<string, unknown>[]): Record<string, unknown>[] => {
  return docs.map((doc) => serializeDocument(doc)!);
};
