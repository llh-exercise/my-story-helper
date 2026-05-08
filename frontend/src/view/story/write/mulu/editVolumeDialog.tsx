import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import type { StoryChapter } from '../../../../types/chapter';
import { storyApi } from '../../../../api/story';

export type EditVolumeDialogProps = {
  open: boolean;
  storyId: number | null;
  chapter: StoryChapter | null;
  onCancel: () => void;
  onSuccess: () => void;
};

type FormValues = {
  title: string;
  outline: string;
};

const EditVolumeDialog: React.FC<EditVolumeDialogProps> = ({
  open,
  storyId,
  chapter,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && chapter) {
      form.setFieldsValue({
        title: chapter.title,
        outline: chapter.outline ?? '',
      });
    }
  }, [open, chapter, form]);

  const handleOk = async () => {
    if (storyId == null || chapter == null) {
      message.warning('缺少参数');
      return;
    }
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await storyApi.updateChapter(storyId, chapter.id, {
        title: values.title.trim(),
        outline: (values.outline ?? '').trim(),
      });
      message.success('已保存');
      onSuccess();
      onCancel();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) {
        return;
      }
      console.error(e);
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="修改卷名"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnHidden
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item label="卷名" name="title" rules={[{ required: true, message: '请输入卷名' }]}>
          <Input placeholder="卷名称" maxLength={200} showCount />
        </Form.Item>
        <Form.Item label="卷细纲" name="outline">
          <Input.TextArea placeholder="本卷情节/结构概要" rows={5} maxLength={8000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditVolumeDialog;
