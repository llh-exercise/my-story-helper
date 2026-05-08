import { Form, Input, Modal, message } from 'antd'
import { useEffect, useState } from 'react'
import { storyApi } from '../../../api/story'

export type AddStoryDialogProps = {
  open: boolean
  onCancel: () => void
  /** 创建成功后的回调（用于父组件刷新列表） */
  onSuccess: () => void
}

type FormValues = {
  title: string
  outline: string
}

const AddStoryDialog: React.FC<AddStoryDialogProps> = ({ open, onCancel, onSuccess }) => {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      form.resetFields()
    }
  }, [open, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await storyApi.create({
        title: values.title.trim(),
        outline: (values.outline ?? '').trim(),
      })
      message.success('已新增故事')
      onSuccess()
      onCancel()
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) {
        return
      }
      console.error(e)
      message.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="新增故事"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnHidden
      okText="提交"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="故事名称"
          name="title"
          rules={[{ required: true, message: '请输入故事名称' }]}
        >
          <Input placeholder="请输入标题" maxLength={200} showCount />
        </Form.Item>
        <Form.Item label="大纲" name="outline">
          <Input.TextArea placeholder="可填写故事大纲或梗概" rows={5} maxLength={4000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AddStoryDialog
