// import { http } from './http.js';
// import type { AxiosRequestConfig } from 'axios';

const API_PREFIX = '/api';

export function apiUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${p}`;
}

// /**
//  * REST 风格 HTTP 封装：路径相对于 /api，成功时直接返回 response.data（非 SSE）
//  */
// export const rest = {
//   /**
//    * @template T
//    * @param {string} path 如 '/config' 或 'config'
//    * @param {import('axios').AxiosRequestConfig} [config]
//    * @returns {Promise<T>}
//    */
//   get(path: string, config?: AxiosRequestConfig) {
//     return http.get<T>(apiUrl(path), config).then((res) => res.data);
//   },

//   /**
//    * @template T
//    * @param {string} path
//    * @param {unknown} [data]
//    * @param {import('axios').AxiosRequestConfig} [config]
//    * @returns {Promise<T>}
//    */
//   post(path: string, data: unknown, config?: AxiosRequestConfig) {
//     return http.post(apiUrl(path), data, config).then((res) => res.data);
//   },

//   /**
//    * @template T
//    * @param {string} path
//    * @param {unknown} [data]
//    * @param {import('axios').AxiosRequestConfig} [config]
//    * @returns {Promise<T>}
//    */
//   put(path: string, data: unknown, config?: AxiosRequestConfig) {
//     return http.put(apiUrl(path), data, config).then((res) => res.data);
//   },

//   /**
//    * @template T
//    * @param {string} path
//    * @param {unknown} [data]
//    * @param {import('axios').AxiosRequestConfig} [config]
//    * @returns {Promise<T>}
//    */
//   patch(path: string, data: unknown, config?: AxiosRequestConfig) {
//     return http.patch(apiUrl(path), data, config).then((res) => res.data);
//   },

//   /**
//    * @template T
//    * @param {string} path
//    * @param {import('axios').AxiosRequestConfig} [config]
//    * @returns {Promise<T>}
//    */
//   delete(path: string, config?: AxiosRequestConfig) {
//     return http.delete(apiUrl(path), config).then((res) => res.data);
//   },
// };
