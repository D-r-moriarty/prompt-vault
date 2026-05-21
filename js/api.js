const API = {
    CLIENT_ID: 'Ov23li7TuaO62WuLS0TN',

    generateState() {
        return Math.random().toString(36).substring(2, 15);
    },

    async login() {
        try {
            // Step 1: Get device code
            const codeResponse = await fetch('https://github.com/login/device/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.CLIENT_ID,
                    scope: 'gist'
                })
            });

            const codeData = await codeResponse.json();

            if (codeData.error) {
                throw new Error(codeData.error_description || 'Failed to get device code');
            }

            // Store code for later verification
            sessionStorage.setItem('device_code', codeData.device_code);
            sessionStorage.setItem('interval', codeData.interval || 5);

            // Open verification page
            const verificationWindow = window.open(
                codeData.verification_uri,
                '_blank',
                'width=500,height=600'
            );

            if (!verificationWindow) {
                alert('请允许弹出窗口以便完成登录');
                return;
            }

            // Poll for token
            this.pollForToken(codeData.device_code, codeData.interval);

        } catch (error) {
            console.error('Login failed:', error);
            alert('登录失败: ' + error.message);
        }
    },

    async pollForToken(deviceCode, interval) {
        const maxAttempts = 60;
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: this.CLIENT_ID,
                        device_code: deviceCode,
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                    })
                });

                const data = await response.json();

                if (data.access_token) {
                    localStorage.setItem('github_token', data.access_token);
                    sessionStorage.removeItem('device_code');
                    sessionStorage.removeItem('interval');
                    window.location.reload();
                    return;
                }

                if (data.error === 'authorization_pending') {
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(poll, interval * 1000);
                        return;
                    }
                }

                if (data.error !== 'authorization_pending') {
                    throw new Error(data.error_description || data.error);
                }

            } catch (error) {
                console.error('Polling failed:', error);
                alert('登录失败: ' + error.message);
            }
        };

        poll();
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