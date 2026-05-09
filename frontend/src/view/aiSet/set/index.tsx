import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Button, Space, Table, Tag, Typography, message } from 'antd';
import { configApi } from '../../../api/config.ts';
import type { LlmConfigListItem, LlmPurpose } from '../../../types/config.ts';
import {
  LLM_PURPOSE_OPTIONS,
  LLM_PURPOSE_VALUES,
} from '../../../types/config.ts';
import {
  ModelConfigModal,
  type ModelConfigModalMode,
} from './ModelConfigModal.tsx';

function purposeLabel(p: string): string {
  const opt = LLM_PURPOSE_OPTIONS.find((o) => o.value === p);
  return opt?.label ?? p;
}

const SetPage: FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LlmConfigListItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModelConfigModalMode>('create');
  const [editing, setEditing] = useState<LlmConfigListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await configApi.list();
      setItems(res.items);
    } catch (err) {
      console.error(err);
      message.error('获取配置列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const existingPurposes = useMemo(
    () => new Set(items.map((i) => i.purpose)),
    [items],
  );

  const availablePurposes = useMemo(
    () => LLM_PURPOSE_VALUES.filter((p) => !existingPurposes.has(p)),
    [existingPurposes],
  );

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: LlmConfigListItem) => {
    setModalMode('edit');
    setEditing(row);
    setModalOpen(true);
  };

  const handleModalSubmit = async (values: {
    purpose: LlmPurpose;
    provider: string;
    apiKey: string;
    apiBase: string;
    model: string;
  }) => {
    setSubmitting(true);
    try {
      await configApi.save({
        purpose: values.purpose,
        provider: values.provider,
        apiKey: values.apiKey,
        apiBase: values.apiBase,
        model: values.model,
      });
      message.success('保存成功');
      setModalOpen(false);
      await loadList();
    } catch (err) {
      console.error(err);
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 0', maxWidth: 960 }}>
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%' }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          模型配置
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          按「模型用途」各保存一行，与数据库表 llm_config 一致。对话与正文走「生成文字」；章节嵌入与 RAG
          走「生成向量」。
        </Typography.Paragraph>
        <div>
          <Button
            type="primary"
            onClick={openCreate}
            disabled={availablePurposes.length === 0}
          >
            新建配置
          </Button>
          {availablePurposes.length === 0 && (
            <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
              两种用途均已存在，请直接编辑表格中的行
            </Typography.Text>
          )}
        </div>
        <Table<LlmConfigListItem>
          rowKey="purpose"
          loading={loading}
          dataSource={items}
          pagination={false}
          columns={[
            {
              title: '模型用途',
              dataIndex: 'purpose',
              render: (p: LlmPurpose) => purposeLabel(p),
            },
            {
              title: '服务商',
              dataIndex: 'provider',
            },
            {
              title: '模型',
              dataIndex: 'model',
              ellipsis: true,
            },
            {
              title: 'API 地址',
              dataIndex: 'apiBase',
              ellipsis: true,
              render: (v: string) => v || '—',
            },
            {
              title: '密钥',
              dataIndex: 'hasApiKey',
              render: (ok: boolean) =>
                ok ? <Tag color="green">已配置</Tag> : <Tag>未配置</Tag>,
            },
            {
              title: '更新时间',
              dataIndex: 'updatedAt',
              width: 180,
              render: (t: number) =>
                t ? new Date(t).toLocaleString('zh-CN') : '—',
            },
            {
              title: '操作',
              key: 'actions',
              width: 100,
              render: (_, row) => (
                <Button type="link" onClick={() => openEdit(row)}>
                  编辑
                </Button>
              ),
            },
          ]}
        />
      </Space>

      <ModelConfigModal
        open={modalOpen}
        mode={modalMode}
        availablePurposes={availablePurposes}
        editing={editing}
        submitting={submitting}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default SetPage;
