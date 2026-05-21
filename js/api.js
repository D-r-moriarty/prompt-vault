const API = {
    CLIENT_ID: 'Ov23li7TuaO62WuLS0TN',
    REDIRECT_URI: 'https://D-r-moriarty.github.io/prompt-vault/callback.html',

    generateState() {
        return Math.random().toString(36).substring(2, 15);
    },

    login() {
        const state = this.generateState();
        sessionStorage.setItem('oauth_state', state);
        const url = `https://github.com/login/oauth/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&scope=gist&state=${state}`;
        window.location.href = url;
    },

    async handleCallback(code, state) {
        const savedState = sessionStorage.getItem('oauth_state');
        if (!savedState || savedState !== state) {
            throw new Error('Invalid state');
        }
        sessionStorage.removeItem('oauth_state');

        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: this.CLIENT_ID,
                client_secret: '564e329bc8eb228fdcd8e44319acbc0e2bbb8c79',
                code,
                state
            })
        });

        const data = await response.json();
        if (data.access_token) {
            localStorage.setItem('github_token', data.access_token);
            return data.access_token;
        }
        throw new Error('Failed to get access token');
    },

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

    logout() {
        localStorage.removeItem('github_token');
        window.location.reload();
    }
};

window.API = API;