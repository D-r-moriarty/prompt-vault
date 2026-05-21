const App = {
    async init() {
        const token = API.getToken();

        if (token) {
            await this.loadApp(token);
        } else {
            this.showLogin();
        }

        this.bindEvents();
        this.bindStoreListener();
    },

    showLogin() {
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('main-view').classList.add('hidden');
    },

    async loadApp(token) {
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('main-view').classList.remove('hidden');

        Store.setState({ token });

        try {
            const gist = await API.getPromptsGist(token);
            if (gist) {
                Store.loadFromGist(gist);
            } else {
                const data = await API.createPromptsGist(token, Store.getEmptyData());
                Store.loadFromGist({ id: data.id, filename: 'prompts.json', content: data.content });
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            Components.showToast('加载数据失败，请检查 Token 是否有效', 'error');
            API.logout();
        }
    },

    bindEvents() {
        // 创建 Token 按钮
        document.getElementById('create-token').addEventListener('click', () => {
            API.openTokenPage();
        });

        // 提交 Token
        document.getElementById('submit-token').addEventListener('click', () => {
            const tokenInput = document.getElementById('token-input');
            const token = tokenInput.value.trim();

            if (!token) {
                Components.showToast('请输入 Token', 'error');
                return;
            }

            // 验证 Token 格式 (应该以 ghp_ 开头)
            if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
                Components.showToast('Token 格式不正确', 'error');
                return;
            }

            API.saveToken(token);
            this.loadApp(token);
        });

        // 新建提示词
        document.getElementById('new-prompt').addEventListener('click', async () => {
            const prompt = Store.addPrompt({ title: '新提示词' });
            await this.syncToGist();
            Store.setState({ activePromptId: prompt.id });
        });

        // 保存提示词
        document.getElementById('save-prompt').addEventListener('click', async () => {
            const active = Store.getActivePrompt();
            if (!active) return;

            const title = document.getElementById('prompt-title').value;
            const category = document.getElementById('prompt-category').value;
            const tags = document.getElementById('prompt-tags').value.split(',').map(t => t.trim()).filter(Boolean);
            const content = document.getElementById('prompt-content').value;

            Store.updatePrompt(active.id, { title, category, tags, content });
            await this.syncToGist();
            Components.showToast('保存成功', 'success');
        });

        // 复制提示词
        document.getElementById('copy-prompt').addEventListener('click', async () => {
            const content = document.getElementById('prompt-content').value;
            await navigator.clipboard.writeText(content);
            Components.showToast('已复制到剪贴板', 'success');
        });

        // 删除提示词
        document.getElementById('delete-prompt').addEventListener('click', async () => {
            const active = Store.getActivePrompt();
            if (!active) return;

            if (confirm('确定要删除这个提示词吗？')) {
                Store.deletePrompt(active.id);
                await this.syncToGist();
                Components.showToast('已删除', 'success');
            }
        });

        // 搜索
        document.getElementById('search').addEventListener('input', (e) => {
            const results = Store.searchPrompts(e.target.value);
            Components.renderPromptList(results, Store.state.activePromptId);
        });
    },

    bindStoreListener() {
        Store.subscribe((state) => {
            Components.renderPromptList(state.prompts, state.activePromptId);
            Components.renderCategoryList(state.categories);
            Components.renderEditor(Store.getActivePrompt());
        });
    },

    async syncToGist() {
        const { token, gistId, filename } = Store.state;
        if (!token || !gistId) return;

        Store.setState({ isSyncing: true });
        try {
            await API.updatePromptsGist(token, gistId, filename, Store.exportData());
        } catch (error) {
            console.error('Sync failed:', error);
            Components.showToast('同步失败', 'error');
        } finally {
            Store.setState({ isSyncing: false });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());