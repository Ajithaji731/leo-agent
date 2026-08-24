// Configuration
const INVEST_GAS_URL = 'https://script.google.com/macros/s/AKfycbwggOUodVCdLua57K3DVVIdmn8J12uZWClM47tlWz3xzOrkkI_cc62EeHazaVhrsHqT/exec';
const AI_CHAT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzGKwN7SseLOsaQeOnql_3cmMqaM4u7gJdcoIXsCbhn104CqpaECzwV9U6PwidLas0y/exec';
const HABIT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwTLJ5PSqaSlghakcqWW7s5-0GhBrC9KhUl5cUMfmwkkphNEiarrbEWYglYnnOcCXzo2w/exec';
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
    const res = await fetch(AI_CHAT_GAS_URL + "?userId=" + SECURE_ID, {
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
    fetch(AI_CHAT_GAS_URL + "?userId=" + SECURE_ID, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveChat', userId: SECURE_ID, messages: chatHistory })
    });
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

// --- Preloaded Invest Assets & Default Fallback ---
const DEFAULT_INVEST_ASSETS = [
  { id: 'st_tata_cap', name: 'TATA Capital', category: 'Stocks/ETFs', sector: 'Financial Services (NBFC)' },
  { id: 'st_tatsilv', name: 'TATSILV', category: 'Stocks/ETFs', sector: 'Commodities - Silver' },
  { id: 'st_goldietf', name: 'GOLDIETF', category: 'Stocks/ETFs', sector: 'Commodities - Gold' },
  { id: 'st_hdfc', name: 'HDFC BANK', category: 'Stocks/ETFs', sector: 'Banking - Private Sector' },
  { id: 'st_bpcl', name: 'BPCL', category: 'Stocks/ETFs', sector: 'Oil & Gas' },
  { id: 'st_icici', name: 'ICICI BANK', category: 'Stocks/ETFs', sector: 'Banking - Private Sector' },
  { id: 'st_metalietf', name: 'METALIETF', category: 'Stocks/ETFs', sector: 'Metals & Mining' },
  { id: 'st_southbank', name: 'SOUTHBANK', category: 'Stocks/ETFs', sector: 'Banking - Private Sector' },
  { id: 'st_nippon_it', name: 'Nippon India ETF IT', category: 'Stocks/ETFs', sector: 'Information Technology' },
  { id: 'mf_parag_parikh', name: 'Parag parikh flexi cap fund - Direct', category: 'Mutual Funds', sector: 'Flexi Cap' },
  { id: 'mf_icici_n50', name: 'ICICI Prudential Nifty 50 Index Fund - Direct', category: 'Mutual Funds', sector: 'Index Fund' },
  { id: 'mf_bandhan_small', name: 'Bandhan Small Cap Fund - Direct', category: 'Mutual Funds', sector: 'Small Cap' },
  { id: 'epf_balance', name: 'EPF Balance', category: 'EPF', sector: 'Retirement' },
  { id: 'ppf_balance', name: 'PPF Balance', category: 'PPF', sector: 'Retirement' },
  { id: 'nps_tier1', name: 'NPS Tier 1', category: 'NPS', sector: 'Retirement' },
  { id: 'nps_tier2', name: 'NPS Tier 2', category: 'NPS', sector: 'Retirement' },
  { id: 'goal_emergency_fund', name: 'Emergency Fund', category: 'Emergency Fund', sector: 'Emergency Savings' },
  { id: 'goal_car_fund', name: 'Car Fund', category: 'Goals', sector: 'Car Purchase 2028' },
  { id: 'goal_digi_gold', name: 'Digi Gold', category: 'Gold Investment', sector: 'Gold Investments' }
];

async function fetchInvestCloudState() {
  try {
    const res = await fetch(`${INVEST_GAS_URL}?userId=${SECURE_ID}&t=${Date.now()}`);
    const data = await res.json();
    let stateObj = data.records ? data : (data.state && data.state.records ? data.state : null);
    if (stateObj && stateObj.records && Object.keys(stateObj.records).length > 0) {
      if (!stateObj.assets || stateObj.assets.length === 0) stateObj.assets = DEFAULT_INVEST_ASSETS;
      return stateObj;
    }
  } catch (e) {
    console.error("Failed to fetch cloud invest state, using defaults", e);
  }
  return {
    assets: DEFAULT_INVEST_ASSETS,
    records: {},
    lastModified: Date.now()
  };
}

async function saveInvestCloudState(stateObj) {
  stateObj.lastModified = Date.now();
  const payload = {
    action: "sync",
    userId: SECURE_ID,
    state: stateObj
  };
  const res = await fetch(`${INVEST_GAS_URL}?userId=${SECURE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

function matchAsset(assetsList, identifier) {
  if (!identifier) return null;
  const clean = identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Exact ID
  let match = assetsList.find(a => a.id.toLowerCase() === identifier.toLowerCase());
  if (match) return match;
  
  // Exact name or clean match
  match = assetsList.find(a => a.name.toLowerCase() === identifier.toLowerCase() || a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
  if (match) return match;
  
  // Partial / alias match
  const aliases = {
    'paragparikh': 'mf_parag_parikh',
    'flexicap': 'mf_parag_parikh',
    'icicin50': 'mf_icici_n50',
    'nifty50': 'mf_icici_n50',
    'bandhansmall': 'mf_bandhan_small',
    'smallcap': 'mf_bandhan_small',
    'emergencyfund': 'goal_emergency_fund',
    'emergency': 'goal_emergency_fund',
    'carfund': 'goal_car_fund',
    'car': 'goal_car_fund',
    'digigold': 'goal_digi_gold',
    'goldietf': 'st_goldietf',
    'gold': 'st_goldietf',
    'tatsilv': 'st_tatsilv',
    'silver': 'st_tatsilv',
    'epf': 'epf_balance',
    'ppf': 'ppf_balance',
    'npstier1': 'nps_tier1',
    'npstier2': 'nps_tier2',
    'nps': 'nps_tier1',
    'hdfc': 'st_hdfc',
    'icicibank': 'st_icici',
    'bpcl': 'st_bpcl',
    'tatacapital': 'st_tata_cap',
    'metalietf': 'st_metalietf',
    'nipponit': 'st_nippon_it',
    'southbank': 'st_southbank'
  };
  
  for (const [k, targetId] of Object.entries(aliases)) {
    if (clean.includes(k) || k.includes(clean)) {
      return assetsList.find(a => a.id === targetId);
    }
  }
  
  return assetsList.find(a => a.name.toLowerCase().includes(identifier.toLowerCase()) || identifier.toLowerCase().includes(a.name.toLowerCase()));
}

function matchHabit(habitsList, identifier) {
  if (!identifier || !Array.isArray(habitsList)) return null;
  const clean = identifier.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Exact ID
  let match = habitsList.find(h => h.id && h.id.toLowerCase() === identifier.toLowerCase().trim());
  if (match) return match;
  
  // Exact name or clean match
  match = habitsList.find(h => h.name && (h.name.toLowerCase() === identifier.toLowerCase().trim() || h.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean));
  if (match) return match;
  
  // Alias dictionary
  const aliases = {
    'sre': 'SRE',
    'workout': 'Workout',
    'gym': 'Workout',
    'exercise': 'Workout',
    'sun': 'Sun',
    'sunlight': 'Sun',
    'consistency': 'Consistency',
    'math': 'Maths',
    'maths': 'Maths',
    'mathematics': 'Maths',
    'iq': 'IQ',
    'fingernail': 'Finger nail',
    'fingernails': 'Finger nail',
    'nail': 'Finger nail',
    'nails': 'Finger nail'
  };
  
  if (aliases[clean]) {
    const targetName = aliases[clean];
    match = habitsList.find(h => h.name && h.name.toLowerCase() === targetName.toLowerCase());
    if (match) return match;
  }
  
  // Substring match
  return habitsList.find(h => h.name && (h.name.toLowerCase().includes(identifier.toLowerCase().trim()) || identifier.toLowerCase().trim().includes(h.name.toLowerCase())));
}

// Normalize month string e.g. "september", "sept", "2026-09" -> "2026-09"
function normalizeMonth(monthInput) {
  if (!monthInput) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const currentYear = new Date().getFullYear();
  const input = monthInput.toLowerCase().trim();
  
  if (/^\d{4}-\d{2}$/.test(input)) return input;
  
  const months = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sept': '09', 'sep': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };
  
  for (const [mName, mNum] of Object.entries(months)) {
    if (input.includes(mName)) {
      const yearMatch = input.match(/\b(20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : currentYear;
      return `${year}-${mNum}`;
    }
  }
  return `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

// Check for On-Load Reminders
function checkReminders() {
  const now = new Date();
  
  // 1. Groq API Key Expiration Check (Target: Aug 20, 2027)
  const groqExpiryDate = new Date('2027-08-20T23:59:59');
  const daysUntilExpiry = Math.ceil((groqExpiryDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
    const lastKeyWarning = localStorage.getItem('last_groq_key_warning');
    if (lastKeyWarning !== now.toDateString()) {
      setTimeout(() => {
        const warn = `⚠️ **Reminder**: Your Groq API Key will expire in **${daysUntilExpiry} days** (on August 20, 2027). Please remember to renew it before then!`;
        chatHistory.push({ role: 'model', content: warn });
        appendMessage('ai', warn);
        saveChatHistory();
        localStorage.setItem('last_groq_key_warning', now.toDateString());
      }, 2000);
    }
  }
  
  // 2. Last day of the month check
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay) {
    const reminder = "Hello! It's the last day of the month. Have you reviewed and logged all your investments?";
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
      description: "Update the completion status of one or multiple habits for a given date.",
      parameters: {
        type: "object",
        properties: {
          habit_ids: {
            anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }],
            description: "List of habit names or IDs to update (e.g. ['SRE', 'Workout', 'Sun'])."
          },
          habit_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Single habit name or ID to update (e.g. 'Workout')."
          },
          date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "The date to update in YYYY-MM-DD format. Defaults to today if not provided."
          },
          action: {
            anyOf: [{ type: "string", enum: ["check", "uncheck"] }, { type: "null" }],
            description: "The action to perform: 'uncheck' when user asks to unmark, undo, or remove habit completion; 'check' when user did/completed a habit. Defaults to 'check'."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "manage_investments",
      description: "Log, add, or update investment amounts for one or multiple assets for a specific month (e.g. September 2026). Safely preserves all other assets and months.",
      parameters: {
        type: "object",
        properties: {
          month: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "The target month (e.g. '2026-09', 'September', 'Sep 2026'). Defaults to current month."
          },
          investments: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    asset_id: { type: "string" },
                    amount: { type: "number" },
                    mode: { anyOf: [{ type: "string" }, { type: "null" }] }
                  },
                  required: ["asset_id", "amount"]
                }
              },
              { type: "null" }
            ],
            description: "List of investments to add or update"
          },
          asset_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Single asset name or ID (fallback if single investment)"
          },
          amount: {
            anyOf: [{ type: "number" }, { type: "null" }],
            description: "Amount (fallback if single investment)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_investment_data",
      description: "Remove investment data for a specific month alone (e.g. delete 'September 2026' records), or remove a specific asset from that month without touching any other months.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "The month to delete records for (e.g. '2026-09', 'September')."
          },
          asset_id: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Optional. If specified, only removes this single asset from that month. If omitted, deletes the entire month record."
          }
        },
        required: ["month"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_investments",
      description: "Get the user's investment portfolio data, asset balances, goals, emergency fund, and month-by-month records.",
      parameters: {
        type: "object",
        properties: {
          month: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Optional specific month to inspect (e.g. '2026-08', 'August'). If omitted, returns latest overview."
          },
          category: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Optional category filter (e.g. 'Mutual Funds', 'Goals', 'Emergency Fund', 'Stocks/ETFs', 'EPF', 'NPS')."
          }
        },
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
      const state = await fetchInvestCloudState();
      const months = Object.keys(state.records || {}).sort();
      if (months.length === 0) return JSON.stringify({ message: "No investment records found" });
      
      const targetMonth = call.args.month ? normalizeMonth(call.args.month) : months[months.length - 1];
      const monthData = state.records[targetMonth] || {};
      const assets = state.assets || DEFAULT_INVEST_ASSETS;
      
      let totalNetWorth = 0;
      let totalCore = 0;
      let categoryTotals = {};
      let items = [];
      
      assets.forEach(asset => {
        const rec = monthData[asset.id];
        const val = (rec && rec.invested) ? Number(rec.invested) : 0;
        if (val > 0) {
          totalNetWorth += val;
          if (asset.category !== 'Goals' && asset.category !== 'Emergency Fund' && asset.category !== 'Gold Investment') {
            totalCore += val;
          }
          categoryTotals[asset.category] = (categoryTotals[asset.category] || 0) + val;
          items.push({ asset: asset.name, category: asset.category, invested: val });
        }
      });
      
      return JSON.stringify({
        month: targetMonth,
        totalNetWorth: totalNetWorth,
        coreInvestments: totalCore,
        categoryTotals: categoryTotals,
        holdings: items
      });
    }
    else if (call.name === "get_habits") {
      const getRes = await fetch(`${HABIT_GAS_URL}?userId=${SECURE_ID}&t=${Date.now()}`);
      return await getRes.text();
    }
    else if (call.name === "update_habit") {
      let rawHabitIds = call.args.habit_ids || call.args.habit_id;
      let habitListToUpdate = [];
      if (Array.isArray(rawHabitIds)) {
        habitListToUpdate = rawHabitIds;
      } else if (typeof rawHabitIds === 'string') {
        habitListToUpdate = rawHabitIds.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const today = new Date().toISOString().split('T')[0];
      const targetDate = call.args.date || today;
      const action = call.args.action || 'check';
      
      const getRes = await fetch(`${HABIT_GAS_URL}?userId=${SECURE_ID}&t=${Date.now()}`);
      let rawData = await getRes.json();
      let habits = [];
      let isObjectWrapper = false;
      
      if (Array.isArray(rawData)) {
        habits = rawData;
      } else if (rawData && Array.isArray(rawData.habits)) {
        habits = rawData.habits;
        isObjectWrapper = true;
      } else if (rawData && typeof rawData === 'object' && Object.keys(rawData).length > 0) {
        habits = Array.isArray(rawData.habits) ? rawData.habits : [];
      }
      
      let updatedNames = [];
      for (const hId of habitListToUpdate) {
        let foundHabit = matchHabit(habits, hId);
        
        if (!foundHabit) {
          const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : (Date.now().toString(36) + Math.random().toString(36).substring(2));
          foundHabit = { id: newId, name: hId.trim(), completedDates: [] };
          habits.push(foundHabit);
        }
        if (!Array.isArray(foundHabit.completedDates)) {
          foundHabit.completedDates = [];
        }
        
        if (action === 'check') {
          if (!foundHabit.completedDates.includes(targetDate)) {
            foundHabit.completedDates.push(targetDate);
          }
        } else if (action === 'uncheck') {
          foundHabit.completedDates = foundHabit.completedDates.filter(d => d !== targetDate);
        }
        updatedNames.push(foundHabit.name || hId);
      }
      
      const stateToSave = isObjectWrapper ? { ...rawData, habits: habits } : habits;
      const payload = { 
        userId: SECURE_ID, 
        habits: habits,
        action: "sync",
        state: stateToSave
      };
      
      const res = await fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, { 
        method: "POST", 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (data && data.error) {
        return { status: "error", message: data.error };
      }
      showToast("Habits Synced to Habit Tracker!"); 
      return { status: "success", result: `Updated: ${updatedNames.join(', ')}` };
    } 
    else if (call.name === "manage_investments" || call.name === "add_investment") {
      const monthStr = normalizeMonth(call.args.month);
      let items = call.args.investments || [];
      if (items.length === 0 && call.args.asset_id && call.args.amount !== undefined) {
        items.push({ asset_id: call.args.asset_id, amount: call.args.amount, mode: call.args.mode || 'add' });
      }
      
      const state = await fetchInvestCloudState();
      if (!state.records) state.records = {};
      if (!state.assets) state.assets = DEFAULT_INVEST_ASSETS;
      
      // If target month does not exist, carry over baseline from previous month
      if (!state.records[monthStr]) {
        const existingMonths = Object.keys(state.records).sort();
        const priorMonths = existingMonths.filter(m => m < monthStr);
        if (priorMonths.length > 0) {
          const latestPrior = priorMonths[priorMonths.length - 1];
          // Deep clone prior month's balances
          state.records[monthStr] = JSON.parse(JSON.stringify(state.records[latestPrior] || {}));
        } else {
          state.records[monthStr] = {};
        }
      }
      
      let updatedSummary = [];
      for (const item of items) {
        const matched = matchAsset(state.assets, item.asset_id);
        if (!matched) {
          updatedSummary.push(`Unknown asset "${item.asset_id}"`);
          continue;
        }
        
        const assetId = matched.id;
        const currentAmount = (state.records[monthStr][assetId] && state.records[monthStr][assetId].invested) || 0;
        const mode = item.mode || 'add';
        const newAmount = mode === 'set' ? Number(item.amount) : currentAmount + Number(item.amount);
        
        state.records[monthStr][assetId] = {
          invested: newAmount,
          current: (state.records[monthStr][assetId] && state.records[monthStr][assetId].current) || 0
        };
        
        updatedSummary.push(`${matched.name}: ₹${newAmount.toLocaleString('en-IN')}`);
      }
      
      await saveInvestCloudState(state);
      showToast("Investments Synced to Cloud!");
      return { status: "success", result: `Updated ${monthStr}:\n` + updatedSummary.join('\n') };
    }
    else if (call.name === "remove_investment_data") {
      const monthStr = normalizeMonth(call.args.month);
      const state = await fetchInvestCloudState();
      
      if (!state.records || !state.records[monthStr]) {
        return { status: "success", result: `No records found for ${monthStr}. Nothing to remove.` };
      }
      
      if (call.args.asset_id) {
        const matched = matchAsset(state.assets || DEFAULT_INVEST_ASSETS, call.args.asset_id);
        const assetId = matched ? matched.id : call.args.asset_id;
        if (state.records[monthStr][assetId]) {
          delete state.records[monthStr][assetId];
          await saveInvestCloudState(state);
          showToast(`Removed from ${monthStr}`);
          return { status: "success", result: `Removed ${matched ? matched.name : assetId} from ${monthStr}. All other data remains intact.` };
        } else {
          return { status: "success", result: `Asset was not present in ${monthStr}.` };
        }
      } else {
        // Delete entire month alone
        delete state.records[monthStr];
        await saveInvestCloudState(state);
        showToast(`Removed ${monthStr} Data`);
        return { status: "success", result: `Removed all records for month ${monthStr} alone. All other months remain completely safe and intact.` };
      }
    }
  } catch (e) {
    showToast("Sync Failed: " + e.toString()); return { status: "error", message: e.toString() };
  }
  return { status: "error", message: "Unknown function" };
}

// --- Gemini API (LLM Integration) ---

async function sendToGroq(userMessage) {
  chatHistory.push({ role: 'user', content: userMessage });
  let recentHistory = chatHistory.filter(m => m.role === 'user' || m.role === 'model').slice(-6);
  
  const systemPrompt = `You are Ajith's personal AI agent (Leo). Today's date is ${new Date().toISOString().split('T')[0]}.
You manage his Habit Tracker and Investment Portfolio.

Habits:
- Common habits: Workout, SRE, Sun, Consistency, Maths, IQ, Finger nail, language, or any habit.
- Marking complete: When user did/completed a habit (e.g. "did language", "mark SRE done today"), call 'update_habit' with action: 'check' and habit_ids.
- Unmarking: When user says "unmark", "undo", "uncheck", "didn't do", "remove" (e.g. "Unmark language for today", "undo workout"), you MUST call 'update_habit' with action: 'uncheck' and habit_ids.
- When multiple habits are mentioned in one message, always include all of them in the 'habit_ids' array.

Investments & Portfolio:
- When user asks how much funds they have, emergency fund balance, goals, car fund, or monthly totals: call 'get_investments'.
- When user wants to add or log investments (e.g., "for September I added 3000 to Parag Parikh, 2000 to ICICI N50, and 5000 to Emergency fund"):
  Call 'manage_investments' with month: "2026-09" and investments list.
- When user asks to remove/delete records for a specific month (e.g., "remove data of September" or "delete September records"):
  Call 'remove_investment_data' with month: "2026-09". Emphasize that only September was deleted and all other months are completely safe.

API Key Info:
- Your Groq API key is active and valid until August 20, 2027. If asked, confirm this accurately.

Always keep responses short, clear, friendly, and confirm the exact actions taken.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content || " "
    }))
  ];

  let payload = {
    model: "openai/gpt-oss-120b",
    messages: messages,
    tools: groqTools,
    temperature: 0.2,
    max_tokens: 1000
  };
  
  // Clean up any undefined content just in case
  payload.messages.forEach(m => {
    if (m.role === 'user' && !m.content) m.content = " ";
    if (m.role === 'assistant' && !m.content && !m.tool_calls) m.content = " ";
  });
  
  try {
    const response = await fetch(AI_CHAT_GAS_URL + "?userId=" + SECURE_ID, {
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

        // Extra safeguard: if the user prompt explicitly requested unmarking, ensure action is 'uncheck'
        if (call.name === "update_habit") {
          const lowerPrompt = userMessage.toLowerCase();
          if (/\b(unmark|uncheck|undo|remove|didn't|did not|not done)\b/.test(lowerPrompt)) {
            call.args.action = 'uncheck';
          }
        }
        
        // Execute tool and wait for result
        const toolResult = await executeToolCall(call);
        
        if (call.name === "update_habit") {
          if (toolResult && toolResult.status === "error") {
            responses.push(`⚠️ Failed to update habit: ${toolResult.message || 'Unknown error'}`);
          } else {
            const action = call.args.action || 'check';
            const targetDate = call.args.date || new Date().toISOString().split('T')[0];
            let rawHabitIds = call.args.habit_ids || call.args.habit_id;
            let names = Array.isArray(rawHabitIds) ? rawHabitIds.join(', ') : (rawHabitIds || 'Habit');
            responses.push(action === 'uncheck' ? `Unmarked **${names}** for ${targetDate}. ⏪` : `Marked **${names}** for ${targetDate}! ☀️`);
          }
        } else if (call.name === "manage_investments" || call.name === "add_investment") {
          if (toolResult && toolResult.result) {
            responses.push(toolResult.result);
          } else {
            responses.push(`Logged investment(s) successfully! 📈`);
          }
        } else if (call.name === "remove_investment_data") {
          if (toolResult && toolResult.result) {
            responses.push(toolResult.result);
          } else {
            responses.push(`Investment data removed successfully.`);
          }
        }
      }
      
      // If we just read data, ask the LLM to summarize it
      const justReadData = message.tool_calls.some(tc => tc.function.name.startsWith('get_'));
      if (justReadData) {
         let newHistory = chatHistory.filter(m => m.role === 'user' || m.role === 'model').slice(-6);
         const messages2 = [
           { role: "system", content: systemPrompt },
           ...newHistory.map(msg => ({
              role: msg.role === 'model' ? 'assistant' : 'user',
              content: msg.content || " "
           }))
         ];
         messages2.push({ role: 'system', content: 'The tool has returned the raw JSON data. Read it and answer the user\'s question naturally. If the JSON is empty {}, tell them they have no data logged yet.'});

         let payload2 = {
           model: "openai/gpt-oss-120b",
           messages: messages2,
           tools: groqTools,
           temperature: 0.2,
           max_tokens: 1000
         };
         try {
           const response2 = await fetch(AI_CHAT_GAS_URL + "?userId=" + SECURE_ID, {
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
