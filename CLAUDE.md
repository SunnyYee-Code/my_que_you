# CLAUDE.md - 项目配置与开发指南

## 项目概况

这是一个基于 React + TypeScript 的社交活动平台（约友），使用 Supabase 作为后端服务。

### 技术栈
- **前端框架**: React 18.3.1 + TypeScript
- **构建工具**: Vite 5.4.19
- **UI 组件库**: Shadcn UI (基于 Radix UI primitives)
- **样式框架**: Tailwind CSS
- **状态管理**: TanStack Query (@tanstack/react-query)
- **路由**: React Router v6
- **后端服务**: Supabase (Auth + Database)
- **图标库**: Lucide React
- **表单管理**: React Hook Form + Zod
- **包管理器**: Bun

### 开发环境
- 开发服务器端口: 8080
- 访问地址: http://localhost:8080
- 路径别名: `@` → `./src`

## 项目结构

```
src/
├── pages/           # 页面组件
├── components/      # 可复用组件
│   ├── ui/         # Shadcn UI 组件
│   ├── layout/     # 布局组件
│   ├── shared/     # 共享组件（UserAvatar, EmptyState 等）
│   ├── auth/       # 认证相关组件
│   ├── friends/    # 好友相关组件
│   ├── home/       # 首页组件
│   └── map/        # 地图组件
├── contexts/        # React Context（AuthContext, CityContext）
├── hooks/          # 自定义 Hooks
├── integrations/   # 第三方集成（Supabase）
├── lib/            # 工具函数
└── data/           # Mock 数据
```

## 核心功能

1. **用户系统**
   - Supabase Auth 认证
   - 用户角色管理（admin, super_admin, test）
   - 用户档案管理

2. **社交功能**
   - 好友系统（添加、接受/拒绝请求、删除）
   - 私信（Direct Messages）
   - 群组活动（创建、加入、聊天）

3. **位置服务**
   - 地理位置获取
   - 城市搜索
   - 高德地图集成

4. **评价系统**
   - 用户信用评分（credit_score）
   - 活动评价

5. **通知系统**
   - 实时通知
   - Toast 通知（使用 Sonner）

## 开发脚本

```bash
bun dev          # 启动开发服务器
bun build        # 生产构建
bun build:dev    # 开发模式构建
bun lint         # 代码检查
bun test         # 运行测试
bun test:watch   # 测试监听模式
```

## 路由结构

### 公开路由
- `/` - 首页
- `/community` - 社区
- `/login` - 登录
- `/onboarding` - 新用户引导

### 需要认证的路由
- `/profile/:id` - 用户档案
- `/profile/edit` - 编辑档案
- `/settings` - 设置
- `/group/:id` - 群组详情
- `/group/create` - 创建群组
- `/group/:id/chat` - 群组聊天
- `/group/:id/review` - 活动评价
- `/friends` - 好友列表
- `/dm/:friendId` - 私信聊天
- `/host/requests` - 主办请求
- `/my-groups` - 我的群组
- `/notifications` - 通知

### 管理员路由
- `/admin` - 管理后台

## 代码规范

### TypeScript 配置
- `noImplicitAny: false`
- `strictNullChecks: false`
- 使用路径别名 `@/*`

### 导入规范
- 使用绝对路径导入（如 `@/components/ui/button`）
- UI 组件从 `@/components/ui/` 导入
- 自定义 Hooks 从 `@/hooks/` 导入
- 工具函数从 `@/lib/` 导入

### 组件开发
- 函数式组件 + Hooks
- 使用 TypeScript 类型定义
- 优先使用 Shadcn UI 组件
- 使用 TanStack Query 处理数据获取和缓存

### Supabase 集成
- 客户端从 `@/integrations/supabase/client` 导入
- 类型定义从 `@/integrations/supabase/types` 导入
- 使用 `useAuth` Hook 获取用户信息
- 使用自定义 Hooks（如 `useFriends`, `useGroups`）封装业务逻辑

## 常用 Hooks

- `useAuth()` - 用户认证信息
- `useFriends()` - 好友列表
- `useGroups()` - 群组列表
- `useNotifications()` - 通知列表
- `useGeolocation()` - 地理位置
- `useToast()` - Toast 通知

## Shadcn UI 组件使用

项目已集成完整的 Shadcn UI 组件库，包括：
- Button, Input, Textarea
- Card, Dialog, Tabs
- Badge, Avatar, Tooltip
- Form, Select, Checkbox
- 等等...

新增 UI 组件：
```bash
bunx shadcn@latest add [component-name]
```

## 注意事项

1. **认证保护**: 需要登录的页面使用 `RequireAuth` 组件包裹
2. **角色权限**: 管理员页面使用 `RequireAdmin` 组件包裹
3. **数据获取**: 使用 TanStack Query 的 `useQuery` 和 `useMutation`
4. **错误处理**: 使用 `useToast()` Hook 显示错误信息
5. **加载状态**: 使用 `LoadingState` 组件显示加载状态
6. **空状态**: 使用 `EmptyState` 组件显示空状态

## Supabase 数据库

主要表结构：
- `profiles` - 用户档案
- `friendships` - 好友关系
- `direct_messages` - 私信
- `groups` - 群组
- `group_members` - 群组成员
- `notifications` - 通知
- `user_roles` - 用户角色
