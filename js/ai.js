// AI Assistant Module - Two Layer (Real AI + Keyword Fallback)
const AI = {
    suggestions: [],

    // Main analyze function - tries AI first, falls back to keyword
    async analyzePrompts(prompts, apiKey, provider = 'minimax') {
        this.suggestions = [];

        if (apiKey && apiKey.trim()) {
            try {
                await this.analyzeWithAI(prompts, apiKey, provider);
                return this.suggestions;
            } catch (error) {
                console.log('AI analysis failed, falling back to keywords:', error);
                Components.showToast('AI 分析失败，使用关键词匹配', 'ai');
            }
        }

        return this.analyzeWithKeywords(prompts);
    },

    // Real AI analysis using MiniMax, Claude, or OpenAI
    async analyzeWithAI(prompts, apiKey, provider) {
        const promptList = prompts.slice(0, 50).map(p => ({
            title: p.title,
            content: p.content.substring(0, 300),
            category: p.category || '未分类',
            tags: p.tags || []
        }));

        const systemPrompt = `你是一个提示词整理助手。请分析用户的提示词集合，提出整理建议。

重要：只分析标题和分类，不修改正文内容！

输出格式（JSON数组）：
[
  {"type": "category-hint", "promptTitle": "原始标题", "suggestedCategory": "建议分类", "reason": "原因"},
  {"type": "title-hint", "promptTitle": "原始标题", "suggestedTitle": "更好的标题", "reason": "原因"},
  {"type": "similar", "titles": ["标题1", "标题2"], "reason": "可能重复"}
]

请严格返回JSON，不要有其他内容。`;

        let response;
        if (provider === 'minimax') {
            response = await this.callMiniMax(apiKey, systemPrompt, JSON.stringify(promptList));
        } else if (provider === 'openai') {
            response = await this.callOpenAI(apiKey, systemPrompt, JSON.stringify(promptList));
        } else {
            response = await this.callClaude(apiKey, systemPrompt, JSON.stringify(promptList));
        }

        try {
            const suggestions = JSON.parse(response);
            this.suggestions = suggestions.map(s => ({
                ...s,
                action: () => this.applySuggestion(s)
            }));
        } catch (e) {
            console.error('Failed to parse AI response:', e);
            return this.analyzeWithKeywords(prompts);
        }
    },

    // Call MiniMax API
    async callMiniMax(apiKey, systemPrompt, userPrompt) {
        const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'MiniMax-Text-01',
                stream: false,
                max_tokens: 4096,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`MiniMax API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    // Call Claude API
    async callClaude(apiKey, systemPrompt, userPrompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0].text;
    },

    // Call OpenAI API
    async callOpenAI(apiKey, systemPrompt, userPrompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    // Keyword-based analysis (fallback)
    analyzeWithKeywords(prompts) {
        this.suggestions = [];

        const uncategorized = prompts.filter(p => !p.category || p.category === '');
        if (uncategorized.length > 0) {
            this.suggestions.push({
                type: 'uncategorized',
                title: `${uncategorized.length} 条提示词未分类`,
                prompts: uncategorized,
                action: () => this.batchCategorize(uncategorized)
            });
        }

        const similarGroups = this.findSimilarTitles(prompts);
        similarGroups.forEach(group => {
            this.suggestions.push({
                type: 'similar',
                title: `可能重复的提示词`,
                prompts: group,
                action: () => this.showMergeSuggestion(group)
            });
        });

        prompts.forEach(prompt => {
            const suggested = this.suggestCategoryForPrompt(prompt);
            if (suggested && (!prompt.category || prompt.category === '')) {
                this.suggestions.push({
                    type: 'category-hint',
                    prompt,
                    suggestedCategory: suggested,
                    action: () => this.applyCategory(prompt.id, suggested)
                });
            }
        });

        prompts.forEach(prompt => {
            const suggestedTitle = this.suggestBetterTitle(prompt);
            if (suggestedTitle) {
                this.suggestions.push({
                    type: 'title-hint',
                    prompt,
                    suggestedTitle,
                    action: () => this.applyTitle(prompt.id, suggestedTitle)
                });
            }
        });

        return this.suggestions;
    },

    findSimilarTitles(prompts) {
        const groups = [];
        const processed = new Set();

        prompts.forEach((p1, i) => {
            if (processed.has(p1.id)) return;

            const similar = prompts.filter((p2, j) => {
                if (i >= j || processed.has(p2.id)) return false;
                return this.calculateSimilarity(p1.title, p2.title) > 0.6;
            });

            if (similar.length > 0) {
                groups.push([p1, ...similar]);
                processed.add(p1.id);
                similar.forEach(p => processed.add(p.id));
            }
        });

        return groups;
    },

    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    },

    suggestCategoryForPrompt(prompt) {
        const keywords = {
            '写作': ['写', '文案', '文章', '创作', '邮件', '报告', '故事', '小说'],
            '代码': ['代码', '编程', '函数', '调试', '重构', 'code', 'debug', '开发'],
            '翻译': ['翻译', 'convert', '转换', '语言', '英文', '中文'],
            '分析': ['分析', '研究', '评估', '统计', '数据'],
            '对话': ['对话', '聊天', '问答', 'assistant', '角色']
        };

        const content = (prompt.title + ' ' + prompt.content).toLowerCase();

        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(w => content.includes(w))) {
                return category;
            }
        }

        return null;
    },

    suggestBetterTitle(prompt) {
        const title = prompt.title;

        if (/\bv\d+\b/i.test(title)) {
            return title.replace(/\s*v\d+/i, '').trim();
        }

        if (title.length < 5) return null;

        const unclearPatterns = [/^(help|test|temp|tmp|new|sample)/i, /^\d+$/];
        if (unclearPatterns.some(p => p.test(title))) {
            return null;
        }

        return null;
    },

    showMergeSuggestion(group) {
        if (group.length < 2) return;
        Store.setState({ activePromptId: group[0].id });
        Components.showToast(`发现 ${group.length} 条可能重复的提示词`, 'ai');
    },

    applyCategory(promptId, category) {
        Store.updatePrompt(promptId, { category });
        App.syncToGist();
        Components.showToast(`已归类到"${category}"`, 'success');
        this.removeSuggestion(promptId, 'category-hint');
        this.renderSuggestions(document.getElementById('suggestions-list'));
    },

    applyTitle(promptId, title) {
        Store.updatePrompt(promptId, { title });
        App.syncToGist();
        Components.showToast('标题已更新', 'success');
        this.removeSuggestion(promptId, 'title-hint');
        this.renderSuggestions(document.getElementById('suggestions-list'));
    },

    batchCategorize(prompts) {
        prompts.forEach(p => {
            const suggested = this.suggestCategoryForPrompt(p);
            if (suggested) {
                Store.updatePrompt(p.id, { category: suggested });
            }
        });
        App.syncToGist();
        Components.showToast('批量分类完成', 'success');
        this.dismissSuggestion('uncategorized');
        this.renderSuggestions(document.getElementById('suggestions-list'));
    },

    removeSuggestion(promptId, type) {
        this.suggestions = this.suggestions.filter(s =>
            !(s.type === type && s.prompt && s.prompt.id === promptId)
        );
    },

    dismissSuggestion(type) {
        this.suggestions = this.suggestions.filter(s => s.type !== type);
    },

    renderSuggestions(container) {
        if (!container) return;

        if (this.suggestions.length === 0) {
            container.innerHTML = '<p style="font-size: 0.875rem; color: var(--text-light);">暂无整理建议</p>';
            return;
        }

        container.innerHTML = this.suggestions.map((s) => {
            if (s.type === 'uncategorized') {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header"><span>📁</span><span>未分类</span></div>
                        <div class="ai-suggestion-content">发现 ${s.prompts.length} 条提示词尚未分类</div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.batchCategorize(${JSON.stringify(s.prompts).replace(/"/g, '&quot;')})">批量处理</button>
                            <button class="ignore" onclick="AI.dismissSuggestion('uncategorized'); AI.renderSuggestions(document.getElementById('suggestions-list'))">忽略</button>
                        </div>
                    </div>
                `;
            }
            if (s.type === 'similar') {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header"><span>🔍</span><span>可能重复</span></div>
                        <div class="ai-suggestion-content">${s.prompts.map(p => `"${p.title}"`).join(' 和 ')}</div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.showMergeSuggestion(${JSON.stringify(s.prompts).replace(/"/g, '&quot;')})">查看</button>
                            <button class="ignore" onclick="AI.dismissSuggestion('similar'); AI.renderSuggestions(document.getElementById('suggestions-list'))">忽略</button>
                        </div>
                    </div>
                `;
            }
            if (s.type === 'category-hint' && s.prompt) {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header"><span>📁</span><span>建议归类</span></div>
                        <div class="ai-suggestion-content"><strong>"${s.prompt.title}"</strong> → "${s.suggestedCategory}"</div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.applyCategory('${s.prompt.id}', '${s.suggestedCategory}')">应用</button>
                            <button class="ignore" onclick="AI.removeSuggestion('${s.prompt.id}', 'category-hint'); AI.renderSuggestions(document.getElementById('suggestions-list'))">忽略</button>
                        </div>
                    </div>
                `;
            }
            if (s.type === 'title-hint' && s.prompt) {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header"><span>✏️</span><span>优化标题</span></div>
                        <div class="ai-suggestion-content"><strong>"${s.prompt.title}"</strong> → "${s.suggestedTitle}"</div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.applyTitle('${s.prompt.id}', '${s.suggestedTitle.replace(/'/g, "\\'")}')">应用</button>
                            <button class="ignore" onclick="AI.removeSuggestion('${s.prompt.id}', 'title-hint'); AI.renderSuggestions(document.getElementById('suggestions-list'))">忽略</button>
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');
    }
};

window.AI = AI;