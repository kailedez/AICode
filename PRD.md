# NoteFlow 产品需求文档

## 1. 文档信息
- 文档版本：3.0
- 最近更新：2026-03-26
- 当前阶段：MVP 已完成前后端基础打通，进入数据库化落地与正式后端工程能力补齐阶段
- 关联文档：[项目进度.md](./项目进度.md)

## 2. 产品概述

### 2.1 产品定位
NoteFlow 是一个面向个人知识管理与轻量写作场景的在线笔记应用，强调低干扰编辑、清晰目录组织、快速搜索与自动保存。

### 2.2 目标用户
- 学生：课程笔记、复习资料、实验记录
- 内容创作者：提纲、素材、草稿
- 开发者与产品经理：方案沉淀、会议纪要、需求笔记
- 个人知识管理用户：按目录持续沉淀主题内容

### 2.3 当前项目状态
当前仓库已经不是纯前端原型，已经具备以下基础能力：
- 前端：React + TypeScript + Vite + Zustand + TipTap
- 后端：Node.js + Express 风格模块化服务
- 持久化：Prisma + 本地 SQLite 持久化
- 联调：前后端接口已打通
- 账号：已支持登录、注册、refresh、退出与会话管理

当前版本可以作为 MVP 联调版本继续推进，但还未达到正式上线形态。

## 3. 当前版本目标

### 3.1 MVP 目标
- 支持用户登录后进入个人工作台
- 支持文件夹树管理笔记
- 支持笔记创建、编辑、自动保存、删除、搜索
- 支持主题设置和基础用户偏好保存
- 支持后端持久化存储，替代浏览器本地原型数据

### 3.2 当前阶段重点
- 稳定登录后的工作台体验
- 继续收尾“功能页重复刷新”问题
- 将开发态持久化升级为正式数据库方案
- 完善操作日志、迁移流程与环境配置，补齐正式后端工程能力
- 为后续标签、分享、多环境部署等能力预留清晰边界

## 4. 当前已实现范围

### 4.1 前端
- 登录 / 注册页
- 顶部搜索栏、保存状态、主题切换、用户区块
- 左侧文件夹树
- 中间笔记列表
- 右侧编辑器
- TipTap 编辑、命令面板、自动保存

### 4.2 后端
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/me/settings`
- `PUT /api/v1/me/settings`
- `GET /api/v1/folders/tree`
- `POST /api/v1/folders`
- `PUT /api/v1/folders/{folderUid}`
- `DELETE /api/v1/folders/{folderUid}`
- `GET /api/v1/notes`
- `GET /api/v1/notes/{noteUid}`
- `POST /api/v1/notes`
- `PUT /api/v1/notes/{noteUid}`
- `PUT /api/v1/notes/{noteUid}/content`
- `GET /api/v1/notes/{noteUid}/revisions`
- `POST /api/v1/notes/{noteUid}/restore`
- `DELETE /api/v1/notes/{noteUid}`
- `GET /api/v1/recycle-bin/notes`
- `POST /api/v1/recycle-bin/notes/{noteUid}/recover`
- `DELETE /api/v1/recycle-bin/notes/{noteUid}`
- `GET /api/v1/health`

### 4.3 当前实现限制
- 本地开发环境已切换到 Prisma + SQLite，但 PostgreSQL/MySQL 正式环境尚未接入
- 已实现 access token + refresh token + 会话表，但生产级安全策略与多端会话治理仍需补齐
- 已实现回收站、历史版本、恢复流程与操作日志
- Prisma CLI `generate` 已可用，`db push` 在当前沙箱环境下仍需继续排查
- 登录后页面稳定性还需继续验证

## 5. 核心功能需求

### 5.1 用户与认证
- 支持注册、登录、退出
- 每个用户拥有独立工作区
- 未登录用户不能访问个人数据
- 用户信息至少包含：`uid`、`nickname`、`avatarUrl`

### 5.2 文件夹管理
- 创建根文件夹
- 创建子文件夹
- 重命名文件夹
- 删除文件夹
- 展开 / 折叠文件夹树
- 支持按当前文件夹及子孙目录筛选笔记

### 5.3 笔记管理
- 创建笔记
- 编辑标题
- 编辑正文
- 删除笔记
- 切换笔记
- 按更新时间排序
- 展示字数、创建时间、更新时间

### 5.4 自动保存
- 用户输入后延迟自动保存
- 保存中显示 `saving`
- 保存成功显示 `saved`
- 保存失败显示错误状态
- 切换笔记前应确保当前内容已提交

### 5.5 搜索
- 支持标题搜索
- 支持正文搜索
- 支持在当前目录范围内搜索

### 5.6 个性化设置
- 主题：`light` / `dark` / `system`
- 默认新建笔记目录
- 后续预留编辑器偏好设置

## 6. 非功能要求
- 自动保存接口需要高频可用
- 所有接口需要基础鉴权
- 用户只能访问自己的数据
- 保持前后端接口结构稳定，便于后续正式后端替换
- 前端运行时不得因后端持久化文件变化而触发整页刷新
- 后端应支持平滑扩展到回收站、历史版本、标签、分享等能力
- 正式后端应具备数据库迁移、日志追踪、异常处理、配置隔离等工程能力
- 后端方案应优先适配 Vercel 部署模型，降低上线与运维成本

## 7. 数据模型设计

### 7.1 核心实体
- User
- UserSetting
- Folder
- Note
- NoteRevision
- UserSession
- OperationLog

### 7.2 推荐数据库表

#### users
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| uid | varchar(36) unique | 对外 ID |
| email | varchar(128) unique | 邮箱 |
| password_hash | varchar(255) | 密码哈希 |
| nickname | varchar(64) | 昵称 |
| avatar_url | varchar(255) null | 头像 |
| status | tinyint | 状态，1=正常，0=禁用 |
| last_login_at | datetime null | 最近登录时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| deleted_at | datetime null | 软删除时间 |

#### user_settings
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| user_id | bigint unsigned unique | 用户 ID |
| theme | varchar(16) | 主题 |
| default_folder_uid | varchar(36) null | 默认目录 UID |
| editor_preferences | json null | 编辑器偏好 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

#### folders
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| uid | varchar(36) unique | 对外 ID |
| user_id | bigint unsigned | 所属用户 |
| parent_uid | varchar(36) null | 父目录 UID |
| ancestor_path | varchar(1024) null | 冗余祖先路径，便于树查询 |
| name | varchar(128) | 名称 |
| sort_order | int | 排序值 |
| is_expanded | tinyint | 是否展开 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| deleted_at | datetime null | 软删除时间 |

#### notes
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| uid | varchar(36) unique | 对外 ID |
| user_id | bigint unsigned | 所属用户 |
| folder_uid | varchar(36) null | 目录 UID |
| title | varchar(255) | 标题 |
| summary | varchar(500) null | 摘要 |
| content_json | json null | TipTap 结构化正文 |
| content_html | longtext null | HTML 内容 |
| content_text | longtext null | 纯文本内容 |
| word_count | int unsigned | 字数 |
| status | tinyint | 状态，1=正常，2=回收站 |
| revision_no | int unsigned | 当前版本号 |
| last_edited_at | datetime | 最近编辑时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| deleted_at | datetime null | 软删除时间 |

#### note_revisions
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| note_uid | varchar(36) | 笔记 UID |
| user_id | bigint unsigned | 用户 ID |
| version_no | int unsigned | 版本号 |
| title | varchar(255) | 标题快照 |
| content_json | json null | 内容快照 |
| content_html | longtext null | HTML 快照 |
| content_text | longtext null | 文本快照 |
| created_at | datetime | 创建时间 |
| created_by | bigint unsigned | 创建人 |

#### user_sessions
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| session_uid | varchar(36) unique | 会话 UID |
| user_id | bigint unsigned | 用户 ID |
| refresh_token_hash | varchar(255) | Refresh Token 哈希 |
| client_type | varchar(32) | 客户端类型 |
| device_info | varchar(255) null | 设备信息 |
| ip | varchar(64) null | 登录 IP |
| expired_at | datetime | 会话过期时间 |
| revoked_at | datetime null | 注销时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

#### operation_logs
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigint unsigned PK | 主键 |
| user_id | bigint unsigned | 用户 ID |
| target_type | varchar(32) | 目标类型 |
| target_uid | varchar(36) | 目标 UID |
| action | varchar(32) | 操作类型 |
| request_id | varchar(64) null | 请求 ID |
| detail | json null | 详细信息 |
| created_at | datetime | 创建时间 |

### 7.3 索引建议
- `users.email` 唯一索引
- `folders.user_id + parent_uid + deleted_at` 组合索引
- `notes.user_id + folder_uid + updated_at` 组合索引
- `notes.user_id + status + updated_at` 组合索引
- `note_revisions.note_uid + version_no` 唯一索引
- `user_sessions.user_id + revoked_at + expired_at` 组合索引

### 7.4 数据库选型建议
- 正式环境推荐：PostgreSQL
- 原因：与 Vercel 生态兼容度更高，适合 Serverless / Functions 场景，后续接入 Neon、Supabase、Vercel Marketplace 数据库更顺畅
- 可选方案：MySQL 8，如团队更熟悉 MySQL，也可继续使用，但需优先考虑连接池与地域部署
- 可选增强：Redis 用于缓存、登录态黑名单、限流计数

## 8. 前后端接口规范

### 8.1 通用规范
- Base Path：`/api/v1`
- 数据格式：`application/json`
- 认证方式：`Bearer Token`
- 时间格式：ISO 8601

### 8.2 通用响应结构
```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req_xxx"
}
```

### 8.3 当前已落地接口

#### 认证
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

#### 用户
- `GET /api/v1/me`
- `GET /api/v1/me/settings`
- `PUT /api/v1/me/settings`

#### 文件夹
- `GET /api/v1/folders/tree`
- `POST /api/v1/folders`
- `PUT /api/v1/folders/{folderUid}`
- `DELETE /api/v1/folders/{folderUid}`

#### 笔记
- `GET /api/v1/notes`
- `GET /api/v1/notes/{noteUid}`
- `POST /api/v1/notes`
- `PUT /api/v1/notes/{noteUid}`
- `PUT /api/v1/notes/{noteUid}/content`
- `GET /api/v1/notes/{noteUid}/revisions`
- `POST /api/v1/notes/{noteUid}/restore`
- `DELETE /api/v1/notes/{noteUid}`

#### 回收站
- `GET /api/v1/recycle-bin/notes`
- `POST /api/v1/recycle-bin/notes/{noteUid}/recover`
- `DELETE /api/v1/recycle-bin/notes/{noteUid}`

### 8.4 自动保存交互约定
1. 用户输入后，前端本地先更新 UI
2. 前端在防抖后调用保存接口
3. 若内容未变化，应跳过保存请求
4. 后端返回最新 `updatedAt`
5. 前端显示保存状态与最近保存时间

### 8.5 已落地但后续仍需增强的接口
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/notes/{noteUid}/revisions`
- `POST /api/v1/notes/{noteUid}/restore`
- `GET /api/v1/recycle-bin/notes`
- `POST /api/v1/recycle-bin/notes/{noteUid}/recover`
- `DELETE /api/v1/recycle-bin/notes/{noteUid}`

当前增强重点：
- refresh token 的生产级安全策略
- 版本策略细化与版本裁剪
- 回收站保留期与批量清理
- 操作日志查询与结构化日志输出

### 8.6 当前联调注意事项
- 前端通过 Vite 代理访问 `/api`
- 开发环境下 Vite 必须忽略 `server/data/**` 变化
- 当前 Node MVP 与未来正式后端必须尽量保持相同的接口语义与响应结构
- 若未来迁移到 Vercel Functions，建议继续保留 `/api/v1` 路径与统一响应结构

## 9. 后端项目设计

### 9.1 设计目标
- 在不影响现有前端联调的前提下，将后端升级为正式可迭代工程
- 使用数据库完成数据落地，替代 JSON 文件持久化
- 以后续部署 Vercel 为前提，优先选择轻量、低运维、易拆分的后端形态
- 保持模块边界清晰，但避免引入重型微服务体系
- 为后续回收站、版本历史、标签、分享等能力预留扩展空间

### 9.2 总体方案结论
正式后端建议采用“Node.js/TypeScript + Vercel Functions + 数据库”的轻量化架构：
- 运行时：Node.js
- 语言：TypeScript
- 接口形态：Vercel Functions 或 Next.js Route Handlers
- 数据访问：Prisma
- 数据库：PostgreSQL
- 鉴权：JWT + Refresh Token
- 缓存与限流：Redis
- 参数校验：Zod
- API 文档：OpenAPI / Swagger
- 日志：结构化日志 + requestId
- 测试：Vitest + 集成测试

说明：
- 当前 Node.js 后端继续承担 MVP 联调职责。
- 正式后端不再单独规划为 Java 服务，而是在现有前端仓库基础上，逐步过渡为适配 Vercel 的一体化部署结构。
- 不建议当前阶段引入独立微服务，优先做模块化轻单体 API。

### 9.3 架构风格
采用“BFF/API 层 + 模块化业务层 + 持久化层”的设计：
- `api` 层：对外 HTTP 接口、请求解析、认证校验、响应封装
- `modules` 层：业务用例、领域规则、权限判断
- `repositories` 层：数据库访问、查询封装、事务处理
- `shared` 层：配置、错误、日志、鉴权、工具函数

这样设计的目标：
- 适合 Vercel Functions 的按路由拆分方式
- 保持业务逻辑集中，避免把代码全部塞进单个函数文件
- 比传统 Express 大型服务更容易向 Serverless 部署迁移
- 能让认证、笔记、文件夹、设置、版本等模块边界清晰

### 9.4 推荐项目目录

```text
noteflow/
  src/
    components/
    pages/
    lib/
  api/
    v1/
      auth/
        login.ts
        register.ts
        refresh.ts
        logout.ts
      me/
        index.ts
        settings.ts
      folders/
        index.ts
        [folderUid].ts
        tree.ts
      notes/
        index.ts
        [noteUid].ts
        [noteUid]/
          content.ts
          revisions.ts
      health.ts
  server/
    modules/
      auth/
        service.ts
        repository.ts
        schema.ts
      users/
        service.ts
        repository.ts
        schema.ts
      settings/
        service.ts
        repository.ts
        schema.ts
      folders/
        service.ts
        repository.ts
        schema.ts
      notes/
        service.ts
        repository.ts
        schema.ts
      revisions/
        service.ts
        repository.ts
      logs/
        service.ts
        repository.ts
    shared/
      auth/
      db/
      errors/
      response/
      logger/
      config/
      utils/
    prisma/
      schema.prisma
      migrations/
  tests/
    api/
    modules/
```

### 9.5 模块职责设计

#### auth 模块
- 注册、登录、登出、刷新 token
- 密码加密与校验
- 会话生成、注销、失效控制
- 登录风控与后续限流能力预留

#### users 模块
- 当前用户信息查询
- 基础资料维护
- 用户状态管理

#### settings 模块
- 主题设置
- 默认目录设置
- 编辑器偏好设置

#### folders 模块
- 文件夹树查询
- 创建、重命名、删除、排序
- 父子层级与路径维护

#### notes 模块
- 笔记创建、列表、详情、更新、删除
- 自动保存主链路
- 搜索、摘要、字数统计
- 回收站状态切换

#### revisions 模块
- 版本快照生成
- 历史版本查询
- 指定版本恢复

#### logs 模块
- 关键操作日志记录
- 审计与问题排查支持

### 9.6 推荐分层职责
- `api/v1/**`：仅负责接收请求、调用服务、返回统一响应
- `server/modules/**/service.ts`：负责核心业务编排
- `server/modules/**/repository.ts`：负责 Prisma 查询与事务
- `server/modules/**/schema.ts`：负责 Zod 入参和出参校验
- `server/shared/**`：承载通用鉴权、错误、日志、配置等能力

### 9.7 核心工程能力设计

#### 统一响应与异常
- 所有接口统一返回 `code/message/data/requestId`
- 统一封装成功响应、业务异常、参数异常、权限异常
- 业务错误码统一维护，如 `AUTH_40101`、`NOTE_40401`

#### 安全体系
- Access Token 用于接口访问，时效短
- Refresh Token 用于续期，保存哈希到数据库
- 密码使用 `bcrypt`
- 所有用户数据查询必须带 `user_id` 作为数据边界条件
- 可通过 Redis 支持主动失效 token 与限流

#### 数据访问与事务
- Prisma 负责模型映射、查询与事务控制
- 创建笔记、保存笔记、生成版本快照等关键操作使用事务
- 自动保存接口支持“内容相同不落库”
- 可在笔记表增加 `revision_no` 或比较 `updated_at` 做乐观并发控制

#### 日志与观测
- 每次请求生成 `requestId`
- 关键行为写入操作日志
- 日志以 JSON 结构输出，便于 Vercel 日志平台检索
- 后续可接入外部告警与监控平台

### 9.8 数据落地与查询策略
- 文件夹树采用邻接表模型，辅以 `ancestor_path` 冗余字段，兼顾简单性与查询效率
- 笔记正文同时存 `content_json`、`content_html`、`content_text`
- 搜索第一阶段基于 PostgreSQL `ILIKE` 或全文检索
- 历史版本采用独立快照表 `note_revisions`
- 删除操作默认软删除，便于回收站恢复

### 9.9 面向 Vercel 的设计约束
- 后端应拆成细粒度 API 路由，避免单一巨大服务入口
- Function 内尽量避免长耗时任务与大文件处理
- 数据库必须使用托管服务，不能依赖本地文件持久化
- 应优先将部署地域与数据库地域保持一致，降低函数到数据库延迟
- 需要关注连接池策略，避免 Serverless 高频冷启动导致连接耗尽
- 非实时关键任务可后续通过队列或定时任务平台异步处理

### 9.10 自动保存链路设计
1. 前端编辑器防抖后提交保存请求
2. API 层完成 token 解析、用户身份校验、参数校验
3. notes 模块校验笔记归属与内容是否变化
4. 无变化则直接返回最新状态，减少函数执行和数据库写入
5. 有变化则事务更新 `notes`
6. 满足版本策略时写入 `note_revisions`
7. 返回新的 `updatedAt`、`revisionNo`、`wordCount`

版本策略建议：
- 每次手动保存生成版本
- 自动保存按时间窗口生成版本，例如 5 分钟最多一个快照
- 避免每次击键都写历史表

### 9.11 部署与环境规划
- `dev`：本地开发，前端 + 本地 API + Docker 数据库
- `preview`：Vercel Preview，用于联调与功能验证
- `prod`：Vercel Production，连接正式数据库与缓存服务

部署建议：
- 前端与 API 一体部署到 Vercel
- 数据库使用托管 PostgreSQL
- Redis 使用托管服务
- 环境变量通过 Vercel Project Settings 管理
- Prisma migration 在 CI/CD 或部署前执行

### 9.12 接口兼容与迁移策略
为减少前端返工，建议采用“接口契约优先”的迁移方式：
- 第一步：保持现有 `/api/v1` 路径与响应结构不变
- 第二步：先把当前 JSON 持久化替换为 Prisma + PostgreSQL
- 第三步：按认证、用户、文件夹、笔记顺序整理为模块化 API 路由
- 第四步：新增 refresh token、版本历史、回收站接口
- 第五步：完成 Vercel Preview 与 Production 部署切换

### 9.13 为什么该方案更适合当前阶段
- 与现有前端 TypeScript 技术栈一致，迁移成本最低
- 更贴合 Vercel 的部署模型，减少额外运维工作
- 比 Java 独立服务更轻，更适合当前 MVP 到正式版过渡阶段
- 仍保留数据库、会话、日志、版本管理等正式后端能力

## 10. 测试与验证情况

### 10.1 已完成
- 后端接口测试已覆盖认证、会话刷新、笔记版本链路、回收站与操作日志
- 前端类型检查通过
- 前端 lint 通过
- 前后端基础联调已跑通
- 后端 TypeScript 类型检查通过
- 后端已完成 Prisma Client 生成与 SQLite 运行时初始化
- 已完成前后端本地启动与联通验证，确认 `Vite 代理 -> API -> SQLite` 读写链路可用

### 10.2 当前待继续验证
- 登录后进入工作台的稳定性
- 自动保存与页面刷新是否彻底解耦
- Vite 忽略后端数据文件后，是否已完全消除整页重载
- Prisma CLI `db push` 与正式 migration 流程在当前环境下的可用性
- PostgreSQL / MySQL 正式库切换与部署链路验证

### 10.3 正式后端测试要求
- 单元测试：核心业务规则、密码校验、目录树逻辑、版本策略
- 集成测试：认证链路、笔记 CRUD、自动保存、权限隔离
- 接口测试：OpenAPI 契约与前端联调回归
- 数据库测试：迁移脚本、索引、事务回滚
- 部署测试：Vercel Preview 环境接口可用性与数据库连接稳定性

## 11. 里程碑建议

### 里程碑 1：稳定当前 MVP 联调版
- 修复登录后工作台重复刷新问题
- 完成本地开发流程收口
- 补齐启动说明和联调说明

### 里程碑 2：完成轻量化后端基础工程
- 初始化 TypeScript API 层、Prisma、PostgreSQL、Redis
- 建立认证、用户、文件夹、笔记四个核心模块
- 补齐统一响应、异常处理、鉴权中间件、OpenAPI 文档

当前状态：
- 已完成模块化后端分层改造
- 已完成 Prisma + SQLite 本地持久化落地
- 已完成 refresh token、回收站、历史版本、操作日志主链路
- PostgreSQL / MySQL 正式库接入与 migration 工具链仍在推进

### 里程碑 3：完成数据库正式落地与 Vercel 适配
- 完成表结构、索引、迁移脚本
- 接通前端主链路联调
- 完成登录、目录、笔记、设置等核心接口替换
- 打通 Vercel Preview 环境

### 里程碑 4：补齐正式后端能力
- Refresh Token 与会话管理
- 回收站
- 历史版本
- 操作日志
- Vercel Production 正式部署

当前状态：
- 前四项核心能力已在本地数据库版后端落地
- 正在推进部署适配、migration 流程和正式数据库切换

## 12. 结论
NoteFlow 当前已经从“前端原型”进入“前后端可联调 MVP”阶段。考虑到后续需要轻量化上线并适配 Vercel，后端正式化方案应以“Node.js/TypeScript + Vercel Functions + PostgreSQL + Prisma + 可迁移接口契约”为主线，逐步完成从本地 JSON 持久化到正式数据库后端的升级。

## 13. 最近补充
- 2026-03-26：排查并修复前端页面中文乱码问题，确认根因不在 React 渲染层，而在后端 SQLite 示例种子数据中存在历史乱码文本。
- 2026-03-26：后端启动时会自动修复演示账号下已落库的乱码目录名与笔记标题/摘要，避免旧库继续把脏数据返回给前端。
- 2026-03-26：前后端联通复核通过，`/api/v1/folders/tree` 与 `/api/v1/notes` 返回中文内容正常，Vite 代理链路可正常展示修复后的数据。
- 2026-03-26：后端数据库目标从本地 SQLite 切换为 Neon PostgreSQL，运行时连接使用池化 `DATABASE_URL`，Prisma CLI 使用直连 `DIRECT_URL`。
- 2026-03-26：数据库初始化逻辑不再在应用启动时手写建表，改为依赖 Prisma 对 Neon 执行 `db push` / migration 后再启动服务。
