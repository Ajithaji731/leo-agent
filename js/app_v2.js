// Configuration
const INVEST_GAS_URL = 'https://script.google.com/macros/s/AKfycbxQOlfq4Dkroh35JjxKUrTrDsaNRVLE3YNmSsGoaufPlYt2yrXOSWxxex3g1HFhXcw3/exec';
const HABIT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwsawPKIh-cdc3pE_S1eybL0CYimovUhC3N5JEQrojXt4XPOuFJHt4JJvyMnnQROWQR/exec';
const SECURE_ID = '2108'; // Hardcoded as requested

// Global State
let chatHistory = [];

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');




const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// Initialize Icons
lucide.createIcons();

// --- UI Logic ---
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function appendMessage(role, content, animate = true) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
  if (!animate) msgDiv.style.animation = 'none';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content glass-panel';
  
  if (role === 'ai') {
    // Parse markdown for AI messages
    contentDiv.innerHTML = marked.parse(content);
  } else {
    contentDiv.textContent = content;
  }
  
  msgDiv.appendChild(contentDiv);
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return msgDiv;
}

function showTypingIndicator() {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message ai-message typing-indicator-container';
  msgDiv.id = 'typingIndicator';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content glass-panel typing-indicator';
  contentDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  
  msgDiv.appendChild(contentDiv);
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// --- Clear History ---
clearHistoryBtn.addEventListener('click', () => {
  if(confirm('Are you sure you want to clear your chat history?')) {
    chatHistory = [];
    saveChatHistory();
    chatContainer.innerHTML = '<div class="message ai-message"><div class="message-content glass-panel">History cleared. How can I help you today?</div></div>';
    showToast('History Cleared');
  }
});

// --- API Integrations ---

// Load Chat History from Google Sheets
async function loadChatHistory() {
  let payload, response, data, part;
  try {
    const res = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, {
      method: 'POST',
      body: JSON.stringify({ action: 'getChat', userId: SECURE_ID })
    });
    const data = await res.json();
    if (data && data.messages && data.messages.length > 0) {
      chatHistory = data.messages;
      chatContainer.innerHTML = ''; // Clear default greeting
      chatHistory.forEach(msg => {
        if (msg.role !== 'system' && !(msg.content && msg.content.startsWith('SYSTEM DEBUG:'))) { // Don't show system prompts
          appendMessage(msg.role === 'model' ? 'ai' : 'user', msg.content, false);
        }
      });
    }
  } catch (e) {
    console.error("Failed to load history", e);
  }
}

// Save Chat History to Google Sheets
async function saveChatHistory() {
  let payload, response, data, part;
  try {
    fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveChat', userId: SECURE_ID, messages: chatHistory })
    });
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

// Check for On-Load Reminders
function checkReminders() {
  const now = new Date();
  
  // Last day of the month check
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay) {
    const reminder = "Hello! It's the last day of the month. Have you reviewed and logged all your investments?";
    // Check if we already sent a reminder today to avoid spamming on refresh
    const lastReminderDate = localStorage.getItem('last_reminder_date');
    if (lastReminderDate !== now.toDateString()) {
      setTimeout(() => {
        chatHistory.push({ role: 'model', content: reminder });
        appendMessage('ai', reminder);
        saveChatHistory();
        localStorage.setItem('last_reminder_date', now.toDateString());
      }, 1500);
    }
  }
}

// --- LLM Tools ---

const groqTools = [
  {
    type: "function",
    function: {
      name: "update_habit",
      description: "Update the completion status of a habit for today.",
      parameters: {
        type: "object",
        properties: {
          habit_id: {
            type: "string",
            description: "The ID of the habit (e.g. 'sun', 'reading', 'workout', 'meditation')"
          },
          date: {
            type: "string",
            description: "The date to update in YYYY-MM-DD format. Defaults to today if not provided."
          },
          action: {
            type: "string",
            description: "The action to perform: 'check' to mark as complete, 'uncheck' to mark as incomplete. Defaults to 'check'."
          }
        },
        required: ["habit_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_investment",
      description: "Log a new investment amount for a specific asset for the current month.",
      parameters: {
        type: "object",
        properties: {
          asset_id: {
            type: "string",
            description: "The ID of the asset (e.g. 'st_hdfc', 'mf_parag_parikh', 'goal_emergency_fund')"
          },
          amount: {
            type: "number",
            description: "The amount invested"
          }
        },
        required: ["asset_id", "amount"]
      }
    }
  }
,
  {
    type: "function",
    function: {
      name: "get_investments",
      description: "Get the user's current investment portfolio totals.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_habits",
      description: "Get the user's habit tracker history.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

async function executeToolCall(call) {
  try {
    if (call.name === "get_investments") {
      const getRes = await fetch(INVEST_GAS_URL + "?userId=" + SECURE_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getInvestments', userId: SECURE_ID })
      });
      return await getRes.text(); // Return raw string for LLM
    }
    else if (call.name === "get_habits") {
      const getRes = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getHabits', userId: SECURE_ID })
      });
      return await getRes.text();
    }
    else if (call.name === "update_habit") {
      const { habit_id } = call.args;
      const today = new Date().toISOString().split('T')[0];
      const targetDate = call.args.date || today;
      
      const getRes = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getHabits', userId: SECURE_ID })
      });
      let habits = await getRes.json();
      
      if (!Array.isArray(habits)) {
         habits = [];
      }
      
      // Find the habit by name
      let foundHabit = habits.find(h => h.name.toLowerCase() === habit_id.toLowerCase());
      
      // If habit doesn't exist, create it (we use a simple ID if needed)
      if (!foundHabit) {
        foundHabit = { id: crypto.randomUUID ? crypto.randomUUID() : habit_id, name: habit_id, completedDates: [] };
        habits.push(foundHabit);
      }
      
      // Add today if not already there
      const action = call.args.action || 'check';
      if (action === 'check') {
        if (!foundHabit.completedDates.includes(targetDate)) {
          foundHabit.completedDates.push(targetDate);
        }
      } else if (action === 'uncheck') {
        foundHabit.completedDates = foundHabit.completedDates.filter(d => d !== targetDate);
      }
      
      const payload = { userId: SECURE_ID, habits: habits };
      const res = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, { 
        method: "POST", 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      showToast("Habit Synced to Google Sheets!"); showToast("Habit Synced to Google Sheets!"); return { status: "success", result: "Habit updated." };
    } 
    else if (call.name === "add_investment") {
      const { asset_id, amount } = call.args;
      // Get current month in YYYY-MM format
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // We need to fetch current invested amount first, then add to it
      const getRes = await fetch(INVEST_GAS_URL + "?userId=" + SECURE_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getInvestments', userId: SECURE_ID })
      });
      const getData = await getRes.json();
      
      let currentInvested = 0;
      if(getData.records && getData.records[monthStr] && getData.records[monthStr][asset_id]) {
        currentInvested = getData.records[monthStr][asset_id].invested || 0;
      }
      
      const newInvested = currentInvested + amount;
      
      const payload = {
        action: "sync",
        userId: SECURE_ID,
        state: {
          records: {
            [monthStr]: {
              [asset_id]: { invested: newInvested, current: 0 }
            }
          }
        }
      };
      
      const res = await fetch(INVEST_GAS_URL + "?userId=" + SECURE_ID, { 
        method: "POST", 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      showToast("Investment Synced to Google Sheets!"); return { status: "success", result: `Added ${amount}. New total for month: ${newInvested}` };
    }
  } catch (e) {
    showToast("Sync Failed: " + e.toString()); showToast("Sync Failed: " + e.toString()); return { status: "error", message: e.toString() };
  }
  return { status: "error", message: "Unknown function" };
}

// --- Gemini API (LLM Integration) ---

async function sendToGroq(userMessage) {
  chatHistory.push({ role: 'user', content: userMessage });
  let recentHistory = chatHistory.slice(-10);
  
  const systemPrompt = `You are Ajith's personal AI agent. Today's date is ${new Date().toISOString().split('T')[0]}. You have tools to update his Habit Tracker and Investment Portfolio.
If he asks to log an investment or habit, USE THE TOOLS PROVIDED. 
Do not guess asset IDs. Common Asset IDs: 'st_hdfc', 'st_tata_cap', 'st_icici', 'mf_parag_parikh', 'goal_emergency_fund'.
Common Habit IDs: 'sun', 'reading', 'workout', 'meditation'.
If you successfully call a tool, confirm to the user what you just did. Keep responses very short and friendly.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map(msg => {
       if (msg.role === 'model') return { role: 'assistant', content: msg.content };
       if (msg.role === 'functionCall') return { role: 'assistant', content: null, tool_calls: [{ id: "call_id", type: "function", function: { name: msg.call.name, arguments: JSON.stringify(msg.call.args) } }] };
       if (msg.role === 'functionResponse') return { role: 'tool', tool_call_id: "call_id", name: msg.name, content: msg.response };
       return { role: 'user', content: msg.content };
    })
  ];

  let payload = {
    model: "openai/gpt-oss-120b",
    messages: messages,
    tools: groqTools,
    temperature: 0.2,
    max_tokens: 200
  };
  
  // Clean up any undefined content just in case
  payload.messages.forEach(m => {
    if (m.role === 'user' && !m.content) m.content = " ";
    if (m.role === 'assistant' && !m.content && !m.tool_calls) m.content = " ";
  });
  
  try {
    const response = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'chatWithGroq',
        userId: SECURE_ID,
        payload: payload
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
       return "API Error: " + (typeof data.error === 'object' ? JSON.stringify(data.error) : data.error);
    }
    
    const message = data.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      let responses = [];
      for (const toolCall of message.tool_calls) {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (err) {
          continue; // Skip bad json
        }
        
        const call = {
          name: toolCall.function.name,
          args: parsedArgs
        };
        
        recentHistory.push({ role: 'functionCall', call: call });
        chatHistory.push({ role: 'functionCall', call: call });
        
        // Execute tool and wait for result
        const toolResult = await executeToolCall(call);
        let resultStr = "Success";
        if (typeof toolResult === 'string') resultStr = toolResult;
        
        recentHistory.push({ role: 'functionResponse', name: call.name, response: resultStr });
        chatHistory.push({ role: 'functionResponse', name: call.name, response: resultStr });
        
        if (call.name === "update_habit") {
          const action = call.args.action || 'check';
          const targetDate = call.args.date || new Date().toISOString().split('T')[0];
          responses.push(action === 'uncheck' ? `Unmarked **${call.args.habit_id}** for ${targetDate}. ⏪` : `Marked **${call.args.habit_id}** for ${targetDate}! ☀️`);
        } else if (call.name === "add_investment") {
          responses.push(`Logged **₹${call.args.amount}** to **${call.args.asset_id}**! 📈`);
        }
      }
      
      // If we just read data, ask the LLM to summarize it
      const justReadData = message.tool_calls.some(tc => tc.function.name.startsWith('get_'));
      if (justReadData) {
         let newHistory = chatHistory.slice(-10);
         const messages2 = [
           { role: "system", content: systemPrompt },
           ...newHistory.map(msg => {
              if (msg.role === 'model') return { role: 'assistant', content: msg.content || " " };
              if (msg.role === 'functionCall') return { role: 'assistant', content: "", tool_calls: [{ id: "call_id", type: "function", function: { name: msg.call.name, arguments: JSON.stringify(msg.call.args) } }] };
              if (msg.role === 'functionResponse') return { role: 'tool', tool_call_id: "call_id", name: msg.name, content: msg.response };
              return { role: 'user', content: msg.content || " " };
           })
         ];
         messages2.push({ role: 'system', content: 'The tool has returned the raw JSON data. Read it and answer the user\'s question naturally. If the JSON is empty {}, tell them they have no data logged yet.'});

         let payload2 = {
           model: "openai/gpt-oss-120b",
           messages: messages2,
           tools: groqTools,
           temperature: 0.2,
           max_tokens: 200
         };
         try {
           const response2 = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, {
             method: 'POST',
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({
               action: 'chatWithGroq',
               userId: SECURE_ID,
               payload: payload2
             })
           });
           const data2 = await response2.json();
           if (data2.error) return "API Error: " + (typeof data2.error === 'object' ? JSON.stringify(data2.error) : data2.error);
           return data2.choices[0].message.content || "Okay, done!";
         } catch(e) {
           return "Sorry, encountered an error parsing the data.";
         }
      }
      
      if (responses.length > 0) {
         return responses.join("\n");
      }
    }
    
    return message.content || "Okay, done!";
  } catch (e) {
    console.error(e);
    return "Sorry, I encountered an error connecting to the AI brain.";
  }
}

// --- Chat Form Submission ---
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Render user message instantly
  appendMessage('user', text);
  chatInput.value = '';
  
  // Show typing indicator
  showTypingIndicator();
  
  // Get AI response
  const aiResponse = await sendToGroq(text);
  
  // Hide typing indicator and render AI message
  hideTypingIndicator();
  appendMessage('ai', aiResponse);
  
  // Save to history
  chatHistory.push({ role: 'model', content: aiResponse });
  saveChatHistory();
});


// --- Theme Selector ---
const themeSelector = document.getElementById('theme-selector');
const savedTheme = localStorage.getItem('leo_theme') || 'default';

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-alt-dark');
  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }
  localStorage.setItem('leo_theme', theme);
  if (themeSelector) themeSelector.value = theme;
}

applyTheme(savedTheme);

if (themeSelector) {
  themeSelector.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
}

// Initialization

window.addEventListener('DOMContentLoaded', async () => {
  
  await loadChatHistory();
  checkReminders();
});
