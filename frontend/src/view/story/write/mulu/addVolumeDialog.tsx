import { Form, Input, Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { storyApi } from '../../../../api/story';

export type AddVolumeDialogProps = {
  open: boolean;
  storyId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
};

type FormValues = {
  title: string;
  outline: string;
};

const AddVolumeDialog: React.FC<AddVolumeDialogProps> = ({ open, storyId, onCancel, onSuccess }) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    if (storyId == null) {
      message.warning('缺少故事 id');
      return;
    }
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await storyApi.createVolume(storyId, {
        title: values.title.trim(),
        outline: (values.outline ?? '').trim(),
      });
      message.success('已添加新卷');
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
      title="新加卷"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnHidden
      okText="提交"
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

export default AddVolumeDialog;
