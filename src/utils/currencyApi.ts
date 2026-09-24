import { ExchangeRatesData } from '../types';

/**
 * Fetches real-time exchange rates from public CORS-friendly APIs directly in the browser.
 * Falls back through multiple providers to ensure 100% availability on Vercel, Netlify,
 * or localhost without depending on a Node server backend.
 */
export async function fetchLiveExchangeRates(): Promise<ExchangeRatesData | null> {
  const publicEndpoints = [
    // Open Exchange Rates mirror (Free, high reliability, no API key required, full CORS support)
    'https://open.er-api.com/v6/latest/USD',
    // Exchangerate-api v4 fallback
    'https://api.exchangerate-api.com/v4/latest/USD',
    // Local server endpoint fallback if running full-stack
    '/api/rates?force=true',
  ];

  for (const url of publicEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      // Verify that response is truly JSON (prevent Vercel SPA html rewrites)
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || (!contentType.includes('application/json') && !contentType.includes('text/json'))) {
        continue;
      }

      const data = await res.json();
      const rates = data.rates || data.conversion_rates;

      if (rates && typeof rates.VND === 'number' && rates.VND > 0) {
        return {
          timestamp: Date.now(),
          date: new Date().toISOString().split('T')[0],
          base: data.base_code || data.base || 'USD',
          rates: rates,
          source: 'live_network',
        };
      }
    } catch {
      // Continue to next endpoint on timeout, CORS or network error
      continue;
    }
  }

  return null;
}
