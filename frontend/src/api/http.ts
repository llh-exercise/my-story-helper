import axios from 'axios';

/**
 * 底层 Axios 实例（仅给 api/rest 使用，业务请用 configApi / rest）
 * 与 Vite 开发代理一致，生产需同源或配置反向代理
 */
export const http = axios.create({
  baseURL: '/',
  timeout: 60_000,
});

function extractErrorMessage(error: any) {
  const d = error?.response?.data;
  if (d && typeof d.error === 'string') return d.error;
  if (typeof d === 'string' && d) return d;
  if (typeof error?.message === 'string') return error.message;
  return '请求失败';
}

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(new Error(extractErrorMessage(error)))
);
