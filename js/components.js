// Components Module - Craft Workshop Theme
const Components = {
    // Render prompt cards grid
    renderPromptGrid(prompts, activeId) {
        const grid = document.getElementById('prompt-grid');
        const emptyState = document.getElementById('empty-state');

        if (!prompts || prompts.length === 0) {
            grid.innerHTML = '';
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        grid.classList.remove('hidden');

        grid.innerHTML = prompts.map((prompt, index) => `
            <div class="prompt-card" data-id="${prompt.id}" style="animation-delay: ${index * 50}ms">
                <div class="prompt-card-header">
                    <span class="prompt-card-icon">${prompt.category ? this.getCategoryIcon(prompt.category) : '📝'}</span>
                    <h3 class="prompt-card-title">${this.escapeHtml(prompt.title)}</h3>
                </div>
                <p class="prompt-card-content">${this.escapeHtml(prompt.content.substring(0, 100))}</p>
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

        // Bind click events
        grid.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                Store.setState({ activePromptId: id });
                App.openEditor(id);
            });
        });
    },

    // Render category tree in sidebar
    renderCategoryTree(categories, prompts) {
        const container = document.getElementById('category-tree');

        // Count prompts per category
        const categoryCounts = {};
        prompts.forEach(p => {
            const cat = p.category || '未分类';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        let html = `
            <li class="category-item">
                <button class="category-btn active" data-category="">
                    <span class="category-icon">📚</span>
                    <span>全部</span>
                    <span class="category-count">${prompts.length}</span>
                </button>
            </li>
        `;

        categories.forEach(cat => {
            const count = categoryCounts[cat.name] || 0;
            html += `
                <li class="category-item">
                    <button class="category-btn" data-category="${this.escapeHtml(cat.name)}">
                        <span class="category-icon">${cat.icon}</span>
                        <span>${this.escapeHtml(cat.name)}</span>
                        <span class="category-count">${count}</span>
                    </button>
                </li>
            `;
        });

        // Add uncategorized
        const uncategorizedCount = categoryCounts[''] || categoryCounts['未分类'] || 0;
        if (uncategorizedCount > 0) {
            html += `
                <li class="category-item">
                    <button class="category-btn" data-category="未分类">
                        <span class="category-icon">📁</span>
                        <span>未分类</span>
                        <span class="category-count">${uncategorizedCount}</span>
                    </button>
                </li>
            `;
        }

        container.innerHTML = html;

        // Bind events
        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                Store.setState({ activeCategoryId: category === '未分类' ? '' : category });

                // Update active state
                container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter prompts
                const filtered = category ? Store.getPromptsByCategory(category) : Store.state.prompts;
                this.renderPromptGrid(filtered, Store.state.activePromptId);
            });
        });
    },

    // Update stats
    updateStats(total, monthly) {
        document.getElementById('total-count').textContent = total;
        document.getElementById('month-count').textContent = monthly;
    },

    // Get category icon
    getCategoryIcon(categoryName) {
        const icons = {
            '写作': '📝',
            '代码': '🔧',
            '对话': '💬',
            '分析': '📊',
            '翻译': '🌐',
            '设计': '🎨'
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
        if (days < 30) return `${Math.floor(days / 7)}周前`;

        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            'success': '✓',
            'error': '✗',
            'ai': '⚡',
            'info': 'ℹ'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Populate category select in editor
    populateCategorySelect() {
        const selects = [
            document.getElementById('prompt-category-select'),
            document.getElementById('import-category-select')
        ];

        const categories = Store.state.categories;

        selects.forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">不指定分类</option>' +
                categories.map(cat => `<option value="${this.escapeHtml(cat.name)}">${this.escapeHtml(cat.name)}</option>`).join('');
            select.value = currentValue;
        });
    },

    // Render import preview
    renderImportPreview(items) {
        const preview = document.getElementById('import-preview');
        const confirmBtn = document.getElementById('import-confirm');

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
    }
};

window.Components = Components;