export const createId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
