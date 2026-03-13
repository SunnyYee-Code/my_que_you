# 雀友聚

同城麻将约局平台，基于位置服务（LBS）的牌友匹配应用。

## 技术栈

| 技术           | 用途                     |
| -------------- | ------------------------ |
| React 18       | 前端框架                 |
| TypeScript     | 类型安全                 |
| Vite           | 构建工具                 |
| Tailwind CSS   | 样式方案                 |
| Shadcn UI      | UI 组件库                |
| Supabase       | 后端服务（数据库、认证） |
| React Router   | 路由管理                 |
| TanStack Query | 数据获取与缓存           |
| date-fns       | 日期处理                 |

## 项目结构

```
src/
├── components/
│   ├── auth/          # 认证相关组件
│   ├── friends/       # 好友功能组件
│   ├── home/          # 首页组件
│   ├── layout/        # 布局组件
│   ├── map/           # 地图组件
│   ├── shared/        # 通用共享组件
│   └── ui/            # Shadcn UI 基础组件
├── contexts/          # React Context (认证、城市选择)
├── hooks/             # 自定义 Hooks
├── integrations/      # Supabase 集成
├── lib/               # 工具函数
├── pages/             # 页面组件
└── test/              # 测试文件
```

## 核心功能

### 用户系统

- 注册/登录（邮箱认证）
- 个人资料编辑
- 信用分系统（初始100分）
- 城市设置

### 约局功能

- 发起麻将局（设置时间、地点、人数、玩法）
- 浏览附近对局
- 申请加入拼团
- 主办方审核申请
- 局内聊天
- 结局互评（态度、准时、技能）

### 社交功能

- 好友添加/管理
- 私信聊天
- 玩牌后一键加好友
- 邀请好友参加拼团

### 其他功能

- 位置服务（计算距离）
- 消息通知
- 举报功能
- 管理员后台

## 快速开始

### 环境变量

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=你的Supabase URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的Supabase密钥
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 其他命令

```bash
npm run build      # 生产构建
npm run preview    # 预览构建结果
npm run lint       # 代码检查
npm test           # 运行测试
```

## 数据库主要表

| 表名            | 用途     |
| --------------- | -------- |
| profiles        | 用户资料 |
| groups          | 麻将局   |
| group_members   | 局成员   |
| join_requests   | 加入申请 |
| messages        | 局内聊天 |
| direct_messages | 私信     |
| reviews         | 互评记录 |
| credit_history  | 信用变动 |
| friendships     | 好友关系 |
| notifications   | 通知     |

## 路由说明

| 路径                | 说明     |
| ------------------- | -------- |
| `/`                 | 首页     |
| `/community`        | 拼团列表 |
| `/login`            | 登录页   |
| `/group/create`     | 发起拼团 |
| `/group/:id`        | 拼团详情 |
| `/group/:id/chat`   | 局内聊天 |
| `/group/:id/review` | 结局评价 |
| `/friends`          | 好友列表 |
| `/notifications`    | 消息通知 |
| `/admin`            | 管理后台 |
