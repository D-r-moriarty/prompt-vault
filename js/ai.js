// AI Assistant Module
const AI = {
    // Store AI suggestions
    suggestions: [],

    // Analyze prompts and generate suggestions
    async analyzePrompts(prompts) {
        this.suggestions = [];

        // 1. Detect uncategorized prompts
        const uncategorized = prompts.filter(p => !p.category || p.category === '');
        if (uncategorized.length > 0) {
            this.suggestions.push({
                type: 'uncategorized',
                title: `${uncategorized.length} 条提示词未分类`,
                prompts: uncategorized,
                action: this.suggestCategories.bind(this)
            });
        }

        // 2. Detect similar titles (potential duplicates)
        const similarGroups = this.findSimilarTitles(prompts);
        if (similarGroups.length > 0) {
            similarGroups.forEach(group => {
                this.suggestions.push({
                    type: 'similar',
                    title: `可能重复的提示词`,
                    prompts: group,
                    action: () => this.showMergeSuggestion(group)
                });
            });
        }

        // 3. Suggest category based on content keywords
        prompts.forEach(prompt => {
            const suggested = this.suggestCategoryForPrompt(prompt);
            if (suggested && (!prompt.category || prompt.category !== suggested)) {
                this.suggestions.push({
                    type: 'category-hint',
                    title: `建议归类`,
                    prompt: prompt,
                    suggestedCategory: suggested,
                    action: () => this.applyCategory(prompt.id, suggested)
                });
            }
        });

        // 4. Suggest better titles
        prompts.forEach(prompt => {
            const suggestedTitle = this.suggestBetterTitle(prompt);
            if (suggestedTitle && suggestedTitle !== prompt.title) {
                this.suggestions.push({
                    type: 'title-hint',
                    title: `优化标题`,
                    prompt: prompt,
                    suggestedTitle: suggestedTitle,
                    action: () => this.applyTitle(prompt.id, suggestedTitle)
                });
            }
        });

        return this.suggestions;
    },

    // Suggest categories based on keywords
    suggestCategoriesForPrompts(prompts) {
        const keywords = {
            '写作': ['写', '文案', '文章', '创作', '邮件', '报告', '故事'],
            '代码': ['代码', '编程', '函数', '调试', '重构', 'code', 'debug'],
            '翻译': ['翻译', 'convert', '转换', '语言'],
            '分析': ['分析', '研究', '评估', '统计'],
            '对话': ['对话', '聊天', '问答', 'assistant']
        };

        return prompts.map(prompt => {
            const content = (prompt.title + ' ' + prompt.content).toLowerCase();
            for (const [category, words] of Object.entries(keywords)) {
                if (words.some(w => content.includes(w))) {
                    return { prompt, suggestedCategory: category };
                }
            }
            return { prompt, suggestedCategory: null };
        }).filter(r => r.suggestedCategory);
    },

    // Find similar titles
    findSimilarTitles(prompts) {
        const groups = [];
        const processed = new Set();

        prompts.forEach((p1, i) => {
            if (processed.has(p1.id)) return;

            const similar = prompts.filter((p2, j) => {
                if (i >= j || processed.has(p2.id)) return false;
                return this.calculateSimilarity(p1.title, p2.title) > 0.7;
            });

            if (similar.length > 0) {
                groups.push([p1, ...similar]);
                processed.add(p1.id);
                similar.forEach(p => processed.add(p.id));
            }
        });

        return groups;
    },

    // Calculate string similarity (Jaccard index)
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    },

    // Suggest category based on content
    suggestCategoryForPrompt(prompt) {
        const keywords = {
            '写作': ['写', '文案', '文章', '创作', '邮件', '报告', '故事', '小说'],
            '代码': ['代码', '编程', '函数', '调试', '重构', 'code', 'debug', '开发'],
            '翻译': ['翻译', 'convert', '转换', '语言'],
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

    // Suggest better title
    suggestBetterTitle(prompt) {
        const title = prompt.title;

        // Check for v1, v2 etc.
        if (/\bv\d+\b/.test(title)) {
            const baseTitle = title.replace(/\s*v\d+/i, '').trim();
            if (baseTitle) {
                return baseTitle + ' (版本管理)';
            }
        }

        // Check for too short titles
        if (title.length < 5) {
            return null; // Don't suggest for very short titles
        }

        // Check for unclear titles
        const unclearPatterns = [
            /^(help|test|temp|tmp|new|sample)/i,
            /^\d+$/
        ];

        if (unclearPatterns.some(p => p.test(title))) {
            return '待命名 - ' + title;
        }

        return null;
    },

    // Show merge suggestion
    showMergeSuggestion(group) {
        if (group.length < 2) return;

        Components.showToast(`发现 ${group.length} 条可能重复的提示词`, 'ai');

        // Open editor with first prompt, show others in suggestions
        Store.setState({ activePromptId: group[0].id });
    },

    // Apply category
    applyCategory(promptId, category) {
        Store.updatePrompt(promptId, { category });
        App.syncToGist();
        Components.showToast(`已归类到"${category}"`, 'success');
        this.removeSuggestion(promptId, 'category-hint');
    },

    // Apply title
    applyTitle(promptId, title) {
        Store.updatePrompt(promptId, { title });
        App.syncToGist();
        Components.showToast('标题已更新', 'success');
        this.removeSuggestion(promptId, 'title-hint');
    },

    // Remove processed suggestion
    removeSuggestion(promptId, type) {
        this.suggestions = this.suggestions.filter(s =>
            !(s.type === type && s.prompt && s.prompt.id === promptId)
        );
    },

    // Render suggestions UI
    renderSuggestions(container) {
        if (this.suggestions.length === 0) {
            container.innerHTML = '<p style="font-size: 0.875rem; color: var(--ink-light);">暂无整理建议</p>';
            return;
        }

        container.innerHTML = this.suggestions.map(suggestion => {
            if (suggestion.type === 'uncategorized') {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header">
                            <span>📁</span>
                            <span>未分类提示词</span>
                        </div>
                        <div class="ai-suggestion-content">
                            发现 ${suggestion.prompts.length} 条提示词尚未分类
                        </div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.batchCategorize(${JSON.stringify(suggestion.prompts.map(p => p.id))})">批量处理</button>
                            <button class="ignore" onclick="AI.dismissSuggestion('uncategorized')">忽略</button>
                        </div>
                    </div>
                `;
            }

            if (suggestion.type === 'similar') {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header">
                            <span>🔍</span>
                            <span>可能重复</span>
                        </div>
                        <div class="ai-suggestion-content">
                            ${suggestion.prompts.map(p => `"${p.title}"`).join(' 和 ')}
                        </div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.showMergeView(${JSON.stringify(suggestion.prompts)})">查看</button>
                            <button class="ignore" onclick="AI.dismissSuggestion('similar')">忽略</button>
                        </div>
                    </div>
                `;
            }

            if (suggestion.type === 'category-hint' && suggestion.prompt) {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header">
                            <span>📁</span>
                            <span>建议归类</span>
                        </div>
                        <div class="ai-suggestion-content">
                            <strong>"${suggestion.prompt.title}"</strong> → "${suggestion.suggestedCategory}"
                        </div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.applyCategory('${suggestion.prompt.id}', '${suggestion.suggestedCategory}')">应用</button>
                            <button class="ignore" onclick="AI.removeSuggestion('${suggestion.prompt.id}', 'category-hint'); AI.renderSuggestions(document.getElementById('suggestions-list'))">忽略</button>
                        </div>
                    </div>
                `;
            }

            if (suggestion.type === 'title-hint' && suggestion.prompt) {
                return `
                    <div class="ai-suggestion-card">
                        <div class="ai-suggestion-header">
                            <span>✏️</span>
                            <span>优化标题</span>
                        </div>
                        <div class="ai-suggestion-content">
                            <strong>"${suggestion.prompt.title}"</strong> → "${suggestion.suggestedTitle}"
                        </div>
                        <div class="ai-suggestion-actions">
                            <button class="apply" onclick="AI.applyTitle('${suggestion.prompt.id}', '${suggestion.suggestedTitle}')">应用</button>
                            <button class="ignore" onclick="AI.removeSuggestion('${suggestion.prompt.id}', 'title-hint'); AI.renderSuggestions(document.getElementById('suggestions-list'))">忽略</button>
                        </div>
                    </div>
                `;
            }

            return '';
        }).join('');
    },

    // Batch categorize
    batchCategorize(promptIds) {
        // Simple batch categorization based on content
        promptIds.forEach(id => {
            const prompt = Store.state.prompts.find(p => p.id === id);
            if (prompt) {
                const suggested = this.suggestCategoryForPrompt(prompt);
                if (suggested) {
                    Store.updatePrompt(id, { category: suggested });
                }
            }
        });

        App.syncToGist();
        Components.showToast('批量分类完成', 'success');
    },

    // Dismiss all suggestions of a type
    dismissSuggestion(type) {
        this.suggestions = this.suggestions.filter(s => s.type !== type);
        this.renderSuggestions(document.getElementById('suggestions-list'));
    },

    // Show merge view for duplicates
    showMergeView(prompts) {
        if (prompts.length < 2) return;

        // Set the first prompt as active
        Store.setState({ activePromptId: prompts[0].id });
        Components.showToast('请在编辑器中合并重复内容', 'ai');
    }
};

window.AI = AI;