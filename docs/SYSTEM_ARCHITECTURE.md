# 运动管理 APP - 功能模块设计文档

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        运动管理 APP (uni-app)                     │
├─────────────────────────────────────────────────────────────────┤
│  首页 Home  │  记录 Record  │  统计 Stats  │  我的 Profile       │
│  登录/注册 Auth  │  好友中心 Friends  │  好友动态 Feed            │
├─────────────────────────────────────────────────────────────────┤
│  Vuex 状态管理  │  localStorage 本地持久化（运动记录/设置/成就）   │
│  utils/authSession.js  │  utils/socialApi.js  │  utils/storage.js │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP + JWT (登录/社交)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot 3 后端 (sport-api, 端口 8081)            │
│  /api/auth/*  认证与个人资料  │  /api/social/*  好友与动态        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ JPA
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MySQL 8 数据库                           │
│  app_user  │  friendship  │  user_block  │  shared_sport_record  │
│  sport_record_like  │  sport_record_comment                      │
└─────────────────────────────────────────────────────────────────┘
```

**存储策略说明：**

| 数据类型 | 是否需登录 | 存储位置 |
|---------|-----------|---------|
| 运动记录、统计、成就、周目标等 | 否（游客可用） | 本机 localStorage，按游客/账号分 key |
| 注册/登录、个人资料、改密码 | 是 | MySQL + JWT |
| 好友、动态、点赞评论 | 是 | MySQL（运动记录同步到 `shared_sport_record`） |

---

## 核心功能模块详解

### 1. 认证与个人资料模块

**功能描述**：用户注册、登录及账号资料维护。

**已实现功能：**
- 用户注册（用户名 3–64 位、密码至少 6 位、可选昵称）
- 用户登录（用户名 + 密码，返回 JWT）
- 获取当前用户信息（`GET /api/auth/me`）
- **个人资料页**：查看用户名、注册时间，修改昵称（`PATCH /api/auth/profile`）
- **修改密码**：验证原密码后更新（`POST /api/auth/change-password`）
- 退出登录（清除本地 JWT）

**相关页面：**
- `pages/auth/register.vue` — 注册
- `pages/auth/login.vue` — 登录
- `pages/profile/account.vue` — 个人资料（改昵称、改密码）
- `pages/profile/index.vue` — 我的（入口「资料」）

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| PATCH | `/api/auth/profile` | 修改昵称 |
| POST | `/api/auth/change-password` | 修改密码 |

---

### 2. 首页模块

**功能描述**：运动数据概览与快捷入口。

**主要功能：**
- 今日/本周运动汇总
- 最近运动记录预览
- 训练计划进度提示

**相关页面：** `pages/home/index.vue`  
**数据来源：** Vuex + localStorage

---

### 3. 运动记录模块

**功能描述**：记录与管理运动数据。

**主要功能：**
- 新增/编辑/删除运动记录
- 支持跑步子类型、心率、配速、打卡图等
- 登录后自动同步到云端（供好友动态展示）
- 删除本地记录时同步删除云端动态

**相关页面：**
- `pages/record/index.vue`
- `pages/record/edit.vue`

**本地存储 key：** `sport_manager_state_v1`（游客/用户分 key）

---

### 4. 统计分析模块

**功能描述**：运动数据分析与可视化。

**主要功能：**
- 近 7 天 / 30 天 / 本年统计
- 运动类型筛选
- 折线图、柱状图、环形图
- 配速区间、心率区间、周目标完成度

**相关页面：** `pages/stats/index.vue`  
**工具：** `utils/statsAnalytics.js`、`components/stats-chart/stats-chart.vue`

---

### 5. 个人中心模块

**功能描述**：本地设置、成就与社交入口。

**主要功能：**
- 账号状态展示，跳转登录/个人资料/退出
- 周运动目标、体重、最大心率/年龄设置
- 每周跑步训练计划预设
- 成就中心入口
- 好友中心、好友动态入口
- 清空本机全部数据

**相关页面：**
- `pages/profile/index.vue`
- `pages/profile/achievements.vue`
- `pages/profile/account.vue`

---

### 6. 社交模块

**功能描述**：好友关系管理与运动动态互动。

**已实现功能：**
- 搜索用户（排除已拉黑用户）
- **好友申请**：发送申请 → 对方同意/拒绝（非一键加好友）
- **删除好友**：解除已接受的好友关系
- **拉黑 / 取消拉黑**：拉黑后自动解除好友关系，双方无法搜索、申请、查看动态
- 好友动态 Feed（本人 + 好友的运动记录）
- 点赞、评论
- 运动记录云端同步与 prune 对齐

**相关页面：**
- `pages/social/friends.vue` — 好友中心
- `pages/social/feed.vue` — 好友动态

**后端接口（节选）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/social/users/search` | 搜索用户 |
| GET | `/api/social/friends` | 好友列表 |
| POST | `/api/social/friends/{id}` | 发送好友申请 |
| DELETE | `/api/social/friends/{id}` | 删除好友 |
| GET/POST/DELETE | `/api/social/blocks` 等 | 黑名单管理 |
| GET | `/api/social/feed` | 动态流 |
| POST | `/api/social/records` | 同步运动记录 |
| DELETE | `/api/social/records/{id}` | 删除云端动态 |

---

## 数据库表结构（MySQL）

### app_user — 用户表

| 字段 | 说明 |
|------|------|
| id | 主键 |
| username | 用户名（唯一） |
| password_hash | BCrypt 加密密码 |
| nickname | 昵称 |
| created_at | 注册时间 |

### friendship — 好友关系表

| 字段 | 说明 |
|------|------|
| id | 主键 |
| requester_id | 申请人 |
| addressee_id | 被申请人 |
| status | pending / accepted |
| created_at | 创建时间 |

### user_block — 拉黑表

| 字段 | 说明 |
|------|------|
| id | 主键 |
| blocker_id | 拉黑方 |
| blocked_id | 被拉黑方 |
| created_at | 拉黑时间 |

### shared_sport_record — 云端运动动态

存储登录用户同步到社交层的运动记录（含类型、时长、距离、打卡图等）。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | uni-app (Vue 3) | H5 / 小程序 / App 跨端 |
| 状态管理 | Vuex | 运动记录与设置 |
| UI | uni-ui | 表单、输入等组件 |
| 本地存储 | localStorage | 运动数据与成就（游客/用户隔离） |
| 后端 | Spring Boot 3 + JPA | REST API |
| 认证 | JWT + BCrypt | Bearer Token |
| 数据库 | MySQL 8 | 用户与社交数据 |

---

## 功能实现阶段

### 第一阶段（核心）— 已完成
- 用户注册/登录
- 运动记录增删改
- 首页与本地持久化
- 统计与图表
- 成就系统

### 第二阶段（增强）— 已完成
- Spring Boot + MySQL 自建后端
- 好友申请、动态、点赞评论
- 个人资料页、改昵称、改密码
- 删除好友、拉黑/取消拉黑
- 运动记录云端同步

### 可扩展方向
- 头像上传
- 消息通知
- 数据导出
- HTTPS 部署

---

## 典型使用场景

**场景 1：修改个人资料**  
登录 → 我的 → 资料 → 修改昵称或密码 → 保存

**场景 2：管理好友**  
好友中心 → 搜索用户 → 发送申请 → 对方同意后互看动态；可对好友「删除」或「拉黑」

**场景 3：记录并分享运动**  
新增运动记录 → 若已登录则同步到云端 → 好友在「好友动态」中可见

---

## 总结

本系统采用 **前端本地存储 + 后端 MySQL** 的混合架构：运动数据以本机为主、登录后扩展社交能力。模块化设计便于答辩演示与后续扩展。

**文档版本：** 1.1 | **最后更新：** 2026 年 6 月
