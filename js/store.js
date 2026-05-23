// Store Module - Enhanced with Categories, Themes, Usage Stats
const Store = {
    state: {
        prompts: [],
        categories: [
            { id: 'cat-1', name: '写作', icon: '📝', order: 1, isSystem: true },
            { id: 'cat-2', name: '代码', icon: '🔧', order: 2, isSystem: true },
            { id: 'cat-3', name: '对话', icon: '💬', order: 3, isSystem: true },
            { id: 'cat-4', name: '分析', icon: '📊', order: 4, isSystem: true }
        ],
        activePromptId: null,
        activeCategoryId: null,
        searchQuery: '',
        gistId: null,
        filename: null,
        token: null,
        isSyncing: false,
        settings: {
            theme: 'light',
            aiApiKey: '',
            aiProvider: 'claude'
        }
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
        this.state.settings = data.content.settings || this.state.settings;
        this.state.gistId = data.id;
        this.state.filename = data.filename;
        this.applyTheme();
        this.notify();
    },

    getEmptyData() {
        return {
            version: '2.0',
            prompts: [],
            categories: this.state.categories,
            settings: this.state.settings
        };
    },

    // Theme management
    applyTheme() {
        const theme = this.state.settings.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },

    setTheme(theme) {
        this.state.settings.theme = theme;
        this.applyTheme();
        this.saveSettings();
    },

    saveSettings() {
        if (this.state.token && this.state.gistId) {
            // Settings will be saved when syncing
        }
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

    updateCategory(id, updates) {
        const index = this.state.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.state.categories[index] = { ...this.state.categories[index], ...updates };
            this.notify();
            return this.state.categories[index];
        }
        return null;
    },

    deleteCategory(id) {
        const category = this.state.categories.find(c => c.id === id);
        if (!category) return false;

        if (category.isSystem) {
            return false;
        }

        // Move prompts to uncategorized
        this.state.prompts.forEach(p => {
            if (p.category === category.name) {
                p.category = '';
            }
        });

        this.state.categories = this.state.categories.filter(c => c.id !== id);
        this.notify();
        return true;
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

    addPrompts(prompts) {
        const newPrompts = prompts.map(p => ({
            id: crypto.randomUUID(),
            title: p.title || '未命名',
            content: p.content || '',
            category: p.category || '',
            tags: p.tags || [],
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
        this.state.prompts.push(...newPrompts);
        this.notify();
        return newPrompts;
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

    deletePrompts(ids) {
        this.state.prompts = this.state.prompts.filter(p => !ids.includes(p.id));
        if (ids.includes(this.state.activePromptId)) {
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
        if (!categoryName || categoryName === '') return this.state.prompts;
        return this.state.prompts.filter(p => p.category === categoryName);
    },

    // Get category count
    getCategoryCount(categoryName) {
        if (!categoryName || categoryName === '') return this.state.prompts.length;
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

    // Get top used prompts
    getTopUsedPrompts(limit = 5) {
        return [...this.state.prompts]
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);
    },

    // Get category stats
    getCategoryStats() {
        const stats = {};
        this.state.prompts.forEach(p => {
            const cat = p.category || '未分类';
            if (!stats[cat]) {
                stats[cat] = { count: 0, usage: 0 };
            }
            stats[cat].count++;
            stats[cat].usage += p.usageCount || 0;
        });
        return stats;
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
            settings: this.state.settings
        };
    },

    // Batch move prompts to category
    movePromptsToCategory(promptIds, category) {
        promptIds.forEach(id => {
            this.updatePrompt(id, { category });
        });
        this.notify();
    }
};

window.Store = Store;