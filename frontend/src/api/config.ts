import { apiUrl } from './rest.ts';
import type { LlmConfigParams } from '../types/config.ts';
import { http } from './http.js';
/**
 * 模型配置（服务端 data/config.json 明文）
 */
export const configApi = {
  /** GET /api/config */
  get() {
    return http.get<LlmConfigParams>(apiUrl('/config')).then((res) => res.data);
  },

  /**
   * POST /api/config
   * 保存/更新配置（服务端当前为整体覆盖写入）
   * @param {LlmConfigParams} payload
   */
  save(payload: LlmConfigParams) {
    return http.post<LlmConfigParams>(apiUrl('/config'), payload).then((res) => res.data);
  },
};

/**
 * 健康检查
 */
// export const healthApi = {
//   /** GET /api/health */
//   get() {
//     return rest.get('/hea   lth');
//   },
// };
