const Store = {
    state: {
        prompts: [],
        categories: [],
        activePromptId: null,
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
        this.state.categories = [...new Set(this.state.prompts.map(p => p.category).filter(Boolean))];
        this.state.gistId = data.id;
        this.state.filename = data.filename;
        this.notify();
    },

    getEmptyData() {
        return { version: '1.0', prompts: [] };
    },

    addPrompt(prompt) {
        const newPrompt = {
            id: crypto.randomUUID(),
            title: prompt.title || '新提示词',
            content: prompt.content || '',
            category: prompt.category || '',
            tags: prompt.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.state.prompts.push(newPrompt);
        this.updateCategories();
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
            this.updateCategories();
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
        this.updateCategories();
        this.notify();
    },

    getActivePrompt() {
        return this.state.prompts.find(p => p.id === this.state.activePromptId);
    },

    updateCategories() {
        this.state.categories = [...new Set(this.state.prompts.map(p => p.category).filter(Boolean))];
    },

    searchPrompts(query) {
        if (!query) return this.state.prompts;
        const lower = query.toLowerCase();
        return this.state.prompts.filter(p =>
            p.title.toLowerCase().includes(lower) ||
            p.content.toLowerCase().includes(lower) ||
            p.tags.some(t => t.toLowerCase().includes(lower))
        );
    },

    exportData() {
        return { version: '1.0', prompts: this.state.prompts };
    }
};

window.Store = Store;