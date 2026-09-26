import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage();

export const getTenantPool = () => tenantContext.getStore()?.pool ?? null;

export const runWithTenantPool = (pool, callback) => tenantContext.run({ pool }, callback);
