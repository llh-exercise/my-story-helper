import React from 'react'
import { DesktopOutlined, PieChartOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Menu } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import './index.css'

const items = [
  {
    key: 'set',
    label: 'AI配置',
    icon: <PieChartOutlined />,
  },
  {
    key: 'chat',
    label: 'AI对话',
    icon: <DesktopOutlined />,
  },
]

const AiSet: React.FC = () => {
  const navigate = useNavigate()

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(`/ai/${e.key}`)
  }

  return (
    <div className="ai-set">
      <div
        className={`ai-set__sidebar`}
      >
        <Menu
          mode="inline"
          defaultSelectedKeys={['set']}
          items={items}
          onClick={handleMenuClick}
          className="ai-set__menu"
        />
      </div>

      <div className="ai-set__main">
        <div className="ai-set__header-placeholder" aria-hidden />
        <div className="ai-set__outlet-wrap">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AiSet
