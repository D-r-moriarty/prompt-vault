# 提示词保管箱 - GitHub OAuth 配置

## 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写以下信息：
   - Application name: Prompt Vault
   - Homepage URL: http://localhost:8080
   - Authorization callback URL: http://localhost:8080/callback.html

4. 注册后获取 Client ID 和 Client Secret

## 配置 API

编辑 `web/js/api.js`，替换以下值：

```javascript
const API = {
    CLIENT_ID: 'your_client_id_here',
    // ...
};
```

**注意**: 由于 OAuth token 交换需要 Client Secret，建议部署一个简单的后端服务来中转，或者使用 GitHub 的设备流认证。

## 本地运行

```bash
# 使用任意静态服务器
npx serve web
# 或
python -m http.server 8080 --directory web
```

## 部署到 GitHub Pages

1. 将 `web` 目录内容推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 更新 GitHub OAuth App 的 callback URL