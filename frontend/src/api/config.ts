import { apiUrl } from './rest.ts';
import type {
  LlmConfigListResponse,
  LlmConfigSavePayload,
} from '../types/config.ts';
import { http } from './http.js';

/**
 * 大模型多用途配置（SQLite llm_config，按 purpose 一行）
 */
export const configApi = {
  /** GET /api/config：已保存的配置列表 */
  list() {
    return http.get<LlmConfigListResponse>(apiUrl('/config')).then((res) => res.data);
  },

  /**
   * POST /api/config：按 purpose 新增或覆盖该用途的配置
   */
  save(payload: LlmConfigSavePayload) {
    return http
      .post<{ ok: boolean; purpose: string; provider: string; apiBase: string; model: string; hasApiKey: boolean }>(
        apiUrl('/config'),
        payload,
      )
      .then((res) => res.data);
  },
};
