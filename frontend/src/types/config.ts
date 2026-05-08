export interface LlmKeyConfig {
    provider: string;
    apiKey: string;
    apiBase: string;
    model: string;
}

export type LlmConfigParams = LlmKeyConfig

export interface StoryInfo {
    id: number;
    title: string;
    outline: string;
    /** 服务端返回的创建时间（如 SQLite datetime） */
    createTime: string;
}