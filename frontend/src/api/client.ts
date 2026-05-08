import axios from 'axios'

/** 开发环境经 Vite 代理到 Express；生产请改为实际后端地址 */
export const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})
