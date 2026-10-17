import type { Asset, StockPage, StockPhoto, StockProviders } from '@/types/api'
import { http } from './client'

export interface StockSearchOptions {
  /** A provider name or `all`; the server picks the first provider when it is left out. */
  provider?: string
  /** The UI language, for providers that search in it. */
  lang?: string
  perPage?: number
  signal?: AbortSignal
}

export const stockApi = {
  providers: () => http.get<StockProviders>('/stock/providers/'),
  /** `page` is a page number, or the cursor an `all` search returned as `next_page`. */
  search: (q: string, page: number | string = 1, { provider, lang, perPage = 30, signal }: StockSearchOptions = {}) =>
    http.get<StockPage>('/stock/photos/', {
      query: { q, ...(typeof page === 'string' ? { cursor: page } : { page }), per_page: perPage, ...(provider ? { provider } : {}), ...(lang ? { lang } : {}) },
      signal,
    }),
  importPhoto: (photo: Pick<StockPhoto, 'provider' | 'id'>) => http.post<Asset>('/stock/photos/import/', { json: { provider: photo.provider, id: photo.id } }),
}
