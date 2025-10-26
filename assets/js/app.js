// Idealgniter JavaScript functionality

// Idea History Manager
const IdeaHistory = {
    storageKey: 'idealgniter_history',
    maxHistoryItems: 20,

    getHistory() {
        const history = localStorage.getItem(this.storageKey);
        return history ? JSON.parse(history) : [];
    },

    saveIdea(ideaData) {
        let history = this.getHistory();

        // Add new idea at the beginning
        history.unshift({
            id: Date.now(),
            ...ideaData,
            savedAt: new Date().toISOString()
        });

        // Keep only the latest items
        history = history.slice(0, this.maxHistoryItems);

        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.updateHistoryCount();
    },

    deleteIdea(id) {
        let history = this.getHistory();
        history = history.filter(item => item.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.updateHistoryCount();
    },

    clearHistory() {
        localStorage.removeItem(this.storageKey);
        this.updateHistoryCount();
    },

    updateHistoryCount() {
        const count = this.getHistory().length;
        const historyCountEl = document.getElementById('historyCount');
        const viewHistoryBtn = document.getElementById('viewHistoryBtn');

        if (historyCountEl) {
            historyCountEl.textContent = count;
        }

        if (viewHistoryBtn) {
            if (count > 0) {
                viewHistoryBtn.classList.remove('hidden');
            } else {
                viewHistoryBtn.classList.add('hidden');
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const igniteBtn = document.getElementById('igniteBtn');
    const ideaModal = document.getElementById('ideaModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const ideaForm = document.getElementById('ideaForm');
    const ideaTitleInput = document.getElementById('ideaTitle');
    const ideaDescriptionInput = document.getElementById('ideaDescription');

    // Initialize history count
    IdeaHistory.updateHistoryCount();

    // Update rate limit display
    updateRateLimitDisplay();

    // Open modal when Ignite button is clicked
    igniteBtn.addEventListener('click', function() {
        ideaModal.classList.remove('hidden');
        // Clear any existing text
        ideaTitleInput.value = '';
        ideaDescriptionInput.value = '';
        // Focus on first input
        ideaTitleInput.focus();
    });

    // Close modal when Cancel button is clicked
    cancelBtn.addEventListener('click', function() {
        ideaModal.classList.add('hidden');
    });

    // Close modal when clicking outside - with mobile touch safeguards
    let ideaModalTouchStart = null;
    ideaModal.addEventListener('touchstart', function(e) {
        ideaModalTouchStart = e.target;
    }, { passive: true });

    ideaModal.addEventListener('click', function(e) {
        // On touch devices, verify touch started and ended on the overlay
        const isTouchDevice = 'ontouchstart' in window;
        if (e.target === ideaModal && (!isTouchDevice || ideaModalTouchStart === ideaModal)) {
            ideaModal.classList.add('hidden');
        }
        ideaModalTouchStart = null;
    });

    // History modal handlers
    const historyModal = document.getElementById('historyModal');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    viewHistoryBtn.addEventListener('click', function() {
        displayHistoryList();
        historyModal.classList.remove('hidden');
    });

    closeHistoryBtn.addEventListener('click', function() {
        historyModal.classList.add('hidden');
    });

    // Close history modal when clicking outside - with mobile touch safeguards
    let historyModalTouchStart = null;
    historyModal.addEventListener('touchstart', function(e) {
        historyModalTouchStart = e.target;
    }, { passive: true });

    historyModal.addEventListener('click', function(e) {
        // On touch devices, verify touch started and ended on the overlay
        const isTouchDevice = 'ontouchstart' in window;
        if (e.target === historyModal && (!isTouchDevice || historyModalTouchStart === historyModal)) {
            historyModal.classList.add('hidden');
        }
        historyModalTouchStart = null;
    });

    // Handle form submission with AI validation
    ideaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = ideaTitleInput.value.trim();
        const description = ideaDescriptionInput.value.trim();
        const githubRepo = document.getElementById('githubRepo').value.trim();
        
        // Validate input
        if (!title || !description) {
            showError('Please fill in both fields to validate your idea.');
            return;
        }

        if (title.length < 3) {
            showError('Title must be at least 3 characters long.');
            return;
        }

        if (description.length < 10) {
            showError('Description must be at least 10 characters long.');
            return;
        }
        
        // Show loading state
        showLoadingState();
        
        try {
            // Call real OpenAI API with retry logic
            const response = await API.withRetry(() => 
                API.validateIdea(title, description, githubRepo)
            );
            
            if (response.success && response.insights) {
                // Save to history
                IdeaHistory.saveIdea({
                    title: response.idea.title,
                    description: response.idea.description,
                    insights: response.insights,
                    metadata: response.metadata,
                    repoAnalyzed: response.repoAnalyzed,
                    repoUrl: response.repoUrl
                });

                showValidationResults(
                    response.idea.title,
                    response.idea.description,
                    response.insights,
                    response.metadata,
                    response.repoAnalyzed,
                    response.repoUrl
                );
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Validation error:', error);
            handleValidationError(error);
        }
    });

    function showLoadingState() {
        const submitBtn = ideaForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = `
            <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            Analyzing with AI...
        `;
        submitBtn.disabled = true;
    }

    function resetFormState() {
        const submitBtn = ideaForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Validate Idea';
        submitBtn.disabled = false;
    }

    function showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in';
        errorDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl">⚠️</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateX(100%)';
            setTimeout(() => errorDiv.remove(), 300);
        }, 5000);
    }

    function handleValidationError(error) {
        resetFormState();
        
        let errorMessage = 'Failed to analyze your idea. Please try again.';
        
        if (error instanceof APIError) {
            switch (error.type) {
                case 'quota_exceeded':
                    errorMessage = 'API quota exceeded. Please try again later or contact support.';
                    break;
                case 'rate_limit':
                    errorMessage = 'Too many requests. Please wait a moment and try again.';
                    break;
                case 'timeout':
                    errorMessage = 'Request timed out. Please try again with a shorter description.';
                    break;
                case 'network_error':
                    errorMessage = 'Network error. Please check your connection and try again.';
                    break;
                default:
                    errorMessage = error.message;
            }
        }
        
        showError(errorMessage);
    }

    function showValidationResults(title, description, insights, metadata, repoAnalyzed = false, repoUrl = null) {
        // Helper function to get score color
        const getScoreColor = (score) => {
            if (score >= 80) return 'text-green-400';
            if (score >= 60) return 'text-blue-400';
            if (score >= 40) return 'text-yellow-400';
            return 'text-orange-400';
        };

        // Helper function to escape HTML
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        // Create results modal with enhanced AI insights
        const resultsHTML = `
            <div id="resultsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                <div class="glass-card p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="text-center mb-6">
                        <div class="inline-block px-4 py-1 bg-green-500 bg-opacity-20 rounded-full mb-3">
                            <span class="text-green-400 text-sm font-semibold">✨ AI-Powered Analysis</span>
                        </div>
                        <h3 class="text-3xl font-bold text-white mb-2">Idea Validation Results</h3>
                        <p class="text-gray-200 text-lg font-medium">"${escapeHtml(title)}"</p>
                    </div>

                    ${repoAnalyzed ? `
                    <div class="mb-6 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 bg-opacity-20 border border-blue-400 border-opacity-30 rounded-lg">
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-blue-300 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                            <div>
                                <p class="text-sm font-semibold text-blue-200">Repository Analysis Included</p>
                                <p class="text-xs text-blue-300 mt-1">
                                    We analyzed your GitHub codebase for deeper insights
                                    ${repoUrl ? `• <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-100">View Repository</a>` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${insights.summary ? `
                    <div class="mb-6 p-4 bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg">
                        <h4 class="text-sm font-semibold text-blue-400 mb-2">📋 Executive Summary</h4>
                        <p class="text-gray-200 text-sm leading-relaxed">${escapeHtml(insights.summary)}</p>
                    </div>
                    ` : ''}

                    ${insights.repoAnalysis ? `
                    <div class="mb-6 p-5 bg-gradient-to-br from-purple-500 to-indigo-500 bg-opacity-10 border border-purple-400 border-opacity-30 rounded-xl">
                        <h4 class="text-lg font-bold mb-3 text-purple-300 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                            </svg>
                            Technical Codebase Analysis
                        </h4>
                        <p class="text-gray-200 leading-relaxed">${escapeHtml(insights.repoAnalysis)}</p>
                    </div>
                    ` : ''}
                    
                    <div class="grid md:grid-cols-4 gap-3 mb-6">
                        <div class="text-center p-4 bg-gray-800 bg-opacity-50 rounded-lg transform hover:scale-105 transition-transform">
                            <div class="text-3xl font-bold ${getScoreColor(insights.overallScore || 0)}">${insights.overallScore || 'N/A'}%</div>
                            <div class="text-xs text-gray-400 mt-1">Overall Score</div>
                        </div>
                        <div class="text-center p-4 bg-gray-800 bg-opacity-50 rounded-lg transform hover:scale-105 transition-transform">
                            <div class="text-2xl font-bold ${getScoreColor(insights.marketPotential)}">${insights.marketPotential}%</div>
                            <div class="text-xs text-gray-400 mt-1">Market Potential</div>
                        </div>
                        <div class="text-center p-4 bg-gray-800 bg-opacity-50 rounded-lg transform hover:scale-105 transition-transform">
                            <div class="text-2xl font-bold ${getScoreColor(insights.feasibility)}">${insights.feasibility}%</div>
                            <div class="text-xs text-gray-400 mt-1">Feasibility</div>
                        </div>
                        <div class="text-center p-4 bg-gray-800 bg-opacity-50 rounded-lg transform hover:scale-105 transition-transform">
                            <div class="text-2xl font-bold ${getScoreColor(insights.uniqueness)}">${insights.uniqueness}%</div>
                            <div class="text-xs text-gray-400 mt-1">Uniqueness</div>
                        </div>
                    </div>
                    
                    <div class="space-y-4 mb-6">
                        ${insights.targetAudience ? `
                        <div class="p-4 bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg">
                            <h4 class="text-sm font-semibold text-purple-400 mb-2">🎯 Target Audience</h4>
                            <p class="text-gray-200 text-sm">${escapeHtml(insights.targetAudience)}</p>
                        </div>
                        ` : ''}

                        ${insights.competitiveAdvantage ? `
                        <div class="p-4 bg-indigo-500 bg-opacity-10 border border-indigo-500 border-opacity-30 rounded-lg">
                            <h4 class="text-sm font-semibold text-indigo-400 mb-2">🏆 Competitive Advantage</h4>
                            <p class="text-gray-200 text-sm">${escapeHtml(insights.competitiveAdvantage)}</p>
                        </div>
                        ` : ''}

                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 class="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                                    <span>✅</span> Strengths
                                </h4>
                                <ul class="text-gray-200 text-sm space-y-2">
                                    ${insights.strengths.map(strength => 
                                        `<li class="flex items-start gap-2">
                                            <span class="text-green-400 mt-0.5">•</span>
                                            <span>${escapeHtml(strength)}</span>
                                        </li>`
                                    ).join('')}
                                </ul>
                            </div>
                            
                            <div>
                                <h4 class="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                                    <span>⚠️</span> Challenges
                                </h4>
                                <ul class="text-gray-200 text-sm space-y-2">
                                    ${insights.challenges.map(challenge => 
                                        `<li class="flex items-start gap-2">
                                            <span class="text-yellow-400 mt-0.5">•</span>
                                            <span>${escapeHtml(challenge)}</span>
                                        </li>`
                                    ).join('')}
                                </ul>
                            </div>
                        </div>

                        ${insights.potentialRisks && insights.potentialRisks.length > 0 ? `
                        <div>
                            <h4 class="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                                <span>🚨</span> Potential Risks
                            </h4>
                            <ul class="text-gray-200 text-sm space-y-2">
                                ${insights.potentialRisks.map(risk => 
                                    `<li class="flex items-start gap-2">
                                        <span class="text-red-400 mt-0.5">•</span>
                                        <span>${escapeHtml(risk)}</span>
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        <div>
                            <h4 class="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                                <span>💡</span> Recommendations
                            </h4>
                            <ul class="text-gray-200 text-sm space-y-2">
                                ${insights.recommendations.map((rec, index) => 
                                    `<li class="flex items-start gap-2">
                                        <span class="text-blue-400 font-semibold mt-0.5">${index + 1}.</span>
                                        <span>${escapeHtml(rec)}</span>
                                    </li>`
                                ).join('')}
                            </ul>
                        </div>

                        ${insights.nextSteps && insights.nextSteps.length > 0 ? `
                        <div class="p-4 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg">
                            <h4 class="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <span>🚀</span> Immediate Next Steps
                            </h4>
                            <ol class="text-gray-200 text-sm space-y-2">
                                ${insights.nextSteps.map((step, index) => 
                                    `<li class="flex items-start gap-2">
                                        <span class="text-green-400 font-semibold">${index + 1}.</span>
                                        <span>${escapeHtml(step)}</span>
                                    </li>`
                                ).join('')}
                            </ol>
                        </div>
                        ` : ''}

                        ${insights.estimatedTimeToMarket || insights.fundingRequirement ? `
                        <div class="grid md:grid-cols-2 gap-4">
                            ${insights.estimatedTimeToMarket ? `
                            <div class="p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                <div class="text-xs text-gray-400 mb-1">⏱️ Time to Market</div>
                                <div class="text-sm text-gray-200 font-medium">${escapeHtml(insights.estimatedTimeToMarket)}</div>
                            </div>
                            ` : ''}
                            ${insights.fundingRequirement ? `
                            <div class="p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                <div class="text-xs text-gray-400 mb-1">💰 Funding Needs</div>
                                <div class="text-sm text-gray-200 font-medium">${escapeHtml(insights.fundingRequirement)}</div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>

                    ${metadata ? `
                    <div class="text-center text-xs text-gray-500 mb-4 pb-4 border-b border-gray-700">
                        Analyzed by ${metadata.model} • ${metadata.tokensUsed} tokens used
                    </div>
                    ` : ''}
                    
                    <div class="mb-4 flex flex-wrap gap-3">
                        <button id="shareReportBtn" class="flex-1 min-w-[140px] py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                            Share Report
                        </button>
                        <button id="exportPdfBtn" class="flex-1 min-w-[140px] py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                            Export PDF
                        </button>
                        <button id="copyToClipboardBtn" class="flex-1 min-w-[140px] py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            Copy Report
                        </button>
                        <button id="downloadJsonBtn" class="flex-1 min-w-[140px] py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors text-sm flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Save JSON
                        </button>
                    </div>

                    <div class="flex gap-4">
                        <button id="newIdeaBtn" class="flex-1 py-3 px-6 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors font-medium">
                            Validate Another Idea
                        </button>
                        <button id="closeResultsBtn" class="flex-1 cta-button text-white font-bold py-3 px-6 rounded-lg">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', resultsHTML);
        
        // Close original modal
        ideaModal.classList.add('hidden');
        
        // Reset form
        ideaForm.reset();
        resetFormState();
        
        // Add event listeners for results modal
        document.getElementById('closeResultsBtn').addEventListener('click', function() {
            document.getElementById('resultsModal').remove();
        });
        
        document.getElementById('newIdeaBtn').addEventListener('click', function() {
            document.getElementById('resultsModal').remove();
            ideaModal.classList.remove('hidden');
            ideaTitleInput.value = '';
            ideaDescriptionInput.value = '';
            ideaTitleInput.focus();
        });

        // Close with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('resultsModal');
                if (modal) {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                }
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Share Report functionality
        document.getElementById('shareReportBtn').addEventListener('click', async function() {
            const button = this;
            const originalText = button.innerHTML;

            try {
                // Generate shareable URL
                const reportData = {
                    title,
                    description,
                    insights,
                    repoAnalyzed,
                    repoUrl
                };

                const shareURL = ShareUtils.generateShareableURL(reportData);
                
                if (!shareURL) {
                    throw new Error('Failed to generate share URL');
                }

                // Copy to clipboard
                const copied = await ShareUtils.copyToClipboard(shareURL);

                if (copied) {
                    button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Link Copied!';
                    showSuccessNotification('Shareable link copied to clipboard!');
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                    }, 2000);
                } else {
                    throw new Error('Failed to copy to clipboard');
                }
            } catch (error) {
                console.error('Share error:', error);
                showError('Failed to create share link. Please try again.');
            }
        });

        // Export to PDF functionality
        document.getElementById('exportPdfBtn').addEventListener('click', async function() {
            const button = this;
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Generating...';
            button.disabled = true;

            try {
                const element = document.getElementById('resultsModal').querySelector('.glass-card');
                const opt = {
                    margin: 10,
                    filename: `idealgniter-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#1a1a2e' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                await html2pdf().set(opt).from(element).save();

                showSuccessNotification('PDF exported successfully!');
            } catch (error) {
                console.error('PDF export error:', error);
                showError('Failed to export PDF. Please try again.');
            } finally {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });

        // Copy to Clipboard functionality
        document.getElementById('copyToClipboardBtn').addEventListener('click', async function() {
            const button = this;
            const originalText = button.innerHTML;

            try {
                // Create markdown version of the report
                let markdown = `# ${title}\n\n`;
                markdown += `**Description:** ${description}\n\n`;
                markdown += `---\n\n`;
                markdown += `## Overall Score: ${insights.overallScore || 'N/A'}%\n\n`;
                markdown += `- **Market Potential:** ${insights.marketPotential}%\n`;
                markdown += `- **Feasibility:** ${insights.feasibility}%\n`;
                markdown += `- **Uniqueness:** ${insights.uniqueness}%\n\n`;

                if (insights.summary) {
                    markdown += `## Executive Summary\n${insights.summary}\n\n`;
                }

                if (insights.targetAudience) {
                    markdown += `## Target Audience\n${insights.targetAudience}\n\n`;
                }

                if (insights.competitiveAdvantage) {
                    markdown += `## Competitive Advantage\n${insights.competitiveAdvantage}\n\n`;
                }

                markdown += `## Strengths\n`;
                insights.strengths.forEach(s => markdown += `- ${s}\n`);

                markdown += `\n## Challenges\n`;
                insights.challenges.forEach(c => markdown += `- ${c}\n`);

                if (insights.potentialRisks && insights.potentialRisks.length > 0) {
                    markdown += `\n## Potential Risks\n`;
                    insights.potentialRisks.forEach(r => markdown += `- ${r}\n`);
                }

                markdown += `\n## Recommendations\n`;
                insights.recommendations.forEach((r, i) => markdown += `${i + 1}. ${r}\n`);

                if (insights.nextSteps && insights.nextSteps.length > 0) {
                    markdown += `\n## Next Steps\n`;
                    insights.nextSteps.forEach((s, i) => markdown += `${i + 1}. ${s}\n`);
                }

                if (insights.estimatedTimeToMarket) {
                    markdown += `\n**Time to Market:** ${insights.estimatedTimeToMarket}\n`;
                }

                if (insights.fundingRequirement) {
                    markdown += `**Funding Needs:** ${insights.fundingRequirement}\n`;
                }

                markdown += `\n---\n*Generated by Idealgniter - AI-Powered Idea Validation*`;

                await navigator.clipboard.writeText(markdown);

                button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!';
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);

                showSuccessNotification('Report copied to clipboard!');
            } catch (error) {
                console.error('Clipboard error:', error);
                showError('Failed to copy to clipboard. Please try again.');
            }
        });

        // Download JSON functionality
        document.getElementById('downloadJsonBtn').addEventListener('click', function() {
            const button = this;
            const originalText = button.innerHTML;

            try {
                const data = {
                    idea: { title, description },
                    insights,
                    metadata,
                    exportedAt: new Date().toISOString()
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `idealgniter-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Saved!';
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);

                showSuccessNotification('JSON data saved successfully!');
            } catch (error) {
                console.error('JSON download error:', error);
                showError('Failed to save JSON. Please try again.');
            }
        });
    }

    // Success notification helper
    function showSuccessNotification(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in';
        successDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl">✅</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.style.opacity = '0';
            successDiv.style.transform = 'translateX(100%)';
            setTimeout(() => successDiv.remove(), 300);
        }, 3000);
    }

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !ideaModal.classList.contains('hidden')) {
            ideaModal.classList.add('hidden');
        }
    });

    // Display history list function
    function displayHistoryList() {
        const historyList = document.getElementById('historyList');
        const history = IdeaHistory.getHistory();

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <p class="text-xl mb-2">No ideas validated yet</p>
                    <p class="text-sm">Your validated ideas will appear here</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map(item => {
            const savedDate = new Date(item.savedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const getScoreColor = (score) => {
                if (score >= 80) return 'text-green-400';
                if (score >= 60) return 'text-blue-400';
                if (score >= 40) return 'text-yellow-400';
                return 'text-orange-400';
            };

            return `
                <div class="p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <h4 class="text-lg font-semibold text-white mb-1">${escapeHtml(item.title)}</h4>
                            <p class="text-xs text-gray-400">${savedDate}</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="viewHistoryItem(${item.id})" class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                                View Details
                            </button>
                            <button onclick="deleteHistoryItem(${item.id})" class="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                    <p class="text-sm text-gray-300 mb-3 line-clamp-2">${escapeHtml(item.description)}</p>
                    <div class="flex gap-4 text-sm">
                        <div class="flex items-center gap-1">
                            <span class="text-gray-400">Overall:</span>
                            <span class="font-bold ${getScoreColor(item.insights.overallScore || 0)}">${item.insights.overallScore || 'N/A'}%</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-gray-400">Market:</span>
                            <span class="font-semibold ${getScoreColor(item.insights.marketPotential)}">${item.insights.marketPotential}%</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-gray-400">Feasibility:</span>
                            <span class="font-semibold ${getScoreColor(item.insights.feasibility)}">${item.insights.feasibility}%</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-gray-400">Uniqueness:</span>
                            <span class="font-semibold ${getScoreColor(item.insights.uniqueness)}">${item.insights.uniqueness}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('') + `
            <div class="pt-4 border-t border-gray-700 text-center">
                <button onclick="clearAllHistory()" class="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                    Clear All History
                </button>
            </div>
        `;
    }

    // Make functions globally accessible for onclick handlers
    window.viewHistoryItem = function(id) {
        const history = IdeaHistory.getHistory();
        const item = history.find(h => h.id === id);
        if (item) {
            document.getElementById('historyModal').classList.add('hidden');
            showValidationResults(
                item.title,
                item.description,
                item.insights,
                item.metadata,
                item.repoAnalyzed,
                item.repoUrl
            );
        }
    };

    window.deleteHistoryItem = function(id) {
        if (confirm('Are you sure you want to delete this idea from history?')) {
            IdeaHistory.deleteIdea(id);
            displayHistoryList();
        }
    };

    window.clearAllHistory = function() {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            IdeaHistory.clearHistory();
            displayHistoryList();
        }
    };

    // Helper function for escaping HTML (reuse existing one)
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Update rate limit display
    function updateRateLimitDisplay() {
        const rateLimitInfo = localStorage.getItem('rateLimitInfo');
        if (rateLimitInfo) {
            try {
                const info = JSON.parse(rateLimitInfo);
                const rateLimitEl = document.getElementById('rateLimitInfo');
                const rateLimitTextEl = document.getElementById('rateLimitText');

                if (info.remaining !== null && rateLimitEl && rateLimitTextEl) {
                    rateLimitTextEl.textContent = `${info.remaining}/${info.limit} requests remaining`;
                    rateLimitEl.classList.remove('hidden');

                    // Change color based on remaining requests
                    rateLimitEl.classList.remove('bg-blue-500', 'bg-yellow-500', 'bg-red-500');
                    if (info.remaining <= 1) {
                        rateLimitEl.classList.add('bg-red-500');
                    } else if (info.remaining <= 2) {
                        rateLimitEl.classList.add('bg-yellow-500');
                    } else {
                        rateLimitEl.classList.add('bg-blue-500');
                    }
                }
            } catch (error) {
                console.error('Error parsing rate limit info:', error);
            }
        }
    }
});