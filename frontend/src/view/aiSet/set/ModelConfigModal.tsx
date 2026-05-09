import { useEffect, useMemo, type FC } from 'react';
import { Form, Input, Modal, Select, Typography } from 'antd';
import type { LlmConfigListItem, LlmPurpose } from '../../../types/config.ts';
import {
  LLM_PURPOSE,
  LLM_PURPOSE_OPTIONS,
} from '../../../types/config.ts';

export type ModelConfigModalMode = 'create' | 'edit';

export type ModelConfigModalProps = {
  open: boolean;
  mode: ModelConfigModalMode;
  /** 新建时可选的用途（库中尚未存在的 purpose） */
  availablePurposes: LlmPurpose[];
  editing: LlmConfigListItem | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    purpose: LlmPurpose;
    provider: string;
    apiKey: string;
    apiBase: string;
    model: string;
  }) => void | Promise<void>;
};

type FormValues = {
  purpose: LlmPurpose;
  provider: string;
  apiKey: string;
  apiBase: string;
  model: string;
};

function purposeLabel(p: LlmPurpose): string {
  const opt = LLM_PURPOSE_OPTIONS.find((o) => o.value === p);
  return opt ? `${opt.label}（${opt.description}）` : p;
}

export const ModelConfigModal: FC<ModelConfigModalProps> = ({
  open,
  mode,
  availablePurposes,
  editing,
  submitting,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm<FormValues>();
  const purpose = Form.useWatch('purpose', form);

  const providerOptions = useMemo(() => {
    if (purpose === LLM_PURPOSE.GENERATE_EMBEDDING) {
      return [
        { label: '通义 DashScope（推荐）', value: 'dashscope' },
        { label: 'DeepSeek', value: 'deepseek' },
      ];
    }
    return [{ label: 'DeepSeek', value: 'deepseek' }];
  }, [purpose]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && editing) {
      form.setFieldsValue({
        purpose: editing.purpose,
        provider: editing.provider,
        apiBase: editing.apiBase,
        apiKey: '',
        model: editing.model,
      });
      return;
    }

    const first = availablePurposes[0];
    if (!first) return;
    form.setFieldsValue({
      purpose: first,
      provider: first === LLM_PURPOSE.GENERATE_EMBEDDING ? 'dashscope' : 'deepseek',
      apiBase: '',
      apiKey: '',
      model:
        first === LLM_PURPOSE.GENERATE_EMBEDDING
          ? 'text-embedding-v3'
          : 'deepseek-chat',
    });
  }, [open, mode, editing, availablePurposes, form]);

  const title = mode === 'edit' ? '编辑模型配置' : '新建模型配置';

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
      onOk={() => form.submit()}
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(v) => onSubmit(v)}
        onValuesChange={(changed) => {
          if (mode !== 'create' || !('purpose' in changed)) return;
          const p = changed.purpose as LlmPurpose;
          form.setFieldsValue({
            provider: p === LLM_PURPOSE.GENERATE_EMBEDDING ? 'dashscope' : 'deepseek',
            model:
              p === LLM_PURPOSE.GENERATE_EMBEDDING
                ? 'text-embedding-v3'
                : 'deepseek-chat',
          });
        }}
      >
        <Form.Item
          label="模型用途"
          name="purpose"
          rules={[{ required: true, message: '请选择用途' }]}
        >
          <Select
            disabled={mode === 'edit'}
            placeholder="请选择"
            options={
              mode === 'create'
                ? availablePurposes.map((v) => ({
                    value: v,
                    label: purposeLabel(v),
                  }))
                : editing
                  ? [{ value: editing.purpose, label: purposeLabel(editing.purpose) }]
                  : []
            }
          />
        </Form.Item>

        <Form.Item
          label="服务商"
          name="provider"
          rules={[{ required: true, message: '请选择服务商' }]}
        >
          <Select placeholder="请选择" options={providerOptions} />
        </Form.Item>

        <Form.Item
          label="API Key"
          name="apiKey"
          rules={
            mode === 'create'
              ? [{ required: true, message: '请输入 API Key' }]
              : []
          }
          extra={
            mode === 'edit' ? (
              <Typography.Text type="secondary">
                留空则不修改已保存的密钥
              </Typography.Text>
            ) : null
          }
        >
          <Input.Password placeholder="请输入 API Key" autoComplete="off" />
        </Form.Item>

        <Form.Item label="API 地址" name="apiBase">
          <Input placeholder="可选，留空可使用各服务商默认地址" />
        </Form.Item>

        <Form.Item
          label="模型名称"
          name="model"
          rules={[{ required: true, message: '请输入模型名称' }]}
        >
          <Input placeholder="例如 deepseek-chat、text-embedding-v3" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
