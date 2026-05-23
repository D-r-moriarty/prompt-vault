// Main App - Updated with All Features
const App = {
    currentView: 'grid',
    importData: null,
    selectedIcon: '📁',
    editingCategoryId: null,

    async init() {
        const token = API.getToken();

        // Show loading state
        const loadingState = document.getElementById('loading-state');
        if (loadingState) loadingState.classList.remove('hidden');

        // Always bind events and store listener first
        this.bindStoreListener();
        this.bindEvents();

        if (token) {
            await this.loadApp(token);
        } else {
            this.showLogin();
        }
    },

    showLogin() {
        document.getElementById('app').innerHTML = `
            <div class="login-page">
                <div class="login-card">
                    <div class="login-logo">🔧</div>
                    <h1 class="login-title">提示词工坊</h1>
                    <p class="login-subtitle">管理和整理你的 AI 提示词</p>

                    <div class="login-instructions">
                        <ol>
                            <li>点击下方按钮创建 GitHub Personal Access Token</li>
                            <li>在 GitHub 勾选 <strong>gist</strong> 权限</li>
                            <li>复制生成的 Token，粘贴到下方</li>
                        </ol>
                    </div>

                    <button class="btn btn-secondary" id="create-token-btn" style="width: 100%; margin-bottom: 1rem;">
                        📝 创建 Token
                    </button>

                    <div class="token-input-group">
                        <input type="text" class="token-input" id="token-input" placeholder="粘贴 Token (ghp_xxx 或 github_pat_xxx)">
                    </div>

                    <button class="btn btn-primary" id="login-btn" style="width: 100%;">
                        确认登录
                    </button>
                </div>
            </div>
        `;

        document.getElementById('create-token-btn').addEventListener('click', () => {
            API.openTokenPage();
        });

        document.getElementById('login-btn').addEventListener('click', () => {
            const token = document.getElementById('token-input').value.trim();
            if (!token) {
                Components.showToast('请输入 Token', 'error');
                return;
            }
            if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
                Components.showToast('Token 格式不正确', 'error');
                return;
            }
            API.saveToken(token);
            this.loadApp(token);
        });
    },

    async loadApp(token) {
        Store.setState({ token });

        try {
            const gist = await API.getPromptsGist(token);
            if (gist) {
                Store.loadFromGist(gist);
            } else {
                const data = await API.createPromptsGist(token, Store.getEmptyData());
                Store.loadFromGist({ id: data.id, filename: 'prompts.json', content: data.content });
            }
            this.updateSyncStatus('已同步', false);
        } catch (error) {
            console.error('Failed to load data:', error);
            Components.showToast('加载数据失败，请检查 Token', 'error');
            API.logout();
        }
    },

    bindEvents() {
        const safeOn = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };

        safeOn('select-mode-btn', 'click', () => Components.toggleSelectMode());
        safeOn('settings-btn', 'click', () => this.openSettings());
        safeOn('add-category-btn', 'click', () => this.openModal('add-category-modal'));
        safeOn('new-prompt-btn', 'click', () => this.createNewPrompt());

        safeOn('search', 'input', (e) => {
            const results = Store.searchPrompts(e.target.value);
            Components.renderPromptGrid(results, Store.state.activePromptId);
        });

        safeOn('import-btn', 'click', () => this.openModal('import-modal'));
        safeOn('export-btn', 'click', () => this.openModal('export-modal'));

        safeOn('ai-btn', 'click', () => {
            const panel = document.getElementById('ai-panel');
            if (panel) panel.classList.add('open');
        });

        safeOn('ai-close', 'click', () => {
            const panel = document.getElementById('ai-panel');
            if (panel) panel.classList.remove('open');
        });

        safeOn('ai-organize', 'click', () => this.runAIOrganize());
        safeOn('ai-detect-duplicates', 'click', () => this.runAIDuplicates());
        safeOn('ai-optimize-names', 'click', () => this.runAIOptimize());

        safeOn('editor-close', 'click', () => this.closeModal('editor-modal'));
        safeOn('editor-cancel', 'click', () => this.closeModal('editor-modal'));
        safeOn('editor-save', 'click', () => this.savePrompt());
        safeOn('editor-delete', 'click', () => this.deleteCurrentPrompt());
        safeOn('editor-copy', 'click', () => this.copyPrompt());

        safeOn('import-close', 'click', () => this.closeModal('import-modal'));
        safeOn('import-cancel', 'click', () => this.closeModal('import-modal'));
        safeOn('import-confirm', 'click', () => this.importPrompts());

        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                this.handleFile(file);
            });
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                this.handleFile(file);
            });
        }

        safeOn('export-close', 'click', () => this.closeModal('export-modal'));
        safeOn('export-cancel', 'click', () => this.closeModal('export-modal'));
        safeOn('export-confirm', 'click', () => this.exportPrompts());

        // Emoji selection for new category
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.style.border = 'none');
                btn.style.border = '2px solid var(--primary)';
                this.selectedIcon = btn.dataset.icon;
            });
        });

        // Enable text selection in editor inputs - no special handling needed
        // The browser handles Shift+Arrow natively, we just don't interfere

        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                if (e.key === 'n') {
                    e.preventDefault();
                    this.createNewPrompt();
                }
                if (e.key === 'f') {
                    e.preventDefault();
                    const search = document.getElementById('search');
                    if (search) search.focus();
                }
                if (e.key === 'i') {
                    e.preventDefault();
                    this.openModal('import-modal');
                }
                if (e.key === 'e') {
                    e.preventDefault();
                    this.openModal('export-modal');
                }
                if (e.key === 'k') {
                    e.preventDefault();
                    const panel = document.getElementById('ai-panel');
                    if (panel) panel.classList.toggle('open');
                }
            }
            if (e.key === 'Escape') {
                this.closeModal('editor-modal');
                this.closeModal('import-modal');
                this.closeModal('export-modal');
                this.closeModal('add-category-modal');
                this.closeModal('settings-modal');
                this.closeModal('move-modal');
                this.closeModal('edit-category-modal');
                const aiPanel = document.getElementById('ai-panel');
                if (aiPanel) aiPanel.classList.remove('open');
            }
        });
    },

    bindStoreListener() {
        Store.subscribe((state) => {
            Components.renderCategoryTree(state.categories, state.prompts);
            Components.renderPromptGrid(state.prompts, state.activePromptId);
            Components.updateStats(state.prompts.length, Store.getMonthlyCount());
            Components.populateCategorySelect();
        });
    },

    createNewPrompt() {
        const prompt = Store.addPrompt({ title: '新提示词' });
        Store.setState({ activePromptId: prompt.id });
        this.openEditor(prompt.id);
        this.syncToGist();
    },

    openEditor(promptId) {
        const prompt = Store.state.prompts.find(p => p.id === promptId);
        if (!prompt) return;

        const isNew = !prompt.content && prompt.title === '新提示词';

        document.getElementById('editor-title').textContent = isNew ? '新建提示词' : '编辑提示词';
        document.getElementById('prompt-title-input').value = prompt.title;
        document.getElementById('prompt-content-input').value = prompt.content;
        document.getElementById('prompt-category-select').value = prompt.category || '';
        document.getElementById('prompt-tags-input').value = (prompt.tags || []).join(', ');
        document.getElementById('created-at').textContent = `创建于: ${new Date(prompt.createdAt).toLocaleDateString('zh-CN')}`;
        document.getElementById('usage-count').textContent = prompt.usageCount ? `使用 ${prompt.usageCount} 次` : '';
        const deleteBtn = document.getElementById('editor-delete');
        if (deleteBtn) deleteBtn.style.display = isNew ? 'none' : 'block';

        this.openModal('editor-modal');
    },

    savePrompt() {
        const title = document.getElementById('prompt-title-input').value.trim();
        const content = document.getElementById('prompt-content-input').value;
        const category = document.getElementById('prompt-category-select').value;
        const tags = document.getElementById('prompt-tags-input').value.split(',').map(t => t.trim()).filter(Boolean);

        if (!title) {
            Components.showToast('请输入标题', 'error');
            return;
        }

        const activeId = Store.state.activePromptId;
        Store.updatePrompt(activeId, { title, content, category, tags });
        Store.incrementUsage(activeId);

        this.syncToGist();
        this.closeModal('editor-modal');
        Components.showToast('已保存', 'success');
    },

    deleteCurrentPrompt() {
        const active = Store.getActivePrompt();
        if (!active) return;

        if (confirm('确定要删除这个提示词吗？')) {
            Store.deletePrompt(active.id);
            this.syncToGist();
            this.closeModal('editor-modal');
            Components.showToast('已删除', 'success');
        }
    },

    copyPrompt() {
        const title = document.getElementById('prompt-title-input').value.trim();
        const content = document.getElementById('prompt-content-input').value;
        const fullText = `${title}\n\n${content}`;

        navigator.clipboard.writeText(fullText).then(() => {
            Store.incrementUsage(Store.state.activePromptId);
            this.syncToGist();
            Components.showToast('已复制到剪贴板', 'success');
        }).catch(err => {
            Components.showToast('复制失败', 'error');
        });
    },

    addCategory() {
        const nameInput = document.getElementById('new-category-name');
        const name = nameInput.value.trim();

        if (!name) {
            Components.showToast('请输入分类名称', 'error');
            return;
        }

        Store.addCategory(name, this.selectedIcon);
        this.syncToGist();
        this.closeModal('add-category-modal');
        nameInput.value = '';
        this.selectedIcon = '📁';
        Components.showToast('分类已创建', 'success');
    },

    openEditCategory(categoryId) {
        const category = Store.state.categories.find(c => c.id === categoryId);
        if (!category) return;

        this.editingCategoryId = categoryId;
        document.getElementById('edit-category-name').value = category.name;
        this.renderEditCategoryIcons(category.icon);
        this.openModal('edit-category-modal');
    },

    renderEditCategoryIcons(selectedIcon) {
        const icons = ['📝', '💡', '🎨', '📖', '🔧', '💬', '📊', '🌐', '🎯', '📁', '🚀', '⭐', '🔥', '💎', '🎵', '🎮', '📷', '🎬', '💼', '🏆'];
        const container = document.getElementById('edit-category-icons');
        if (!container) return;

        container.innerHTML = icons.map(icon => `
            <button class="emoji-btn ${selectedIcon === icon ? 'selected' : ''}" data-icon="${icon}" onclick="App.selectEditIcon('${icon}')">${icon}</button>
        `).join('');
    },

    selectEditIcon(icon) {
        document.querySelectorAll('#edit-category-icons .emoji-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`#edit-category-icons .emoji-btn[data-icon="${icon}"]`).classList.add('selected');
        this.selectedIcon = icon;
    },

    saveEditingCategory() {
        const name = document.getElementById('edit-category-name').value.trim();
        if (!name) {
            Components.showToast('请输入分类名称', 'error');
            return;
        }

        const updates = { name, icon: this.selectedIcon };
        Store.updateCategory(this.editingCategoryId, updates);
        this.syncToGist();
        this.closeModal('edit-category-modal');
        Components.showToast('分类已更新', 'success');
    },

    deleteEditingCategory() {
        if (!this.editingCategoryId) return;

        const category = Store.state.categories.find(c => c.id === this.editingCategoryId);
        if (!category) return;

        if (category.isSystem) {
            Components.showToast('不能删除系统分类', 'error');
            return;
        }

        if (confirm(`确定要删除分类"${category.name}"吗？该分类下的提示词将移至未分类。`)) {
            Store.deleteCategory(this.editingCategoryId);
            this.syncToGist();
            this.closeModal('edit-category-modal');
            Components.showToast('分类已删除', 'success');
        }
    },

    openSettings() {
        Components.renderSettings();
        this.openModal('settings-modal');
    },

    saveSettings() {
        const provider = document.getElementById('ai-provider')?.value;
        const apiKey = document.getElementById('ai-api-key')?.value;

        Store.state.settings.aiProvider = provider || 'claude';
        Store.state.settings.aiApiKey = apiKey || '';

        this.syncToGist();
        this.closeModal('settings-modal');
        Components.showToast('设置已保存', 'success');
    },

    async runAIOrganize() {
        Components.showToast('正在分析提示词...', 'ai');
        const settings = Store.state.settings;
        await AI.analyzePrompts(Store.state.prompts, settings.aiApiKey, settings.aiProvider);
        AI.renderSuggestions(document.getElementById('suggestions-list'));
        Components.showToast(`发现 ${AI.suggestions.length} 条建议`, 'ai');
    },

    async runAIDuplicates() {
        Components.showToast('正在检测重复...', 'ai');
        AI.suggestions = [];
        const groups = AI.findSimilarTitles(Store.state.prompts);
        groups.forEach(g => {
            AI.suggestions.push({
                type: 'similar',
                prompts: g
            });
        });
        AI.renderSuggestions(document.getElementById('suggestions-list'));
        Components.showToast(groups.length > 0 ? `发现 ${groups.length} 组可能重复` : '没有发现重复的提示词', groups.length > 0 ? 'ai' : 'success');
    },

    async runAIOptimize() {
        Components.showToast('正在优化命名...', 'ai');
        AI.suggestions = [];
        Store.state.prompts.forEach(prompt => {
            const suggested = AI.suggestBetterTitle(prompt);
            if (suggested) {
                AI.suggestions.push({
                    type: 'title-hint',
                    prompt,
                    suggestedTitle: suggested
                });
            }
        });
        AI.renderSuggestions(document.getElementById('suggestions-list'));
        Components.showToast(AI.suggestions.length > 0 ? `发现 ${AI.suggestions.length} 条可优化标题` : '没有发现可优化的标题', 'ai');
    },

    batchMoveToCategory() {
        Components.populateCategorySelect();
        this.openModal('move-modal');
    },

    confirmMove() {
        const category = document.getElementById('move-to-category')?.value;
        const ids = Array.from(Components.selectedPrompts);
        Store.movePromptsToCategory(ids, category);
        this.syncToGist();
        Components.clearSelection();
        this.closeModal('move-modal');
        Components.showToast(`已将 ${ids.length} 条移动到分类`, 'success');
    },

    batchDelete() {
        const ids = Array.from(Components.selectedPrompts);
        if (confirm(`确定要删除选中的 ${ids.length} 条提示词吗？`)) {
            Store.deletePrompts(ids);
            this.syncToGist();
            Components.clearSelection();
            Components.showToast(`已删除 ${ids.length} 条`, 'success');
        }
    },

    async syncToGist() {
        const { token, gistId, filename } = Store.state;
        if (!token || !gistId) return;

        this.updateSyncStatus('同步中...', true);
        try {
            await API.updatePromptsGist(token, gistId, filename, Store.exportData());
            this.updateSyncStatus('已同步', false);
        } catch (error) {
            console.error('Sync failed:', error);
            this.updateSyncStatus('同步失败', false);
            Components.showToast('同步失败', 'error');
        }
    },

    updateSyncStatus(text, syncing) {
        const syncText = document.getElementById('sync-text');
        const syncDot = document.getElementById('sync-dot');
        if (syncText) syncText.textContent = text;
        if (syncDot) {
            if (syncing) {
                syncDot.classList.add('syncing');
            } else {
                syncDot.classList.remove('syncing');
            }
        }
    },

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('hidden');
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    },

    handleFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let prompts = [];

            if (file.name.endsWith('.json')) {
                try {
                    const data = JSON.parse(content);
                    prompts = Array.isArray(data) ? data : (data.prompts || []);
                } catch (err) {
                    Components.showToast('JSON 格式错误', 'error');
                    return;
                }
            } else if (file.name.endsWith('.md')) {
                const sections = content.split(/^---$/m);
                prompts = sections.filter(s => s.trim()).map(s => {
                    const lines = s.trim().split('\n');
                    return {
                        title: lines[0]?.replace(/^#*\s*/, '') || '未命名',
                        content: lines.slice(1).join('\n').trim()
                    };
                });
            } else if (file.name.endsWith('.csv')) {
                const lines = content.split('\n');
                prompts = lines.slice(1).map(line => {
                    const [title, content, category] = line.split(',');
                    return { title: title?.trim(), content: content?.trim(), category: category?.trim() };
                }).filter(p => p.title);
            }

            this.importData = prompts;
            Components.renderImportPreview(prompts);
        };
        reader.readAsText(file);
    },

    importPrompts() {
        if (!this.importData || this.importData.length === 0) {
            Components.showToast('没有要导入的数据', 'error');
            return;
        }

        const category = document.getElementById('import-category-select')?.value;
        const checkboxes = document.querySelectorAll('#import-preview .import-checkbox:checked');
        const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
        const selectedPrompts = selectedIndices.map(i => {
            const prompt = this.importData[i];
            // Apply selected category if not empty
            if (category) {
                prompt.category = category;
            }
            return prompt;
        });

        Store.addPrompts(selectedPrompts);
        this.syncToGist();
        this.closeModal('import-modal');
        this.importData = null;
        Components.showToast(`成功导入 ${selectedPrompts.length} 条提示词`, 'success');
    },

    exportPrompts() {
        const scope = document.getElementById('export-scope')?.value;
        const format = document.getElementById('export-format')?.value;

        let prompts = Store.state.prompts;
        if (scope === 'current' && Store.state.activeCategoryId) {
            prompts = Store.getPromptsByCategory(Store.state.activeCategoryId);
        }

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify({ version: '2.0', prompts }, null, 2);
            filename = 'prompts.json';
            mimeType = 'application/json';
        } else if (format === 'markdown') {
            content = prompts.map(p => `# ${p.title}\n\n${p.content}\n\n---\n`).join('\n');
            filename = 'prompts.md';
            mimeType = 'text/markdown';
        } else {
            const header = '标题,内容,分类,标签,创建时间\n';
            const rows = prompts.map(p =>
                `"${p.title}","${(p.content || '').replace(/"/g, '""')}","${p.category || ''}","${(p.tags || []).join(',')}","${p.createdAt}"`
            ).join('\n');
            content = header + rows;
            filename = 'prompts.csv';
            mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        this.closeModal('export-modal');
        Components.showToast('导出成功', 'success');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());