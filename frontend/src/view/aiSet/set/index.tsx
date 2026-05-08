import { Button, Form, Input, Select, message, Spin } from 'antd'
import { configApi } from '../../../api/config.ts'
import { useEffect, useState } from 'react'

type AiConfigFormValues = {
  provider: string
  apiBase: string
  apiKey: string
  model: string
}

const SetPage: React.FC = () => {
console.log('ai配置页渲染')
  const [form] = Form.useForm<AiConfigFormValues>()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 获取配置
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const res = await configApi.get()
        form.setFieldsValue(res)
      } catch (err) {
        console.error(err)
        message.error('获取配置失败') // 全局调用，无警告
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [form])

  // 提交
  const handleSubmit = async (values: AiConfigFormValues) => {
    setSubmitting(true)
    try {
      await configApi.save(values)
      message.success('保存成功') // 全局调用
    } catch (err) {
      console.error(err)
      message.error('保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, padding: '24px 0' }}>
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="服务商"
            name="provider"
            rules={[{ required: true, message: '请选择服务商' }]}
          >
            <Select
              placeholder="请选择"
              options={[{ label: 'DeepSeek', value: 'deepseek' }]}
            />
          </Form.Item>

          <Form.Item
            label="API Key"
            name="apiKey"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="请输入 API Key" autoComplete="off" />
          </Form.Item>

          <Form.Item label="API 地址" name="apiBase">
            <Input placeholder="可选，例如 https://api.example.com/v1" />
          </Form.Item>

          <Form.Item label="模型名称" name="model">
            <Input placeholder="例如 deepseek-reasoner" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
            >
              提交
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  )
}

export default SetPage