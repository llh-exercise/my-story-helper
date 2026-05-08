import React from 'react';
import { Layout as AntdLayout, Menu } from 'antd';
const { Header, Content } = AntdLayout;
import { Outlet, useNavigate } from 'react-router-dom';
import "./index.css"
import type { MenuProps } from 'antd';

const items = [
  {
    key: 'story',
    label: '故事',
  },
  {
    key: 'ai',
    label: '大模型配置',
  }
]

const App: React.FC = () => {
  const navigate = useNavigate()
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    console.log('click ', e);
    navigate(e.key)
  };
  return (
    <AntdLayout className="app-layout">
      <Header>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['story']}
          items={items}
          style={{ flex: 1, minWidth: 0 }}
          onClick={handleMenuClick}
        />
      </Header>
      <Content className='content'>
        <Outlet />
      </Content>
    </AntdLayout>
  );
};

export default App;
