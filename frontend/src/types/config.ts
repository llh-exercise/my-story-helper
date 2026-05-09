export interface LlmKeyConfig {
    provider: string;
    apiKey: string;
    apiBase: string;
    model: string;
}

/** 与后端 llm_config.purpose、SQLite 存值一致 */
export const LLM_PURPOSE = {
    GENERATE_TEXT: '生成文字',
    GENERATE_EMBEDDING: '生成向量',
} as const;

export type LlmPurpose = (typeof LLM_PURPOSE)[keyof typeof LLM_PURPOSE];

export const LLM_PURPOSE_VALUES: LlmPurpose[] = [
    LLM_PURPOSE.GENERATE_TEXT,
    LLM_PURPOSE.GENERATE_EMBEDDING,
];

export const LLM_PURPOSE_OPTIONS: {
    value: LlmPurpose;
    label: string;
    /** 表格/下拉中的补充说明 */
    description: string;
}[] = [
    { value: LLM_PURPOSE.GENERATE_TEXT, label: '生成文字', description: '对话、章节摘要、正文生成等' },
    { value: LLM_PURPOSE.GENERATE_EMBEDDING, label: '生成向量', description: '章节摘要嵌入、RAG 检索等' },
];

export interface LlmConfigListItem extends LlmKeyConfig {
    purpose: LlmPurpose;
    hasApiKey: boolean;
    updatedAt: number;
}

export interface LlmConfigListResponse {
    items: LlmConfigListItem[];
}

/** POST /api/config：按用途写入一行 */
export type LlmConfigSavePayload = LlmKeyConfig & { purpose: LlmPurpose };

export type LlmConfigParams = LlmKeyConfig

export interface StoryInfo {
    id: number;
    title: string;
    outline: string;
    /** 服务端返回的创建时间（如 SQLite datetime） */
    createTime: string;
}