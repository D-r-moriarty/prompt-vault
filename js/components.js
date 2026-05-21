const Components = {
    renderPromptList(prompts, activeId) {
        const container = document.getElementById('prompt-list');
        if (prompts.length === 0) {
            container.innerHTML = '<p class="empty">暂无提示词</p>';
            return;
        }

        container.innerHTML = prompts.map(prompt => `
            <div class="prompt-item ${prompt.id === activeId ? 'active' : ''}" data-id="${prompt.id}">
                <h3>${this.escapeHtml(prompt.title)}</h3>
                <p>${this.escapeHtml(prompt.content.substring(0, 50))}...</p>
            </div>
        `).join('');

        container.querySelectorAll('.prompt-item').forEach(item => {
            item.addEventListener('click', () => {
                Store.setState({ activePromptId: item.dataset.id });
            });
        });
    },

    renderCategoryList(categories, activeCategory) {
        const container = document.getElementById('category-list');
        const select = document.getElementById('prompt-category');

        let html = '<div class="categories"><p class="category-label">分类</p>';
        categories.forEach(cat => {
            html += `<div class="category-item ${activeCategory === cat ? 'active' : ''}" data-category="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</div>`;
        });
        html += '</div>';
        container.innerHTML = html;

        select.innerHTML = '<option value="">选择分类</option>' +
            categories.map(cat => `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`).join('');

        container.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const cat = item.dataset.category;
                const filtered = cat ? Store.state.prompts.filter(p => p.category === cat) : Store.state.prompts;
                this.renderPromptList(filtered, Store.state.activePromptId);
            });
        });
    },

    renderEditor(prompt) {
        const editor = document.getElementById('prompt-editor');
        const empty = document.getElementById('empty-state');

        if (!prompt) {
            editor.classList.add('hidden');
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        editor.classList.remove('hidden');

        document.getElementById('prompt-title').value = prompt.title;
        document.getElementById('prompt-category').value = prompt.category;
        document.getElementById('prompt-tags').value = prompt.tags.join(', ');
        document.getElementById('prompt-content').value = prompt.content;
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.Components = Components;