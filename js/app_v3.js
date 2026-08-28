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

// --- In-Memory Session State ---
// Chat history is kept strictly in-memory during active session and never persisted to cloud
function saveChatHistory() {
  // No-op: history is not saved to cloud as requested
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

let cachedInvestState = null;
async function fetchInvestCloudState(force = false) {
  if (!force && cachedInvestState && cachedInvestState.records && Object.keys(cachedInvestState.records).length > 0) {
    return cachedInvestState;
  }
  try {
    const res = await fetch(`${INVEST_GAS_URL}?userId=${SECURE_ID}&t=${Date.now()}`);
    const data = await res.json();
    let stateObj = data.records ? data : (data.state && data.state.records ? data.state : null);
    if (stateObj && stateObj.records && Object.keys(stateObj.records).length > 0) {
      if (!stateObj.assets || stateObj.assets.length === 0) stateObj.assets = DEFAULT_INVEST_ASSETS;
      cachedInvestState = stateObj;
      return stateObj;
    }
  } catch (e) {
    console.error("Failed to fetch cloud invest state, using defaults", e);
  }
  const fallback = {
    assets: DEFAULT_INVEST_ASSETS,
    records: {},
    lastModified: Date.now()
  };
  if (!cachedInvestState) cachedInvestState = fallback;
  return fallback;
}

let cachedHabits = null;
let cachedHabitsRaw = null;
let isObjectWrapperHabits = false;

async function getHabitsState(forceRefresh = false) {
  if (!forceRefresh && cachedHabits && cachedHabits.length > 0) {
    return { habits: cachedHabits, rawData: cachedHabitsRaw, isObjectWrapper: isObjectWrapperHabits };
  }
  try {
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
    cachedHabits = habits;
    cachedHabitsRaw = rawData;
    isObjectWrapperHabits = isObjectWrapper;
    return { habits, rawData, isObjectWrapper };
  } catch (e) {
    console.error("Failed to fetch habits", e);
    return { habits: cachedHabits || [], rawData: cachedHabitsRaw || [], isObjectWrapper: false };
  }
}

async function saveInvestCloudState(stateObj) {
  cachedInvestState = stateObj;
  stateObj.lastModified = Date.now();
  const payload = {
    action: "sync",
    userId: SECURE_ID,
    state: stateObj
  };
  const res = await fetch(`${INVEST_GAS_URL}?userId=${SECURE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    keepalive: true
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

// // Local IST Date in YYYY-MM-DD (India Standard Time / Asia/Kolkata)
function getLocalDateISO(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

// Calculate streak for habits
function calculateCurrentStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) return 0;
  const sorted = [...new Set(completedDates)].sort().reverse();
  const today = new Date();
  const todayISO = getLocalDateISO(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = getLocalDateISO(yesterday);

  let streak = 0;
  let checkDate = new Date(today);

  if (!sorted.includes(todayISO)) {
    if (!sorted.includes(yesterdayISO)) return 0;
    checkDate = yesterday;
  }

  while (true) {
    const iso = getLocalDateISO(checkDate);
    if (sorted.includes(iso)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Normalize month string e.g. "september", "sept", "2026-09" -> "2026-09" (Strict IST)
function normalizeMonth(monthInput) {
  const istToday = getLocalDateISO();
  const [currentYear, currentMonth] = istToday.split('-');
  if (!monthInput) {
    return `${currentYear}-${currentMonth}`;
  }
  const input = typeof monthInput === 'string' ? monthInput.toLowerCase().trim() : '';
  
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
  return `${currentYear}-${currentMonth}`;
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
      description: "Get the user's list of habits and completion dates history. Call this whenever the user asks what habits they completed today, what is pending, what habits they have, or asks about their habit streak/status.",
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
      const { habits } = await getHabitsState();
      return JSON.stringify(habits);
    }
    else if (call.name === "update_habit") {
      let rawHabitIds = call.args.habit_ids || call.args.habit_id;
      let habitListToUpdate = [];
      if (Array.isArray(rawHabitIds)) {
        habitListToUpdate = rawHabitIds;
      } else if (typeof rawHabitIds === 'string') {
        habitListToUpdate = rawHabitIds.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      const today = getLocalDateISO();
      const targetDate = call.args.date || today;
      const action = call.args.action || 'check';
      
      const stateObj = await getHabitsState();
      let habits = stateObj.habits;
      
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
      
      cachedHabits = habits;
      const stateToSave = stateObj.isObjectWrapper ? { ...stateObj.rawData, habits: habits } : habits;
      const payload = { 
        userId: SECURE_ID, 
        habits: habits,
        action: "sync",
        state: stateToSave
      };
      
      // Fire non-blocking background save to Google Sheets (keepalive ensures delivery even if tab is closed immediately)
      fetch(HABIT_GAS_URL + "?userId=" + SECURE_ID, { 
        method: "POST", 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        keepalive: true
      }).then(res => res.json()).then(data => {
        if (data && data.error) {
          showToast("Sync Warning: " + data.error);
        }
      }).catch(err => {
        console.warn("Background sync error:", err);
      });

      showToast("Habits Synced!"); 
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
      
      saveInvestCloudState(state);
      showToast("Investments Synced!");
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
          saveInvestCloudState(state);
          showToast(`Removed from ${monthStr}`);
          return { status: "success", result: `Removed ${matched ? matched.name : assetId} from ${monthStr}. All other data remains intact.` };
        } else {
          return { status: "success", result: `Asset was not present in ${monthStr}.` };
        }
      } else {
        // Delete entire month alone
        delete state.records[monthStr];
        saveInvestCloudState(state);
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
  
  const systemPrompt = `You are Ajith's personal AI agent (Leo). Today's date is ${getLocalDateISO()}.
You manage his Habit Tracker and Investment Portfolio.

Habits:
- Common habits: Workout, SRE, Sun, Consistency, Maths, IQ, Finger nail, language, or any habit.
- Marking complete: When user did/completed a habit (e.g. "did language", "mark SRE done today"), call 'update_habit' with action: 'check' and habit_ids.
- Unmarking: When user says "unmark", "undo", "uncheck", "didn't do", "remove" (e.g. "Unmark language for today", "undo workout"), you MUST call 'update_habit' with action: 'uncheck' and habit_ids.
- Querying Habits: When user asks what habits they completed today, what is pending, what habits they have, or asks about their habit streak/status (e.g. "what all things I have done today ?", "what's pending?"): ALWAYS call 'get_habits'.
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
      let readResults = [];
      
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
        
        if (call.name.startsWith("get_")) {
          let str = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
          readResults.push(`[${call.name}]:\n${str}`);
        } else if (call.name === "update_habit") {
          if (toolResult && toolResult.status === "error") {
            responses.push(`⚠️ Failed to update habit: ${toolResult.message || 'Unknown error'}`);
          } else {
            const action = call.args.action || 'check';
            const targetDate = call.args.date || getLocalDateISO();
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
      
      // If we read data, pass the retrieved data to LLM to generate an intelligent natural language answer
      if (readResults.length > 0) {
         let newHistory = chatHistory.filter(m => m.role === 'user' || m.role === 'model').slice(-6);
         const messages2 = [
           { role: "system", content: systemPrompt },
           ...newHistory.map(msg => ({
              role: msg.role === 'model' ? 'assistant' : 'user',
              content: msg.content || " "
           })),
           { 
             role: 'user', 
             content: `Retrieved data from database:\n${readResults.join('\n\n')}\n\nToday's date is ${getLocalDateISO()}. Please answer my question: "${userMessage}". Format clearly with bullet points.`
           }
         ];

         let payload2 = {
           model: "openai/gpt-oss-120b",
           messages: messages2,
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
           return data2.choices[0].message.content || "I retrieved your data, but could not format a response.";
         } catch(e) {
           return "Sorry, encountered an error parsing the data.";
         }
      }
      
      if (responses.length > 0) {
         return responses.join("\n");
      }
    }
    
    return message.content || "I'm here! How can I help you today?";
  } catch (e) {
    console.error(e);
    return "Sorry, I encountered an error connecting to the AI brain.";
  }
}

// ==========================================
// --- Fast Indexing & Intent Engine (0ms) ---
// ==========================================

const FAST_HABIT_ALIASES = {
  'sre': 'SRE', 'sre study': 'SRE', 'sre revision': 'SRE',
  'workout': 'Workout', 'gym': 'Workout', 'exercise': 'Workout', 'exercised': 'Workout', 'working out': 'Workout', 'lifted': 'Workout', 'training': 'Workout', 'weights': 'Workout',
  'sun': 'Sun', 'sunlight': 'Sun', 'morning sun': 'Sun', 'sun exposure': 'Sun', 'sunshine': 'Sun',
  'consistency': 'Consistency', 'streak': 'Consistency',
  'math': 'Maths', 'maths': 'Maths', 'mathematics': 'Maths', 'math problem': 'Maths',
  'iq': 'IQ', 'puzzles': 'IQ', 'brain': 'IQ', 'riddles': 'IQ', 'iq test': 'IQ',
  'finger': 'Finger nail', 'fingers': 'Finger nail', 'fingernail': 'Finger nail', 'fingernails': 'Finger nail', 'finger nail': 'Finger nail', 'nails': 'Finger nail', 'nail': 'Finger nail',
  'language': 'Language', 'lang': 'Language', 'languages': 'Language', 'vocab': 'Language', 'grammar': 'Language', 'duolingo': 'Language', 'speaking': 'Language'
};

const MARK_VERBS = ['mark', 'marked', 'did', 'done', 'finish', 'finished', 'complete', 'completed', 'check', 'checked', 'log', 'logged', 'track', 'tracked', 'achieve', 'achieved', 'studied', 'practiced', 'exercised', 'walked', 'read', 'lifted', 'trained', 'meditated', 'prayed'];
const UNMARK_VERBS = ['unmark', 'unmarked', 'uncheck', 'unchecked', 'undo', 'remove', 'removed', 'delete', 'deleted', 'skip', 'skipped', 'miss', 'missed', 'revert', 'reverted', 'cancel', 'cancelled', 'did not', 'didnt', 'not done'];

function getIndexedHabitsSummary(targetDate) {
  const todayISO = targetDate || getLocalDateISO();
  const habits = cachedHabits || [];
  const completed = [];
  const pending = [];
  
  habits.forEach(h => {
    if (Array.isArray(h.completedDates) && h.completedDates.includes(todayISO)) {
      completed.push(h.name);
    } else {
      pending.push(h.name);
    }
  });
  
  return { date: todayISO, completed, pending };
}

function tryFastHabitIntent(userText) {
  const raw = userText.trim().toLowerCase();
  const clean = raw.replace(/[?!.,]/g, '').trim();
  const todayISO = getLocalDateISO();

  // 1. List All Configured Habits Query
  if (/\b(what\s*habits|list\s*habits|show\s*habits|my\s*habits|all\s*habits|habit\s*list)\b/i.test(clean)) {
    const list = (cachedHabits || []).map((h, i) => `${i + 1}. **${h.name}**`).join('\n');
    return `📋 **Your Tracked Habits:**\n\n${list || 'No habits configured yet.'}\n\n*Tell me anytime to mark, unmark, or add habits!* ☀️`;
  }

  // 1b. Weekly Summary / Past 7 Days
  if (/\b(last\s*week|past\s*week|this\s*week|past\s*7\s*days|last\s*7\s*days|weekly\s*summary|weekly\s*status)\b/i.test(clean)) {
    const today = new Date();
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      past7Days.push(getLocalDateISO(d));
    }
    const fromDate = past7Days[0];
    const toDate = past7Days[past7Days.length - 1];

    let totalCompletions = 0;
    const habitCounts = [];
    (cachedHabits || []).forEach(h => {
      const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
      const countInWindow = dates.filter(d => past7Days.includes(d)).length;
      totalCompletions += countInWindow;
      habitCounts.push(`- **${h.name}**: ${countInWindow} / 7 days`);
    });

    return `📅 **Weekly Summary (${fromDate} to ${toDate}):**\n\n- **Total Completions:** ${totalCompletions}\n\n**Breakdown:**\n${habitCounts.join('\n')}`;
  }

  // 1c. Habit Lifetime Stats & Streaks (e.g. "how much i did sre totally", "workout count", "streak for sun")
  const isStatQuery = /\b(total|totally|all\s*time|how\s*many\s*times|how\s*much|count|streak|stats?|history|record)\b/i.test(clean) &&
    !/\b(put|add|invest|invested|saved|logged|bought|delete|del)\b/i.test(clean);

  if (isStatQuery) {
    const habitsList = cachedHabits || [];
    for (const h of habitsList) {
      const cleanName = h.name.toLowerCase();
      const words = cleanName.split(/\s+/);
      let matches = clean.includes(cleanName);
      if (!matches) {
        for (const w of words) {
          if (w.length > 2 && new RegExp('\\b' + w + '\\b', 'i').test(clean)) {
            matches = true;
            break;
          }
        }
      }
      if (!matches && clean.includes('sre') && cleanName === 'sre') matches = true;
      if (!matches && (clean.includes('gym') || clean.includes('exercise') || clean.includes('workout')) && cleanName === 'workout') matches = true;
      if (!matches && (clean.includes('nail') || clean.includes('nails') || clean.includes('finger')) && cleanName.includes('finger')) matches = true;

      if (matches) {
        const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
        const totalCount = dates.length;
        const streak = calculateCurrentStreak(dates);
        const lastDone = dates.length > 0 ? [...dates].sort().reverse()[0] : 'Never';
        return `📊 **Habit Statistics: ${h.name}**\n\n- **Total Completed:** ${totalCount} day(s)\n- **Current Streak:** ${streak} day(s) 🔥\n- **Last Completed:** ${lastDone}`;
      }
    }
  }

  // 2. Fast Query: Completed habits today
  if (/\b(what\s*did\s*i\s*do|what\s*i\s*did|what\s*all\s*i\s*did|what\s*have\s*i\s*done|things\s*i\s*have\s*done|what\s*is\s*done|what\s*is\s*completed|habits\s*today|today\s*status|completed\s*today|done\s*today)\b/i.test(clean) ||
      (/^(what|show|list|tell|which).*(did|done|completed|finished|have done).*(today|habits?)?/i.test(clean))) {
    const summary = getIndexedHabitsSummary(todayISO);
    if (summary.completed.length === 0) {
      return `📅 **Status for Today (${todayISO}):**\n\nNo habits completed yet today. Let me know when you finish any! ☀️\n\n**Pending:**\n` + summary.pending.map(h => `- ${h}`).join('\n');
    }
    const completedList = summary.completed.map(h => `- **${h}** ✅`).join('\n');
    const pendingList = summary.pending.map(h => `- ${h}`).join('\n');
    return `📅 **Habits you completed today (${todayISO}):**\n\n${completedList}\n\n**Pending:**\n${pendingList || 'None! All done 🎉'}`;
  }

  // 3. Fast Query: Pending habits today
  if (/\b(what\s*is\s*pending|pending\s*habits|what\s*is\s*left|whats\s*left|remaining\s*habits|not\s*done\s*today)\b/i.test(clean) ||
      (/^(what|show|list|which).*(pending|left|remaining|not\s*done).*(today|habits?)?/i.test(clean))) {
    const summary = getIndexedHabitsSummary(todayISO);
    if (summary.pending.length === 0) {
      return `🎉 **Amazing!** You have completed all your habits for today (${todayISO})! ☀️`;
    }
    const pendingList = summary.pending.map(h => `- **${h}** ⏳`).join('\n');
    return `⏳ **Pending habits for today (${todayISO}):**\n\n${pendingList}`;
  }

  // 4. Create / Delete Habits Directly
  const addHabitMatch = clean.match(/^(?:add|create|new)\s+habit\s+([a-z0-9\s]+)$/i);
  if (addHabitMatch) {
    const habitName = addHabitMatch[1].trim();
    return { isManageHabit: true, action: 'add', name: habitName };
  }

  // 5. Fast Action: Mark / Unmark habits (Strictly only when NOT a question/query)
  const isQuery = /\b(how many|how much|how often|what|which|did i|have i|count|streak|stats?|history|record|status|overview|summary|list|all|\?)\b/i.test(clean);
  const unmarkRegex = new RegExp('\\b(' + UNMARK_VERBS.join('|') + ')\\b', 'i');
  const isUnmark = unmarkRegex.test(clean) && !isQuery;
  const markRegex = new RegExp('\\b(' + MARK_VERBS.join('|') + ')\\b', 'i');
  const isMark = (markRegex.test(clean) || /\b(i\s+did|done|completed|mark)\b/i.test(clean)) && !isQuery;

  if (isUnmark || isMark) {
    const detectedHabits = [];
    const habitsList = cachedHabits || [];
    
    // Check known aliases
    for (const [alias, canonicalName] of Object.entries(FAST_HABIT_ALIASES)) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(clean)) {
        if (!detectedHabits.includes(canonicalName)) {
          detectedHabits.push(canonicalName);
        }
      }
    }

    // Also check any active habits in cache or subwords of habit names
    habitsList.forEach(h => {
      if (h.name && !detectedHabits.includes(h.name)) {
        const regex = new RegExp(`\\b${h.name.toLowerCase()}\\b`, 'i');
        if (regex.test(clean)) {
          detectedHabits.push(h.name);
        } else {
          // Check words inside multi-word habits (e.g. "finger" in "Finger nail")
          const words = h.name.toLowerCase().split(/\s+/);
          for (const w of words) {
            if (w.length > 3 && new RegExp(`\\b${w}\\b`, 'i').test(clean)) {
              detectedHabits.push(h.name);
              break;
            }
          }
        }
      }
    });

    if (detectedHabits.length > 0) {
      return {
        isFastAction: true,
        action: isUnmark ? 'uncheck' : 'check',
        habit_ids: detectedHabits,
        date: todayISO
      };
    }
  }

  return null;
}

function tryFastInvestQuery(userText, investState) {
  const clean = userText.trim().toLowerCase().replace(/[?!.,]/g, '');
  if (!investState || !investState.records) return null;
  
  const months = Object.keys(investState.records).sort();
  if (months.length === 0) return null;
  const targetMonth = months[months.length - 1];
  const monthData = investState.records[targetMonth] || {};
  const assets = investState.assets || DEFAULT_INVEST_ASSETS;
  
  // 1. Total Net Worth / Total Invested / Portfolio Summary
  if (/\b(total\s*net\s*worth|net\s*worth|networth|invested\s*amount|total\s*invested|total\s*investment|total\s*portfolio|portfolio\s*overview|portfolio\s*summary|all\s*investments|list\s*all\s*investments|my\s*holdings)\b/i.test(clean) ||
      (/\b(total|how much|what)\b/i.test(clean) && /\b(networth|net\s*worth|invested|investments?|portfolio|total)\b/i.test(clean) && !/\b(put|add|added|set)\b/i.test(clean))) {
    let totalNetWorth = 0;
    let totalCore = 0;
    let categoryTotals = {};
    assets.forEach(a => {
      const val = (monthData[a.id] && monthData[a.id].invested) || 0;
      if (val > 0) {
        totalNetWorth += val;
        if (a.category !== 'Goals' && a.category !== 'Emergency Fund' && a.category !== 'Gold Investment') {
          totalCore += val;
        }
        categoryTotals[a.category] = (categoryTotals[a.category] || 0) + val;
      }
    });
    const catLines = Object.entries(categoryTotals).map(([cat, sum]) => `- **${cat}**: ₹${sum.toLocaleString('en-IN')}`).join('\n');
    return `💼 **Portfolio Overview (${targetMonth}):**\n\n- **Total Net Worth:** ₹${totalNetWorth.toLocaleString('en-IN')}\n- **Core Investments:** ₹${totalCore.toLocaleString('en-IN')}\n\n**Breakdown by Category:**\n${catLines || 'No active holdings logged yet.'}`;
  }

  // 2. Stocks / ETFs Category
  if (/\b(stocks?|etfs?|shares?|equit(y|ies))\b/i.test(clean) && !/\b(mf|mutual|fund|put|add|added|set)\b/i.test(clean)) {
    let totalStocks = 0;
    let list = [];
    assets.filter(a => a.category === 'Stocks/ETFs').forEach(a => {
      const val = (monthData[a.id] && monthData[a.id].invested) || 0;
      if (val > 0) {
        totalStocks += val;
        list.push(`- **${a.name}**: ₹${val.toLocaleString('en-IN')}`);
      }
    });
    return `📊 **Stocks & ETFs Holdings (${targetMonth}):**\n\n**Total Invested:** ₹${totalStocks.toLocaleString('en-IN')}\n\n${list.join('\n') || 'No stock records logged for this month.'}`;
  }

  // 3. Mutual Funds Category
  if (/\b(mutual\s*funds?|mfs?)\b/i.test(clean) && !/\b(put|add|added|set)\b/i.test(clean)) {
    let totalMF = 0;
    let list = [];
    assets.filter(a => a.category === 'Mutual Funds').forEach(a => {
      const val = (monthData[a.id] && monthData[a.id].invested) || 0;
      if (val > 0) {
        totalMF += val;
        list.push(`- **${a.name}**: ₹${val.toLocaleString('en-IN')}`);
      }
    });
    return `📈 **Mutual Funds Investment (${targetMonth}):**\n\n**Total Invested:** ₹${totalMF.toLocaleString('en-IN')}\n\n${list.join('\n') || 'No mutual fund records logged for this month.'}`;
  }

  // 4. Gold / Silver / Commodities
  if (/\b(gold|silver|digi\s*gold|commodit(y|ies))\b/i.test(clean) && !/\b(parag|hdfc|icici|tata|put|add|added|set)\b/i.test(clean)) {
    let totalGold = 0;
    let list = [];
    assets.filter(a => a.category === 'Gold Investment' || (a.sector && (a.sector.includes('Gold') || a.sector.includes('Silver')))).forEach(a => {
      const val = (monthData[a.id] && monthData[a.id].invested) || 0;
      if (val > 0) {
        totalGold += val;
        list.push(`- **${a.name}**: ₹${val.toLocaleString('en-IN')}`);
      }
    });
    return `🪙 **Gold & Silver Holdings (${targetMonth}):**\n\n**Total:** ₹${totalGold.toLocaleString('en-IN')}\n\n${list.join('\n') || 'No gold/silver records logged.'}`;
  }

  // 5. Emergency Fund & Goals
  if (/\b(emergency\s*fund|emergency|goals?|car\s*fund)\b/i.test(clean) && !/\b(put|add|added|set)\b/i.test(clean)) {
    let list = [];
    assets.filter(a => a.category === 'Emergency Fund' || a.category === 'Goals').forEach(a => {
      const val = (monthData[a.id] && monthData[a.id].invested) || 0;
      list.push(`- **${a.name}**: ₹${val.toLocaleString('en-IN')}`);
    });
    return `🛡️ **Emergency & Goal Funds (${targetMonth}):**\n\n${list.join('\n')}`;
  }

  // 6. Any Individual Asset Query (e.g. "how much i have in digi gold", "tata capital balance", "what is in ppf", "gold")
  const isQuery = /\b(how much|what is|what's|balance|total|value|amount|show|tell|check|holding|funds?)\b/i.test(clean) 
    && !/\b(put|add|added|invest|invested|saved|logged|bought|deposit|set)\b/i.test(clean);

  if (isQuery) {
    for (const asset of assets) {
      const assetClean = asset.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes(asset.name.toLowerCase()) || (clean.includes(assetClean) && assetClean.length > 3)) {
        const val = (monthData[asset.id] && monthData[asset.id].invested) || 0;
        return `💰 **${asset.name} (${targetMonth}):**\n\n**Invested Amount:** ₹${val.toLocaleString('en-IN')}\n**Category:** ${asset.category || 'General'}`;
      }
    }
    const matched = matchAsset(assets, clean);
    if (matched) {
      const val = (monthData[matched.id] && monthData[matched.id].invested) || 0;
      return `💰 **${matched.name} (${targetMonth}):**\n\n**Invested Amount:** ₹${val.toLocaleString('en-IN')}\n**Category:** ${matched.category || 'General'}`;
    }
  }

  return null;
}

function tryFastInvestLog(userText, investState) {
  const clean = userText.trim().toLowerCase();
  
  // Must contain an investment action keyword
  const isAddAction = /\b(add|added|invest|invested|put|saved|logged|deposit|deposited|bought)\b/i.test(clean);
  const isSetAction = /\b(set|updated|update)\b/i.test(clean);
  if (!isAddAction && !isSetAction) return null;
  
  // Extract month (supports September, October, Nov, 2026-09, etc.)
  let targetMonth = null;
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'sep', 'oct', 'nov', 'dec'];
  for (const m of monthNames) {
    if (new RegExp('\\b' + m + '\\b', 'i').test(clean)) {
      targetMonth = normalizeMonth(m);
      break;
    }
  }
  if (!targetMonth) {
    targetMonth = normalizeMonth(null); // defaults to current month
  }

  // Parse amount and asset items
  const items = [];
  const assets = (investState && investState.assets) || DEFAULT_INVEST_ASSETS;
  const monthRegex = new RegExp('\\b(' + monthNames.join('|') + '|for|in|to|into|month|added|add|invested|invest|put|saved|logged|set|deposit)\\b', 'gi');

  // Split clauses by 'and', ',', '&'
  const parts = clean.split(/\band\b|,|&|\+/i);
  for (const part of parts) {
    const numMatch = part.match(/(?:₹|rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|lac)?/i);
    if (numMatch) {
      let rawVal = parseFloat(numMatch[1].replace(/,/g, ''));
      if (numMatch[2] && numMatch[2].toLowerCase() === 'k') rawVal *= 1000;
      if (numMatch[2] && (numMatch[2].toLowerCase() === 'lakh' || numMatch[2].toLowerCase() === 'lac')) rawVal *= 100000;

      const assetCandidate = part.replace(numMatch[0], '')
        .replace(monthRegex, '')
        .trim();

      const matchedAsset = matchAsset(assets, assetCandidate);
      if (matchedAsset && rawVal > 0) {
        items.push({
          asset_id: matchedAsset.id,
          name: matchedAsset.name,
          amount: rawVal,
          mode: isSetAction ? 'set' : 'add'
        });
      }
    }
  }

  if (items.length > 0) {
    return {
      month: targetMonth,
      items: items
    };
  }

  return null;
}

function tryFastInvestDelete(userText) {
  const clean = userText.trim().toLowerCase().replace(/[?!.,]/g, '');
  const isDel = /\b(delete|del|remove|clear|wipe|erase)\b/i.test(clean);
  if (!isDel) return null;

  let targetMonth = null;
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'sep', 'oct', 'nov', 'dec'];
  for (const m of monthNames) {
    if (new RegExp('\\b' + m + '\\b', 'i').test(clean)) {
      targetMonth = normalizeMonth(m);
      break;
    }
  }
  const yyyymmMatch = clean.match(/\b(20\d\d-\d\d)\b/);
  if (yyyymmMatch) targetMonth = yyyymmMatch[1];

  if (targetMonth) return { month: targetMonth };
  return null;
}

// --- Chat Form Submission ---
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Render user message instantly
  appendMessage('user', text);
  chatInput.value = '';
  
  // 1. Try Fast Habit Index (0ms)
  const habitFastMatch = tryFastHabitIntent(text);
  if (habitFastMatch) {
    if (typeof habitFastMatch === 'string') {
      appendMessage('ai', habitFastMatch);
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'model', content: habitFastMatch });
      return;
    } else if (habitFastMatch.isManageHabit) {
      if (habitFastMatch.action === 'add') {
        const hName = habitFastMatch.name.charAt(0).toUpperCase() + habitFastMatch.name.slice(1);
        executeToolCall({
          name: 'update_habit',
          args: {
            habit_ids: [hName],
            action: 'check',
            date: getLocalDateISO()
          }
        });
        const reply = `✨ **Created new habit "${hName}"!**\n\n*Added and synced to your Habit Tracker!* ☀️`;
        appendMessage('ai', reply);
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'model', content: reply });
        return;
      }
    } else if (habitFastMatch.isFastAction) {
      executeToolCall({
        name: 'update_habit',
        args: {
          habit_ids: habitFastMatch.habit_ids,
          action: habitFastMatch.action,
          date: habitFastMatch.date
        }
      });
      const names = habitFastMatch.habit_ids.join(', ');
      const reply = habitFastMatch.action === 'uncheck'
        ? `Unmarked **${names}** for ${habitFastMatch.date}. ⏪`
        : `Marked **${names}** for ${habitFastMatch.date}! ☀️`;
      appendMessage('ai', reply);
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'model', content: reply });
      return;
    }
  }

  // 2. Try Fast Investment Log Action (0ms)
  const investLogMatch = tryFastInvestLog(text, cachedInvestState);
  if (investLogMatch && investLogMatch.items.length > 0) {
    executeToolCall({
      name: 'manage_investments',
      args: {
        month: investLogMatch.month,
        investments: investLogMatch.items
      }
    });
    const summaryLines = investLogMatch.items.map(item => `- **${item.name}**: +₹${item.amount.toLocaleString('en-IN')}`);
    const reply = `📈 **Logged Investment(s) for ${investLogMatch.month}:**\n\n${summaryLines.join('\n')}\n\n*Saved to your portfolio!*`;
    appendMessage('ai', reply);
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'model', content: reply });
    return;
  }

  // 3. Try Fast Investment Delete Action (0ms)
  const investDelMatch = tryFastInvestDelete(text);
  if (investDelMatch) {
    executeToolCall({
      name: 'remove_investment_data',
      args: {
        month: investDelMatch.month
      }
    });
    const reply = `🗑️ **Removed all records for month ${investDelMatch.month} alone.**\n\n*All other months remain completely safe and intact!*`;
    appendMessage('ai', reply);
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'model', content: reply });
    return;
  }

  // 4. Try Fast Investment Query Index (0ms)
  const investFastMatch = tryFastInvestQuery(text, cachedInvestState);
  if (investFastMatch) {
    appendMessage('ai', investFastMatch);
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'model', content: investFastMatch });
    return;
  }
  
  // 5. Fallback to Full Groq LLM (for conversational chat & complex instructions)
  showTypingIndicator();
  const aiResponse = await sendToGroq(text);
  hideTypingIndicator();
  appendMessage('ai', aiResponse);
  chatHistory.push({ role: 'model', content: aiResponse });
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
  // Pre-load data in background for instant responsiveness
  getHabitsState();
  fetchInvestCloudState();
  checkReminders();
});
