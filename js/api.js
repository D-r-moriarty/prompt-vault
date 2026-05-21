const API = {
    CLIENT_ID: 'Ov23li7TuaO62WuLS0TN',

    async getGists(token) {
        const response = await fetch('https://api.github.com/gists', {
            headers: { Authorization: `token ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch gists');
        return response.json();
    },

    async getPromptsGist(token) {
        const gists = await this.getGists(token);
        const existing = gists.find(g => g.description === 'prompt-vault-data');

        if (existing) {
            const response = await fetch(existing.url, {
                headers: { Authorization: `token ${token}` }
            });
            const data = await response.json();
            const filename = Object.keys(data.files)[0];
            return { id: data.id, filename, content: JSON.parse(data.files[filename].content) };
        }
        return null;
    },

    async createPromptsGist(token, content) {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: 'prompt-vault-data',
                public: false,
                files: {
                    'prompts.json': { content: JSON.stringify(content, null, 2) }
                }
            })
        });
        if (!response.ok) throw new Error('Failed to create gist');
        const data = await response.json();
        return { id: data.id, filename: 'prompts.json', content };
    },

    async updatePromptsGist(token, gistId, filename, content) {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [filename]: { content: JSON.stringify(content, null, 2) }
                }
            })
        });
        if (!response.ok) throw new Error('Failed to update gist');
        return response.json();
    },

    getToken() {
        return localStorage.getItem('github_token');
    },

    saveToken(token) {
        localStorage.setItem('github_token', token);
    },

    logout() {
        localStorage.removeItem('github_token');
        window.location.reload();
    },

    // Open GitHub token creation page
    openTokenPage() {
        window.open('https://github.com/settings/tokens/new?scopes=gist&description=Prompt%20Vault', '_blank');
    }
};

window.API = API;