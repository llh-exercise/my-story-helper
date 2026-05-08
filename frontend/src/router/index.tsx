import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '../layout'
import Story from '../view/story/write'
import AiSet from '../view/aiSet'
import ChatPage from '../view/aiSet/chat'
import SetPage from '../view/aiSet/set'
import StoryList from '../view/story/storyList'

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/story" replace /> },
      { path: 'story', children: [
        { index: true, element: <Navigate to="/story/list" replace /> },
        { path: 'list', Component: StoryList },
        { path: 'write', Component: Story },
      ] },
      { path: 'ai', Component: AiSet, children: [
        { index: true, element: <Navigate to="/ai/set" replace /> },
        { path: 'set', Component: SetPage },
        { path: 'chat', Component: ChatPage },
      ] },
    ],
  },
])

export default router
