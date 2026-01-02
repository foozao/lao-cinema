/**
 * Payment Providers Index
 * 
 * Export all available payment providers and a registry for provider lookup.
 */

import type { PaymentProvider } from '../types.js';
import { FreeProvider } from './free.js';
import { ManualProvider } from './manual.js';
import { BCELProvider } from './bcel.js';

// Provider instances
export const freeProvider = new FreeProvider();
export const manualProvider = new ManualProvider();
export const bcelProvider = new BCELProvider();

// All available providers
export const providers: PaymentProvider[] = [
  freeProvider,
  bcelProvider,
  manualProvider,
];

/**
 * Get a provider by name
 */
export function getProvider(name: string): PaymentProvider | undefined {
  return providers.find(p => p.name === name);
}

/**
 * Get the best available provider for a payment
 */
export function getAvailableProvider(amountLak: number): PaymentProvider | undefined {
  // For free payments, use the free provider
  if (amountLak === 0) {
    return freeProvider;
  }
  
  // For paid transactions, prefer BCEL if available
  if (bcelProvider.isAvailable()) {
    return bcelProvider;
  }
  
  // Fall back to manual confirmation
  return manualProvider;
}

/**
 * List all providers with their availability status
 */
export function listProviders(): Array<{ name: string; displayName: string; available: boolean }> {
  return providers.map(p => ({
    name: p.name,
    displayName: p.displayName,
    available: p.isAvailable(),
  }));
}

export { FreeProvider, ManualProvider, BCELProvider };
