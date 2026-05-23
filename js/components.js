// Components Module - Updated for Features
const Components = {
    selectedPrompts: new Set(),
    selectMode: false,

    // Render prompt cards grid
    renderPromptGrid(prompts, activeId) {
        const grid = document.getElementById('prompt-grid');
        const emptyState = document.getElementById('empty-state');
        const loadingState = document.getElementById('loading-state');

        // Hide loading state
        if (loadingState) loadingState.classList.add('hidden');

        if (!prompts || prompts.length === 0) {
            grid.innerHTML = '';
            grid.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        grid.classList.remove('hidden');

        // Add select mode class to grid
        if (this.selectMode) {
            grid.classList.add('select-mode');
        } else {
            grid.classList.remove('select-mode');
        }

        let headerHtml = '';
        if (this.selectMode) {
            const selectedCount = this.selectedPrompts.size;
            headerHtml = `
                <div class="select-all-header">
                    <span>已选择 ${selectedCount} / ${prompts.length} 项</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="Components.selectAll(${prompts.length})">全选</button>
                        <button class="btn btn-ghost" onclick="Components.clearSelection()">取消</button>
                    </div>
                </div>
            `;
        }

        const cardsHtml = prompts.map((prompt, index) => `
            <div class="prompt-card" data-id="${prompt.id}" data-index="${index}">
                <div class="prompt-card-header" onclick="App.openEditor('${prompt.id}')">
                    <span class="prompt-card-icon">${prompt.category ? this.getCategoryIcon(prompt.category) : '📝'}</span>
                    <h3 class="prompt-card-title">${this.escapeHtml(prompt.title)}</h3>
                    ${this.selectMode ? `<button class="btn btn-ghost btn-icon delete-card-btn" data-id="${prompt.id}" style="margin-left: auto; color: var(--danger);">🗑️</button>` : ''}
                </div>
                <div class="prompt-card-body" onmousedown="Components.handleCardClick(event, '${prompt.id}')">
                    <p class="prompt-card-content">${this.escapeHtml(prompt.content.substring(0, 150))}</p>
                </div>
                ${prompt.tags && prompt.tags.length > 0 ? `
                    <div class="prompt-card-tags">
                        ${prompt.tags.slice(0, 3).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        ${prompt.tags.length > 3 ? `<span class="tag">+${prompt.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
                <div class="prompt-card-meta">
                    <span>🕐 ${this.formatTime(prompt.updatedAt)}</span>
                    ${prompt.usageCount ? `<span class="usage-badge"><span class="usage-icon">📊</span> ${prompt.usageCount}次</span>` : ''}
                </div>
            </div>
        `).join('');

        grid.innerHTML = headerHtml + cardsHtml;

        // Add click handlers for cards
        grid.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const id = card.dataset.id;
                if (e.target.classList.contains('delete-card-btn')) return;

                if (this.selectMode) {
                    // In select mode, toggle selection
                    this.toggleSelection(id);
                } else {
                    // Not in select mode, open editor
                    Store.setState({ activePromptId: id });
                    App.openEditor(id);
                }
            });
        });

        // Add click handlers for delete buttons in select mode
        grid.querySelectorAll('.delete-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePrompt(btn.dataset.id);
            });
        });
    },

    toggleSelectMode() {
        this.selectMode = !this.selectMode;
        const btn = document.getElementById('select-mode-btn');
        if (btn) {
            if (this.selectMode) {
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
                btn.innerHTML = '<span>☑️</span> 完成';
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
                btn.innerHTML = '<span>☐</span> 选择';
            }
        }
        this.clearSelection();
        Components.renderPromptGrid(Store.state.prompts, Store.state.activePromptId);
    },

    handleCardClick(event, id) {
        if (event.target.classList.contains('prompt-checkbox')) return;
        if (event.target.classList.contains('btn-icon')) return;

        if (this.selectMode) {
            this.toggleSelection(id);
        } else {
            Store.setState({ activePromptId: id });
            App.openEditor(id);
        }
    },

    toggleSelection(id) {
        if (this.selectedPrompts.has(id)) {
            this.selectedPrompts.delete(id);
        } else {
            this.selectedPrompts.add(id);
        }
        this.updateBatchActions();
        Components.renderPromptGrid(Store.state.prompts, Store.state.activePromptId);
    },

    selectAll(count) {
        Store.state.prompts.forEach(p => this.selectedPrompts.add(p.id));
        this.updateBatchActions();
        Components.renderPromptGrid(Store.state.prompts, Store.state.activePromptId);
    },

    clearSelection() {
        this.selectedPrompts.clear();
        this.updateBatchActions();
    },

    deletePrompt(id) {
        if (confirm('确定要删除这个提示词吗？')) {
            Store.deletePrompt(id);
            this.selectedPrompts.delete(id);
            App.syncToGist();
            Components.showToast('已删除', 'success');
            Components.renderPromptGrid(Store.state.prompts, Store.state.activePromptId);
            this.updateBatchActions();
        }
    },

    updateBatchActions() {
        const bar = document.getElementById('batch-actions');
        const count = document.getElementById('batch-count');
        if (bar) {
            if (this.selectedPrompts.size > 0) {
                bar.classList.remove('hidden');
                if (count) count.textContent = this.selectedPrompts.size;
            } else {
                bar.classList.add('hidden');
            }
        }
    },

    // Render category tree in sidebar
    renderCategoryTree(categories, prompts) {
        const container = document.getElementById('category-tree');
        if (!container) return;

        const categoryStats = Store.getCategoryStats();
        const totalCount = prompts.length;
        const uncategorizedCount = Store.getUncategorizedCount();

        let html = `
            <li class="category-item">
                <button class="category-btn ${!Store.state.activeCategoryId ? 'active' : ''}" data-category="">
                    <span class="category-icon">📚</span>
                    <span>全部</span>
                    <span class="category-count">${totalCount}</span>
                </button>
            </li>
        `;

        categories.forEach(cat => {
            const count = categoryStats[cat.name]?.count || 0;
            html += `
                <li class="category-item">
                    <button class="category-btn ${Store.state.activeCategoryId === cat.name ? 'active' : ''}"
                            data-category="${this.escapeHtml(cat.name)}"
                            data-category-id="${cat.id}">
                        <span class="category-icon">${cat.icon}</span>
                        <span>${this.escapeHtml(cat.name)}</span>
                    </button>
                    <span class="category-count">${count}</span>
                    <button class="category-edit-btn" onclick="App.openEditCategory('${cat.id}')" title="编辑分类">✏️</button>
                </li>
            `;
        });

        if (uncategorizedCount > 0) {
            html += `
                <li class="category-item">
                    <button class="category-btn ${Store.state.activeCategoryId === '未分类' ? 'active' : ''}" data-category="未分类">
                        <span class="category-icon">📁</span>
                        <span>未分类</span>
                        <span class="category-count">${uncategorizedCount}</span>
                    </button>
                </li>
            `;
        }

        container.innerHTML = html;

        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                Store.setState({ activeCategoryId: category === '未分类' ? '' : category });

                container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filtered = category === '' || category === '未分类'
                    ? Store.state.prompts
                    : Store.getPromptsByCategory(category);
                this.renderPromptGrid(filtered, Store.state.activePromptId);

                // Clear selection when switching categories
                this.clearSelection();
                this.selectMode = false;
                const selectBtn = document.getElementById('select-mode-btn');
                if (selectBtn) {
                    selectBtn.classList.remove('btn-primary');
                    selectBtn.classList.add('btn-secondary');
                    selectBtn.innerHTML = '<span>☐</span> 选择';
                }
            });
        });
    },

    // Render settings panel
    renderSettings() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        const settings = Store.state.settings;

        container.innerHTML = `
            <div class="settings-section">
                <h4 class="settings-title">外观</h4>
                <div class="theme-switcher">
                    <button class="theme-option ${settings.theme === 'light' ? 'active' : ''}"
                            style="background: #FAF7F2"
                            onclick="Store.setTheme('light'); Components.updateThemeUI();"
                            title="工坊"></button>
                    <button class="theme-option ${settings.theme === 'dark' ? 'active' : ''}"
                            style="background: #0F172A"
                            onclick="Store.setTheme('dark'); Components.updateThemeUI();"
                            title="深夜"></button>
                    <button class="theme-option ${settings.theme === 'forest' ? 'active' : ''}"
                            style="background: #22C55E"
                            onclick="Store.setTheme('forest'); Components.updateThemeUI();"
                            title="森林"></button>
                    <button class="theme-option ${settings.theme === 'ocean' ? 'active' : ''}"
                            style="background: #0EA5E9"
                            onclick="Store.setTheme('ocean'); Components.updateThemeUI();"
                            title="海洋"></button>
                    <button class="theme-option ${settings.theme === 'sunset' ? 'active' : ''}"
                            style="background: #F97316"
                            onclick="Store.setTheme('sunset'); Components.updateThemeUI();"
                            title="日落"></button>
                </div>
            </div>

            <div class="settings-section">
                <h4 class="settings-title">AI 整理</h4>
                <div class="settings-item">
                    <span class="settings-label">AI 提供商</span>
                    <select id="ai-provider" style="width: 120px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border);">
                        <option value="minimax" ${settings.aiProvider === 'minimax' ? 'selected' : ''}>MiniMax</option>
                        <option value="claude" ${settings.aiProvider === 'claude' ? 'selected' : ''}>Claude</option>
                        <option value="openai" ${settings.aiProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                    </select>
                </div>
                <div class="settings-item" style="margin-top: 8px;">
                    <span class="settings-label">API Key</span>
                </div>
                <input type="password" id="ai-api-key" placeholder="输入 API Key"
                       style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border); margin-top: 4px;"
                       value="${settings.aiApiKey || ''}">
                <p style="font-size: 0.75rem; color: var(--text-light); margin-top: 4px;">
                    不填则使用关键词匹配。Key 仅存储在本地 Gist 中。
                </p>
            </div>

            <div class="settings-section">
                <h4 class="settings-title">统计</h4>
                ${this.renderUsageStats()}
            </div>
        `;
    },

    renderUsageStats() {
        const stats = Store.getCategoryStats();
        const topUsed = Store.getTopUsedPrompts(5);

        return `
            <div style="background: var(--bg); border-radius: 8px; padding: 12px;">
                <p style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 8px;">最常用的提示词</p>
                <ul class="usage-list">
                    ${topUsed.map(p => `
                        <li class="usage-list-item">
                            <span>${p.title}</span>
                            <span style="color: var(--primary);">${p.usageCount || 0}次</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    },

    updateThemeUI() {
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.theme-option[onclick*="${Store.state.settings.theme}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    },

    // Update stats
    updateStats(total, monthly) {
        const totalEl = document.getElementById('total-count');
        const monthEl = document.getElementById('month-count');
        if (totalEl) totalEl.textContent = total;
        if (monthEl) monthEl.textContent = monthly;
    },

    // Get category icon
    getCategoryIcon(categoryName) {
        const icons = {
            '写作': '📝', '代码': '🔧', '对话': '💬', '分析': '📊',
            '翻译': '🌐', '设计': '🎨', '营销': '📢', '教育': '📚'
        };
        return icons[categoryName] || '📁';
    },

    // Format time
    formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✗', ai: '⚡', info: 'ℹ' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    populateCategorySelect() {
        const selects = ['prompt-category-select', 'import-category-select', 'move-to-category'];
        const categories = Store.state.categories;

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">不指定分类</option>' +
                categories.map(cat => `<option value="${this.escapeHtml(cat.name)}">${this.escapeHtml(cat.name)}</option>`).join('');
            select.value = currentValue;
        });
    },

    renderImportPreview(items) {
        const preview = document.getElementById('import-preview');
        const confirmBtn = document.getElementById('import-confirm');
        if (!preview || !confirmBtn) return;

        if (!items || items.length === 0) {
            preview.classList.add('hidden');
            confirmBtn.disabled = true;
            return;
        }

        preview.classList.remove('hidden');
        confirmBtn.disabled = false;

        preview.innerHTML = items.map((item, index) => `
            <div class="import-item">
                <input type="checkbox" class="import-checkbox" data-index="${index}" checked>
                <div class="import-content">
                    <div class="import-title">${this.escapeHtml(item.title)}</div>
                    <div class="import-meta">${item.content ? item.content.substring(0, 50) + '...' : ''}</div>
                </div>
            </div>
        `).join('');
    },

    renderAddCategoryForm() {
        const modal = document.getElementById('add-category-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
    },

    // Todo List Rendering
    renderTodoList(todos) {
        const container = document.getElementById('todo-list');
        const emptyState = document.getElementById('todo-empty-state');

        if (!todos || todos.length === 0) {
            container.innerHTML = '';
            container.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        container.classList.remove('hidden');

        // Sort by priority and due date
        const sorted = [...todos].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return 0;
        });

        container.innerHTML = sorted.map(todo => `
            <div class="todo-card ${todo.status}" data-id="${todo.id}">
                <div class="todo-checkbox" onclick="App.toggleTodo('${todo.id}')">
                    ${todo.status === 'done' ? '☑️' : '☐'}
                </div>
                <div class="todo-content" onclick="App.openTodoEditor('${todo.id}')">
                    <div class="todo-title ${todo.status === 'done' ? 'done' : ''}">${this.escapeHtml(todo.title)}</div>
                    ${todo.description ? `<div class="todo-desc">${this.escapeHtml(todo.description.substring(0, 50))}</div>` : ''}
                    <div class="todo-meta">
                        <span class="priority priority-${todo.priority}">${todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢'}</span>
                        ${todo.dueDate ? `<span class="due-date">📅 ${todo.dueDate}</span>` : ''}
                        ${todo.dueTime ? `<span class="due-time">🕐 ${todo.dueTime}</span>` : ''}
                    </div>
                </div>
                <button class="todo-delete" onclick="event.stopPropagation(); App.deleteTodo('${todo.id}')">🗑️</button>
            </div>
        `).join('');
    },

    // Todo Editor Modal
    showTodoEditor(todo) {
        const modal = document.createElement('div');
        modal.id = 'todo-editor-modal';
        modal.dataset.todoId = todo.id;
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">编辑任务</h2>
                    <button class="modal-close" onclick="Components.closeTodoEditor()">&times;</button>
                </div>
                <div class="modal-body">
                    <label class="editor-title-label">标题</label>
                    <input type="text" id="todo-title-input" class="editor-title-input" value="${this.escapeHtml(todo.title)}" autofocus>
                    <label class="editor-title-label" style="margin-top: 1rem;">描述</label>
                    <textarea id="todo-desc-input" class="editor-content" rows="4" placeholder="任务描述...">${this.escapeHtml(todo.description)}</textarea>
                    <div class="editor-meta">
                        <div class="editor-field">
                            <label class="editor-label">优先级</label>
                            <select id="todo-priority-select" class="editor-select">
                                <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>🔴 高</option>
                                <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>🟡 中</option>
                                <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>🟢 低</option>
                            </select>
                        </div>
                        <div class="editor-field">
                            <label class="editor-label">截止日期</label>
                            <input type="date" id="todo-due-date" class="editor-input" value="${todo.dueDate || ''}">
                        </div>
                        <div class="editor-field">
                            <label class="editor-label">截止时间</label>
                            <input type="time" id="todo-due-time" class="editor-input" value="${todo.dueTime || ''}">
                        </div>
                    </div>
                    <div class="editor-meta">
                        <div class="editor-field">
                            <label class="editor-label">项目</label>
                            <input type="text" id="todo-project-input" class="editor-input" value="${this.escapeHtml(todo.project || '')}" placeholder="项目名称">
                        </div>
                        <div class="editor-field">
                            <label class="editor-label">标签（逗号分隔）</label>
                            <input type="text" id="todo-tags-input" class="editor-input" value="${todo.tags.join(', ')}" placeholder="标签1, 标签2">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeTodoEditor()">取消</button>
                    <button class="btn btn-primary" onclick="App.saveTodo()">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeTodoEditor() {
        const modal = document.getElementById('todo-editor-modal');
        if (modal) modal.remove();
    },

    // Kanban Board Rendering
    renderKanbanBoard(todos) {
        const container = document.getElementById('todo-kanban-view');
        if (!container) return;

        const columns = {
            todo: { title: '待办', icon: '📋', todos: [] },
            doing: { title: '进行中', icon: '🔄', todos: [] },
            done: { title: '已完成', icon: '✅', todos: [] }
        };

        todos.forEach(todo => {
            if (columns[todo.status]) {
                columns[todo.status].todos.push(todo);
            }
        });

        container.innerHTML = `
            <div class="kanban-board">
                ${Object.entries(columns).map(([key, col]) => `
                    <div class="kanban-column">
                        <div class="kanban-header">
                            <span class="kanban-icon">${col.icon}</span>
                            <span class="kanban-title">${col.title}</span>
                            <span class="kanban-count">${col.todos.length}</span>
                        </div>
                        <div class="kanban-cards">
                            ${col.todos.map(todo => `
                                <div class="kanban-card" data-id="${todo.id}" onclick="App.openTodoEditor('${todo.id}')">
                                    <div class="priority-indicator priority-${todo.priority}"></div>
                                    <div class="kanban-card-title">${this.escapeHtml(todo.title)}</div>
                                    ${todo.dueDate ? `<div class="kanban-card-meta">📅 ${todo.dueDate}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Calendar Month Rendering
    renderCalendarMonth(year, month) {
        Calendar.renderMonth(year, month, Store.state.todos);
    }
};

window.Components = Components;