// Export all server-side route handlers
export * from './routes';

// Re-export client and utilities for server-side use
export { createFatZebraClient, FatZebraClient, FatZebraError, handleFatZebraResponse } from '../lib/client';
export * from '../types';
export * from '../utils';