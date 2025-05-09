# 周报系统 - 后端服务

## 项目简介
这是一个基于Node.js和Express构建的周报系统后端服务，提供微信登录认证、周报数据存储和API接口服务。

## 功能特性
- 微信扫码登录认证
- 周报数据存储与管理
- RESTful API接口
- 数据库集成

## 安装步骤
1. 确保已安装Node.js (>=16.x)
2. 安装依赖:
```bash
npm install
```

## 运行方法
开发模式:
```bash
node app.js
```

生产环境:
```bash
NODE_ENV=production node app.js
```

## 注意事项
1. 需要配置微信开发者账号信息
2. 需要配置数据库连接信息
3. 生产环境请配置HTTPS