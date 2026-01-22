// ========================================
// CHATBOT SYSTEM - AI Data Query Assistant
// Helps users query system data through natural language
// ========================================

let chatHistory = [];

// Toggle chatbot visibility
function toggleChatbot() {
  const panel = document.getElementById('chatbotPanel');
  const backdrop = document.getElementById('chatbotBackdrop');

  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    // Focus on input
    setTimeout(() => {
      document.getElementById('chatInput').focus();
    }, 100);
  } else {
    panel.classList.add('hidden');
    backdrop.classList.add('hidden');
  }
}

// Quick question buttons
function askQuickQuestion(question) {
  document.getElementById('chatInput').value = question;
  sendChatMessage();
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  // Add user message to chat
  addChatMessage('user', message);

  // Clear input
  input.value = '';

  // Show typing indicator
  showTypingIndicator();

  // Get AI response
  try {
    const response = await getAIResponse(message);
    removeTypingIndicator();
    addChatMessage('assistant', response);
  } catch (error) {
    removeTypingIndicator();
    addChatMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
    console.error('Chatbot error:', error);
  }
}

// Add message to chat UI
function addChatMessage(role, content) {
  const messagesContainer = document.getElementById('chatMessages');
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  chatHistory.push({ role, content, timestamp });

  let messageHTML = '';

  if (role === 'user') {
    messageHTML = `
      <div class="flex gap-3 justify-end">
        <div class="flex-1 max-w-[80%]">
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-tr-none shadow-sm p-3">
            <div class="text-sm">${escapeHTML(content)}</div>
          </div>
          <div class="text-xs text-slate-500 mt-1 mr-2 text-right">${timestamp}</div>
        </div>
        <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white text-xs font-semibold">
          You
        </div>
      </div>
    `;
  } else {
    messageHTML = `
      <div class="flex gap-3">
        <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
        <div class="flex-1">
          <div class="bg-white rounded-2xl rounded-tl-none shadow-sm border p-3">
            <div class="text-sm text-slate-800 prose prose-sm max-w-none">${formatResponse(content)}</div>
          </div>
          <div class="text-xs text-slate-500 mt-1 ml-2">${timestamp}</div>
        </div>
      </div>
    `;
  }

  messagesContainer.insertAdjacentHTML('beforeend', messageHTML);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const messagesContainer = document.getElementById('chatMessages');
  const typingHTML = `
    <div id="typingIndicator" class="flex gap-3">
      <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
      <div class="flex-1">
        <div class="bg-white rounded-2xl rounded-tl-none shadow-sm border p-3">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// Get AI response
async function getAIResponse(userMessage) {
  // Analyze user intent and query relevant data
  const intent = analyzeIntent(userMessage);
  const data = getRelevantData(intent);

  // If using real API, send to backend
  if (AI_CONFIG.useRealAPI) {
    try {
      const response = await fetch(AI_CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chatbot_query',
          message: userMessage,
          context: {
            intent,
            data,
            currentView: STATE.activeView,
            filters: STATE.filters
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        return result.response;
      }
    } catch (error) {
      console.warn('Real API failed, using mock response:', error);
    }
  }

  // Mock response based on intent
  return generateMockResponse(intent, data, userMessage);
}

// Analyze user intent
function analyzeIntent(message) {
  const lower = message.toLowerCase();

  if (lower.includes('yield') || lower.includes('fpy')) {
    return 'yield_query';
  } else if (lower.includes('completion') || lower.includes('commit')) {
    return 'completion_query';
  } else if (lower.includes('lead') || lower.includes('leadtime') || lower.includes('lead-time')) {
    return 'leadtime_query';
  } else if (lower.includes('fv') || lower.includes('variance') || lower.includes('budget')) {
    return 'fv_query';
  } else if (lower.includes('bottleneck') || lower.includes('critical') || lower.includes('issue')) {
    return 'bottleneck_query';
  } else if (lower.includes('weekly') || lower.includes('summary') || lower.includes('status')) {
    return 'weekly_query';
  } else if (lower.includes('capacity') || lower.includes('utilization')) {
    return 'capacity_query';
  } else if (lower.includes('material') || lower.includes('supply')) {
    return 'material_query';
  } else {
    return 'general_query';
  }
}

// Get relevant data based on intent
function getRelevantData(intent) {
  const data = {};

  switch (intent) {
    case 'yield_query':
      data.weeklyYield = 94.2;
      data.cumulativeYield = 96.8;
      data.target = 97.5;
      data.variance = -3.3;
      break;

    case 'completion_query':
      data.exfCommit = 94;
      data.capacityUtilization = 87;
      data.laborFulfillment = 96;
      break;

    case 'leadtime_query':
      data.totalLeadtime = 28;
      data.standardLeadtime = 23;
      data.variance = 5;
      data.criticalStage = 'FAT Input';
      break;

    case 'fv_query':
      data.budget = 2.4;
      data.claimed = 3.8;
      data.final = 2.9;
      data.savings = 0.9;
      break;

    case 'bottleneck_query':
      data.bottlenecks = [
        { stage: 'FAT Input', variance: 1.2, severity: 'Critical' },
        { stage: 'Material Kitting', variance: 2.0, severity: 'High' },
        { stage: 'Yield (Test)', variance: -3.3, severity: 'High' }
      ];
      break;

    case 'weekly_query':
      data.input = 145200;
      data.output = 138400;
      data.forecast = 150000;
      data.yield = 94.2;
      break;

    case 'capacity_query':
      data.utilization = 87;
      data.available = 150000;
      data.used = 130500;
      break;

    case 'material_query':
      data.coverage = 98;
      data.cumSupply = 1845000;
      data.cumDemand = 1875000;
      break;
  }

  return data;
}

// Generate mock response
function generateMockResponse(intent, data, userMessage) {
  let response = '';

  switch (intent) {
    case 'yield_query':
      response = `📊 **Current Yield Status:**\n\n`;
      response += `• **Weekly Yield (FPY):** ${data.weeklyYield}%\n`;
      response += `• **Cumulative Yield:** ${data.cumulativeYield}%\n`;
      response += `• **Target:** ${data.target}%\n`;
      response += `• **Variance:** ${data.variance}% (Below target)\n\n`;
      response += `⚠️ **Alert:** Weekly yield is ${Math.abs(data.variance)}% below target. The yield drift at Test station is impacting output. Recommend prioritizing re-test lane capacity.`;
      break;

    case 'completion_query':
      response = `✅ **Completion Status:**\n\n`;
      response += `• **Ex-F to Supply Commit:** ${data.exfCommit}% (On Track)\n`;
      response += `• **Capacity Utilization:** ${data.capacityUtilization}% (Moderate)\n`;
      response += `• **Labor Fulfillment:** ${data.laborFulfillment}% (Excellent)\n\n`;
      response += `Overall production is on track with strong labor fulfillment. Capacity utilization is at healthy levels.`;
      break;

    case 'leadtime_query':
      response = `⏱️ **Manufacturing Lead-time:**\n\n`;
      response += `• **Total Actual:** ${data.totalLeadtime} days\n`;
      response += `• **Standard:** ${data.standardLeadtime} days\n`;
      response += `• **Variance:** +${data.variance} days\n\n`;
      response += `🔴 **Critical Bottleneck:** ${data.criticalStage} stage is 30% over standard.\n\n`;
      response += `**Recommended Actions:**\n• Increase test capacity\n• Optimize changeover time\n• Add weekend shift for critical SKUs`;
      break;

    case 'fv_query':
      response = `💰 **Factory Variance (FV) Status:**\n\n`;
      response += `• **Total Budget:** $${data.budget}M\n`;
      response += `• **Claimed by CM:** $${data.claimed}M\n`;
      response += `• **Final (Negotiated):** $${data.final}M\n`;
      response += `• **Savings:** $${data.savings}M (24% reduction)\n\n`;
      response += `✅ Team successfully negotiated down significant costs, but final is still 21% over budget. Consider tighter variance controls for next year.`;
      break;

    case 'bottleneck_query':
      response = `🚨 **Critical Bottlenecks:**\n\n`;
      data.bottlenecks.forEach((b, i) => {
        response += `${i + 1}. **${b.stage}**\n   • Variance: +${b.variance} days/points\n   • Severity: ${b.severity}\n\n`;
      });
      response += `These are the top areas requiring immediate attention to protect weekly commit.`;
      break;

    case 'weekly_query':
      response = `📅 **Weekly Production Summary:**\n\n`;
      response += `• **Input:** ${data.input.toLocaleString()} units (97% of target)\n`;
      response += `• **Output:** ${data.output.toLocaleString()} units (92% of target)\n`;
      response += `• **Forecast:** ${data.forecast.toLocaleString()} units\n`;
      response += `• **Yield:** ${data.yield}%\n\n`;
      response += `Output is slightly below target due to yield issues. Monitor closely.`;
      break;

    case 'capacity_query':
      response = `🏭 **Capacity Status:**\n\n`;
      response += `• **Utilization:** ${data.utilization}%\n`;
      response += `• **Available:** ${data.available.toLocaleString()} units/week\n`;
      response += `• **Currently Used:** ${data.used.toLocaleString()} units/week\n\n`;
      response += `Capacity utilization is at moderate levels with room for growth.`;
      break;

    case 'material_query':
      response = `📦 **Material Supply Status:**\n\n`;
      response += `• **Coverage:** ${data.coverage}%\n`;
      response += `• **Cumulative Supply:** ${data.cumSupply.toLocaleString()} units\n`;
      response += `• **Cumulative Demand:** ${data.cumDemand.toLocaleString()} units\n\n`;
      response += `Material supply is healthy with ${data.coverage}% coverage.`;
      break;

    default:
      response = `I can help you with information about:\n\n`;
      response += `• Production metrics (yield, output, input)\n`;
      response += `• Completion status and capacity\n`;
      response += `• Lead-time performance\n`;
      response += `• Factory variance costs\n`;
      response += `• Critical bottlenecks\n`;
      response += `• Material supply status\n\n`;
      response += `Try asking a specific question like "What is the current weekly yield?" or "Show me completion status"`;
  }

  return response;
}

// Format response with markdown-like formatting
function formatResponse(text) {
  // Convert markdown-style formatting to HTML
  let formatted = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')  // **bold**
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')              // *italic*
    .replace(/\n/g, '<br>')                              // line breaks
    .replace(/• /g, '<span class="inline-block w-4">•</span> '); // bullets

  return formatted;
}

// Escape HTML
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export functions
window.toggleChatbot = toggleChatbot;
window.askQuickQuestion = askQuickQuestion;
window.sendChatMessage = sendChatMessage;
