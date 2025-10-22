// Idealgniter JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    const igniteBtn = document.getElementById('igniteBtn');
    const ideaModal = document.getElementById('ideaModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const ideaForm = document.getElementById('ideaForm');
    const ideaTitleInput = document.getElementById('ideaTitle');
    const ideaDescriptionInput = document.getElementById('ideaDescription');

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

    // Close modal when clicking outside
    ideaModal.addEventListener('click', function(e) {
        if (e.target === ideaModal) {
            ideaModal.classList.add('hidden');
        }
    });

    // Handle form submission with AI validation
    ideaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = ideaTitleInput.value.trim();
        const description = ideaDescriptionInput.value.trim();
        
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
                API.validateIdea(title, description)
            );
            
            if (response.success && response.insights) {
                showValidationResults(
                    response.idea.title,
                    response.idea.description,
                    response.insights,
                    response.metadata
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

    function showValidationResults(title, description, insights, metadata) {
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

                    ${insights.summary ? `
                    <div class="mb-6 p-4 bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg">
                        <h4 class="text-sm font-semibold text-blue-400 mb-2">📋 Executive Summary</h4>
                        <p class="text-gray-200 text-sm leading-relaxed">${escapeHtml(insights.summary)}</p>
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
    }

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !ideaModal.classList.contains('hidden')) {
            ideaModal.classList.add('hidden');
        }
    });
});