// Store Module - Enhanced with Categories
const Store = {
    state: {
        prompts: [],
        categories: [
            { id: 'cat-1', name: '写作', icon: '📝', order: 1 },
            { id: 'cat-2', name: '代码', icon: '🔧', order: 2 },
            { id: 'cat-3', name: '对话', icon: '💬', order: 3 },
            { id: 'cat-4', name: '分析', icon: '📊', order: 4 }
        ],
        activePromptId: null,
        activeCategoryId: null,
        searchQuery: '',
        gistId: null,
        filename: null,
        token: null,
        isSyncing: false
    },

    listeners: [],

    subscribe(fn) {
        this.listeners.push(fn);
        return () => {
            this.listeners = this.listeners.filter(l => l !== fn);
        };
    },

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    },

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notify();
    },

    loadFromGist(data) {
        this.state.prompts = data.content.prompts || [];
        this.state.categories = data.content.categories || this.state.categories;
        this.state.gistId = data.id;
        this.state.filename = data.filename;
        this.notify();
    },

    getEmptyData() {
        return {
            version: '2.0',
            prompts: [],
            categories: this.state.categories,
            settings: { theme: 'light' }
        };
    },

    // Category management
    addCategory(name, icon = '📁') {
        const newCategory = {
            id: 'cat-' + Date.now(),
            name,
            icon,
            order: this.state.categories.length + 1
        };
        this.state.categories.push(newCategory);
        this.notify();
        return newCategory;
    },

    deleteCategory(id) {
        const systemCats = ['cat-1', 'cat-2', 'cat-3', 'cat-4'];
        if (systemCats.includes(id)) {
            Components.showToast('不能删除系统分类', 'error');
            return;
        }

        this.state.categories = this.state.categories.filter(c => c.id !== id);
        this.notify();
    },

    // Prompt management
    addPrompt(prompt) {
        const newPrompt = {
            id: crypto.randomUUID(),
            title: prompt.title || '新提示词',
            content: prompt.content || '',
            category: prompt.category || '',
            tags: prompt.tags || [],
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.state.prompts.push(newPrompt);
        this.notify();
        return newPrompt;
    },

    updatePrompt(id, updates) {
        const index = this.state.prompts.findIndex(p => p.id === id);
        if (index !== -1) {
            this.state.prompts[index] = {
                ...this.state.prompts[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.notify();
            return this.state.prompts[index];
        }
        return null;
    },

    deletePrompt(id) {
        this.state.prompts = this.state.prompts.filter(p => p.id !== id);
        if (this.state.activePromptId === id) {
            this.state.activePromptId = null;
        }
        this.notify();
    },

    incrementUsage(id) {
        const prompt = this.state.prompts.find(p => p.id === id);
        if (prompt) {
            prompt.usageCount = (prompt.usageCount || 0) + 1;
            this.notify();
        }
    },

    getActivePrompt() {
        return this.state.prompts.find(p => p.id === this.state.activePromptId);
    },

    // Get prompts by category
    getPromptsByCategory(categoryName) {
        if (!categoryName) return this.state.prompts;
        return this.state.prompts.filter(p => p.category === categoryName);
    },

    // Get category count
    getCategoryCount(categoryName) {
        return this.state.prompts.filter(p => p.category === categoryName).length;
    },

    // Get uncategorized count
    getUncategorizedCount() {
        return this.state.prompts.filter(p => !p.category || p.category === '').length;
    },

    // Get monthly count
    getMonthlyCount() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.state.prompts.filter(p => new Date(p.createdAt) >= startOfMonth).length;
    },

    // Search prompts
    searchPrompts(query) {
        if (!query) return this.state.prompts;
        const lower = query.toLowerCase();
        return this.state.prompts.filter(p =>
            p.title.toLowerCase().includes(lower) ||
            p.content.toLowerCase().includes(lower) ||
            (p.tags && p.tags.some(t => t.toLowerCase().includes(lower))) ||
            (p.category && p.category.toLowerCase().includes(lower))
        );
    },

    // Export data
    exportData() {
        return {
            version: '2.0',
            prompts: this.state.prompts,
            categories: this.state.categories,
            settings: { theme: 'light' }
        };
    },

    // Import prompts
    importPrompts(prompts, defaultCategory = '') {
        const newPrompts = prompts.map(p => ({
            id: crypto.randomUUID(),
            title: p.title || '未命名',
            content: p.content || '',
            category: p.category || defaultCategory,
            tags: p.tags || [],
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));

        this.state.prompts.push(...newPrompts);
        this.notify();
        return newPrompts;
    }
};

window.Store = Store;