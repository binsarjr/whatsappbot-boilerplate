/**
 *  Sort an object by value ascending
 * @param sortable
 * @returns sortable.sort()
 */
export const sortableObjectAsc = (sortable: object) =>
    Object.fromEntries(Object.entries(sortable).sort(([, a], [, b]) => a - b))

/**
 *  Sort an object by value descending
 * @param sortable
 * @returns sortable.sort()
 */
export const sortableObjectDesc = (sortable: object) =>
    Object.fromEntries(Object.entries(sortable).sort(([, a], [, b]) => b - a))
