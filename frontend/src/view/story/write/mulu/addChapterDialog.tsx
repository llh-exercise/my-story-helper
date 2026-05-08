import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { storyApi } from '../../../../api/story';

export type AddChapterDialogProps = {
  open: boolean;
  storyId: number | null;
  /** 所属卷的 id */
  volumeId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
};

type FormValues = {
  title: string;
  outline: string;
};

const AddChapterDialog: React.FC<AddChapterDialogProps> = ({
  open,
  storyId,
  volumeId,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    if (storyId == null || volumeId == null) {
      message.warning('缺少参数');
      return;
    }
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await storyApi.createChapter(storyId, {
        parentId: volumeId,
        title: values.title.trim(),
        outline: (values.outline ?? '').trim(),
      });
      message.success('已添加章节');
      onSuccess();
      onCancel();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) {
        return;
      }
      console.error(e);
      message.error(e instanceof Error ? e.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="增加章节"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnHidden
      okText="提交"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item label="章节名" name="title" rules={[{ required: true, message: '请输入章节名' }]}>
          <Input placeholder="章节名称" maxLength={200} showCount />
        </Form.Item>
        <Form.Item label="章节细纲（可选）" name="outline">
          <Input.TextArea placeholder="本章概要" rows={4} maxLength={8000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddChapterDialog;
