# SportManager · 运动管理 App

[![CI](https://github.com/yxtman/sport-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/yxtman/sport-manager/actions/workflows/ci.yml)

基于 uni-app + Spring Boot 3 的运动记录与社交应用：游客可在本地记录运动并查看统计，注册登录后通过 JWT 接入云端好友动态。

> 项目暂未部署公网演示地址。前端和后端需要本机启动：HBuilderX 点击“运行到浏览器”后，通常会在 `http://localhost:5173/` 打开 H5 页面。

## 自动化测试

后端测试使用 H2 内存数据库，不需要本机 MySQL：

```bash
mvn -f sport-api/pom.xml test
```

## 功能特性

- **运动记录**：支持多种运动类型，记录时长、距离、心率、卡路利（可自动估算）、主观强度与备注
- **数据统计**：周/月/年视图、运动类型分布、跑步平均配速、周目标进度，图表使用原生 canvas 自绘
- **成就系统**：基于累计运动数据解锁成就
- **账号体系**：注册、登录、JWT 会话管理、修改昵称、修改密码
- **好友社交**：用户搜索、好友申请（发起/接受/拒绝）、拉黑、分享运动记录、动态流、点赞、评论
- **智能建议**：根据近期运动数据给出训练建议

## 系统架构

```
uni-app 客户端（H5 / 微信小程序 / App）
        │  HTTP + JWT（登录与社交模块）
        ▼
Spring Boot 3 后端（端口 8081）
   /api/auth/*   认证与个人资料
   /api/social/* 好友与动态
        │  Spring Data JPA
        ▼
MySQL 8（用户、好友关系、动态、点赞、评论）
```

存储策略：运动记录、统计、成就等在未登录时存于本机 localStorage；账号、好友、动态存于 MySQL。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | uni-app (Vue 2)、uni-ui、原生 canvas 图表 |
| 后端 | Spring Boot 3.2.5、Spring Security、Spring Data JPA |
| 认证 | JJWT 0.12.5（HS256） |
| 数据库 | MySQL 8 |

## 目录结构

```
├── pages/            # 业务页面（首页/记录/统计/我的/社交/登录注册）
├── components/       # 自绘统计图表组件
├── utils/            # API 配置、会话、统计、成就、智能建议
├── store/            # Vuex 状态管理
├── uni_modules/      # uni-ui 组件库
├── docs/             # 架构设计文档
└── sport-api/        # Spring Boot 后端
    └── src/main/java/com/sport/api/
        ├── auth/     # 注册登录、JWT、资料
        ├── social/   # 好友、动态、点赞、评论、拉黑
        └── config/   # 安全与异常处理
```

## 快速开始

### 后端（sport-api）

1. 安装 JDK 17、Maven、MySQL 8。
2. 创建数据库：

   ```bash
   mysql -u root -p < sport-api/src/main/resources/db/init.sql
   ```

3. 配置环境变量（密钥不要写进代码）：

   ```powershell
   $env:SPORT_DB_PASSWORD = "你的MySQL密码"
   $env:SPORT_JWT_SECRET = "至少32字节的随机字符串"
   ```

4. 启动：

   ```bash
   cd sport-api
   mvn spring-boot:run
   ```

### 前端（uni-app）

1. 使用 HBuilderX 导入项目根目录。
2. H5 模式直接运行，接口通过 manifest 代理到后端 8081 端口。
3. 真机/模拟器调试时，把 `utils/apiConfig.js` 中的 `LAN_BASE_URL` 改为电脑局域网 IP。
4. 微信小程序运行需在 `manifest.json` 中填入自己的小程序 appid。

## 第三方说明

前端基于 uni-app 框架开发，初始工程参考 DCloud 官方 hello-uniapp 模板，`uni_modules/` 来自 uni-ui，详见 `THIRD_PARTY_NOTICES.md`。
