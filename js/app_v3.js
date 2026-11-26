// Configuration
const INVEST_GAS_URL = 'https://script.google.com/macros/s/AKfycbwggOUodVCdLua57K3DVVIdmn8J12uZWClM47tlWz3xzOrkkI_cc62EeHazaVhrsHqT/exec';
const AI_CHAT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzGKwN7SseLOsaQeOnql_3cmMqaM4u7gJdcoIXsCbhn104CqpaECzwV9U6PwidLas0y/exec';
const HABIT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwTLJ5PSqaSlghakcqWW7s5-0GhBrC9KhUl5cUMfmwkkphNEiarrbEWYglYnnOcCXzo2w/exec';
const EXPENSE_GAS_URL = 'https://script.google.com/macros/s/AKfycbxakJAxaUGLaCedfm9us4Oue1eThaesh9C_i28Yrd31sXAjpMCYrA-U1F9i4A-CiwdD/exec';
const SECURE_ID = '2108'; // Hardcoded as requested

// Global State
let chatHistory = [];
let lastSessionAction = null;
let pendingClarification = null;

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

// Purge stale local caches to guarantee 100% live cloud data
try {
  localStorage.removeItem('leo_cached_habits');
  localStorage.removeItem('leo_cached_invest_state');
} catch (e) {}

let cachedInvestState = null;
let lastInvestFetchTime = 0;
let investFetchPromise = null;

function fetchInvestCloudState(force = false) {
  const now = Date.now();
  if (!force && cachedInvestState && cachedInvestState.records && Object.keys(cachedInvestState.records).length > 0 && (now - lastInvestFetchTime < 10000)) {
    return Promise.resolve(cachedInvestState);
  }
  if (investFetchPromise) {
    return investFetchPromise;
  }
  investFetchPromise = (async () => {
    try {
      const res = await fetch(`${INVEST_GAS_URL}?userId=${SECURE_ID}&t=${Date.now()}`);
      const data = await res.json();
      let stateObj = data.records ? data : (data.state && data.state.records ? data.state : null);
      if (stateObj && stateObj.records && Object.keys(stateObj.records).length > 0) {
        if (!stateObj.assets || stateObj.assets.length === 0) stateObj.assets = DEFAULT_INVEST_ASSETS;
        cachedInvestState = stateObj;
        lastInvestFetchTime = Date.now();
        return stateObj;
      }
    } catch (e) {
      console.error("Failed to fetch cloud invest state, using defaults", e);
    } finally {
      investFetchPromise = null;
    }
    const fallback = {
      assets: DEFAULT_INVEST_ASSETS,
      records: {},
      lastModified: Date.now()
    };
    if (!cachedInvestState) cachedInvestState = fallback;
    return fallback;
  })();
  return investFetchPromise;
}

let cachedHabits = null;
let cachedHabitsRaw = null;
let isObjectWrapperHabits = false;
let lastHabitFetchTime = 0;
let habitsFetchPromise = null;

function getHabitsState(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedHabits && cachedHabits.length > 0 && (now - lastHabitFetchTime < 5000)) {
    return Promise.resolve({ habits: cachedHabits, rawData: cachedHabitsRaw, isObjectWrapper: isObjectWrapperHabits });
  }
  if (habitsFetchPromise) {
    return habitsFetchPromise;
  }
  habitsFetchPromise = (async () => {
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
      if (habits.length > 0) {
        cachedHabits = habits;
        cachedHabitsRaw = rawData;
        isObjectWrapperHabits = isObjectWrapper;
        lastHabitFetchTime = Date.now();
      }
      return { habits: cachedHabits || habits, rawData, isObjectWrapper };
    } catch (e) {
      console.error("Failed to fetch habits", e);
      return { habits: cachedHabits || [], rawData: cachedHabitsRaw || [], isObjectWrapper: false };
    } finally {
      habitsFetchPromise = null;
    }
  })();
  return habitsFetchPromise;
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
  if (!identifier || !Array.isArray(assetsList)) return null;
  const raw = identifier.toLowerCase().trim();
  const clean = raw.replace(/[^a-z0-9]/g, '');
  if (!clean) return null;

  // 1. Exact ID match
  let match = assetsList.find(a => a.id && (a.id.toLowerCase() === raw || a.id.toLowerCase().replace(/[^a-z0-9]/g, '') === clean));
  if (match) return match;

  // 2. Exact Name match
  match = assetsList.find(a => a.name && (a.name.toLowerCase() === raw || a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean));
  if (match) return match;

  // 3. Smart Priority Disambiguation
  // Digi Gold vs Gold ETF
  if (clean.includes('digigold') || (clean.includes('digi') && clean.includes('gold')) || clean.includes('digitalgold')) {
    return assetsList.find(a => a.id === 'goal_digi_gold') || null;
  }
  // ICICI Nifty 50 Index Fund vs ICICI Bank Stock
  if (clean.includes('icici') && (clean.includes('nifty') || clean.includes('50') || clean.includes('n50') || clean.includes('fund') || clean.includes('index') || clean.includes('mf'))) {
    return assetsList.find(a => a.id === 'mf_icici_n50') || null;
  }
  if (clean.includes('nifty50') || clean === 'nifty' || clean.includes('n50')) {
    return assetsList.find(a => a.id === 'mf_icici_n50') || null;
  }
  // Parag Parikh (including common misspellings like pariek, ppfas)
  if (clean.includes('parag') || clean.includes('parikh') || clean.includes('pariek') || clean.includes('ppfas') || clean.includes('flexicap')) {
    return assetsList.find(a => a.id === 'mf_parag_parikh') || null;
  }
  // Bandhan Small Cap (including misspellings like bandan, smallcap)
  if (clean.includes('bandhan') || clean.includes('bandan') || clean.includes('smallcap')) {
    return assetsList.find(a => a.id === 'mf_bandhan_small') || null;
  }
  // Emergency Fund
  if (clean.includes('emergency') || clean.includes('emergencysavings') || clean === 'emfund') {
    return assetsList.find(a => a.id === 'goal_emergency_fund') || null;
  }
  // Goals / Car Fund (mapped to Car Fund / Goals)
  if (clean === 'goals' || clean === 'goal' || clean.includes('carfund') || clean === 'car' || clean.includes('goalfund')) {
    return assetsList.find(a => a.id === 'goal_car_fund') || null;
  }
  // EPF / PF
  if (clean.includes('epf') || clean === 'pf' || clean.includes('pfbalance') || clean.includes('providentfund')) {
    return assetsList.find(a => a.id === 'epf_balance') || null;
  }
  // PPF
  if (clean.includes('ppf') || clean.includes('publicprovident')) {
    return assetsList.find(a => a.id === 'ppf_balance') || null;
  }
  // NPS
  if (clean.includes('nps')) {
    if (clean.includes('tier2') || clean.includes('t2')) {
      return assetsList.find(a => a.id === 'nps_tier2') || null;
    }
    return assetsList.find(a => a.id === 'nps_tier1') || null;
  }
  // Tata Capital
  if (clean.includes('tatacap') || clean.includes('tatacapital')) {
    return assetsList.find(a => a.id === 'st_tata_cap') || null;
  }
  // Silver ETF
  if (clean.includes('silver') || clean.includes('tatsilv')) {
    return assetsList.find(a => a.id === 'st_tatsilv') || null;
  }
  // Gold ETF
  if (clean.includes('goldietf') || clean.includes('goldetf') || clean === 'gold') {
    return assetsList.find(a => a.id === 'st_goldietf') || null;
  }
  // Metal ETF
  if (clean.includes('metal') || clean.includes('metalietf')) {
    return assetsList.find(a => a.id === 'st_metalietf') || null;
  }
  // Nippon IT ETF
  if (clean.includes('nippon') || clean.includes('nipponit')) {
    return assetsList.find(a => a.id === 'st_nippon_it') || null;
  }
  // South Indian Bank
  if (clean.includes('southbank') || clean.includes('southindian')) {
    return assetsList.find(a => a.id === 'st_southbank') || null;
  }
  // HDFC Bank
  if (clean.includes('hdfc')) {
    return assetsList.find(a => a.id === 'st_hdfc') || null;
  }
  // BPCL
  if (clean.includes('bpcl')) {
    return assetsList.find(a => a.id === 'st_bpcl') || null;
  }
  // ICICI Bank
  if (clean.includes('icici')) {
    return assetsList.find(a => a.id === 'st_icici') || null;
  }

  // 4. Broad Substring Match
  return assetsList.find(a => {
    if (!a.name) return false;
    const aClean = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return aClean.includes(clean) || clean.includes(aClean);
  }) || null;
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
    'nails': 'Finger nail',
    'language': 'Language',
    'lang': 'Language',
    'languages': 'Language',
    'hindi': 'Language',
    'hindilanguage': 'Language',
    'hindilang': 'Language',
    'hindilesson': 'Language',
    'hindipractice': 'Language',
    'hindistudy': 'Language',
    'hindiclass': 'Language',
    'learnhindi': 'Language',
    'kannada': 'Language',
    'kannadalanguage': 'Language',
    'kannadalang': 'Language',
    'kannadalesson': 'Language',
    'kannadapractice': 'Language',
    'kannadastudy': 'Language',
    'kannadaclass': 'Language',
    'learnkannada': 'Language',
    'learnlanguage': 'Language',
    'vocab': 'Language',
    'grammar': 'Language',
    'duolingo': 'Language',
    'speaking': 'Language'
  };
  
  if (aliases[clean]) {
    const targetName = aliases[clean];
    match = habitsList.find(h => h.name && (
      h.name.toLowerCase() === targetName.toLowerCase() ||
      h.name.toLowerCase().replace(/[^a-z0-9]/g, '') === targetName.toLowerCase().replace(/[^a-z0-9]/g, '')
    ));
    if (match) return match;

    if (targetName === 'Language') {
      match = habitsList.find(h => h.name && (
        h.name.toLowerCase().includes('lang') ||
        h.name.toLowerCase().includes('hindi') ||
        h.name.toLowerCase().includes('kannada')
      ));
      if (match) return match;
    }
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
  },
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Log a daily expense with amount, description, category, and date.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Expense amount in Rupees (e.g. 20, 50, 150)" },
          description: { type: "string", description: "Short description of expense (e.g. Tea, Auto, Lunch)" },
          category: { anyOf: [{ type: "string" }, { type: "null" }], description: "Expense category (Food & Drinks, Transportation, Groceries, Bills & Utilities, Shopping, Other)" },
          payment_mode: { anyOf: [{ type: "string" }, { type: "null" }], description: "Payment mode (UPI, Cash, Card)" },
          date: { anyOf: [{ type: "string" }, { type: "null" }], description: "Target date in YYYY-MM-DD format (defaults to today)" }
        },
        required: ["amount", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_expenses",
      description: "Retrieve expense records for today or a specific date/month.",
      parameters: {
        type: "object",
        properties: {
          date: { anyOf: [{ type: "string" }, { type: "null" }], description: "Date YYYY-MM-DD or 'today' or 'yesterday'" },
          month: { anyOf: [{ type: "string" }, { type: "null" }], description: "Month in YYYY-MM format" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_expense",
      description: "Delete/undo an expense entry by ID, amount, description, or date. Deletes the most recent matching expense.",
      parameters: {
        type: "object",
        properties: {
          id: { anyOf: [{ type: "string" }, { type: "null" }], description: "Optional expense ID to delete." },
          amount: { anyOf: [{ type: "number" }, { type: "null" }], description: "Optional amount in Rupees to match (e.g. 50, 113)." },
          description: { anyOf: [{ type: "string" }, { type: "null" }], description: "Optional description keyword to match (e.g. gold, tea)." },
          date: { anyOf: [{ type: "string" }, { type: "null" }], description: "Optional date YYYY-MM-DD (or 'today')." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_expense",
      description: "Update/edit an existing expense entry (e.g., fix amount or description). Defaults to the most recent expense if ID is omitted.",
      parameters: {
        type: "object",
        properties: {
          id: { anyOf: [{ type: "string" }, { type: "null" }], description: "Optional expense ID. If omitted, updates the most recent expense." },
          amount: { anyOf: [{ type: "number" }, { type: "null" }], description: "Updated amount in Rupees" },
          description: { anyOf: [{ type: "string" }, { type: "null" }], description: "Updated description" },
          category: { anyOf: [{ type: "string" }, { type: "null" }], description: "Updated category" },
          payment_mode: { anyOf: [{ type: "string" }, { type: "null" }], description: "Updated payment mode (UPI, Cash, Card)" },
          date: { anyOf: [{ type: "string" }, { type: "null" }], description: "Updated date YYYY-MM-DD" }
        }
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
    else if (call.name === "add_expense") {
      const expDate = call.args.date || getLocalDateISO();
      const exp = {
        id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        date: expDate,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        month: expDate.substring(0, 7),
        amount: Number(call.args.amount || 0),
        description: call.args.description || "Expense",
        category: call.args.category || inferExpenseCategory(call.args.description),
        paymentMode: call.args.payment_mode || "UPI",
        source: "AI Agent",
        createdAt: new Date().toISOString()
      };
      logExpenseDirectly(exp);
      showToast(`Logged ₹${exp.amount}`);
      return { status: "success", result: `💸 **Logged Expense:** ₹${exp.amount} for **${exp.description}** (${exp.category}) for ${exp.date}. Saved to Expense Tracker!` };
    }
    else if (call.name === "get_expenses") {
      await fetchExpenseCloudState(true);
      let dateTarget = call.args.date;
      if (!dateTarget || dateTarget === 'today') {
        dateTarget = getLocalDateISO();
      } else if (dateTarget === 'yesterday') {
        dateTarget = getLocalDateISO(new Date(Date.now() - 86400000));
      }
      const summary = getIndexedExpensesSummary(dateTarget, call.args.month);
      return JSON.stringify(summary);
    }
    else if (call.name === "delete_expense") {
      await fetchExpenseCloudState(true);
      const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
      const newestFirst = [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      let target = null;
      if (call.args.id) {
        target = newestFirst.find(e => e.id === call.args.id);
      } else {
        const targetDate = call.args.date === 'today' ? getLocalDateISO() : call.args.date;
        target = newestFirst.find(e => {
          if (targetDate && normalizeExpenseDateStr(e.date) !== targetDate) return false;
          if (call.args.amount != null && Number(e.amount) !== Number(call.args.amount)) return false;
          if (call.args.description && !String(e.description || '').toLowerCase().includes(String(call.args.description).toLowerCase())) return false;
          return true;
        });
        // If description didn't match (e.g. user said "gold" when saved as "GOLDIETF"), retry matching by date + amount alone
        if (!target && call.args.amount != null) {
          target = newestFirst.find(e => {
            if (targetDate && normalizeExpenseDateStr(e.date) !== targetDate) return false;
            return Number(e.amount) === Number(call.args.amount);
          });
        }
        if (!target && call.args.amount == null && !call.args.description) {
          target = newestFirst[0];
        }
      }
      if (!target) {
        return { status: "error", message: "No matching expense found to delete." };
      }
      deleteExpenseDirectly(target.id);
      showToast(`Deleted ₹${target.amount}`);
      return { status: "success", result: `🗑️ **Deleted Expense:** ₹${target.amount} for **${target.description}** (${target.date}).` };
    }
    else if (call.name === "update_expense") {
      await fetchExpenseCloudState(true);
      const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
      const target = call.args.id ? list.find(e => e.id === call.args.id) : list[0];
      if (!target) {
        return { status: "error", message: "No matching expense found to update." };
      }
      const newDate = call.args.date || normalizeExpenseDateStr(target.date);
      const updated = {
        ...target,
        amount: call.args.amount != null ? Number(call.args.amount) : Number(target.amount),
        description: call.args.description || target.description,
        category: call.args.category || target.category,
        paymentMode: call.args.payment_mode || target.paymentMode || "UPI",
        date: newDate,
        month: newDate.substring(0, 7)
      };
      updateExpenseDirectly(updated);
      showToast(`Updated ₹${updated.amount}`);
      return { status: "success", result: `✏️ **Updated Expense:** ₹${updated.amount} for **${updated.description}** (${updated.date}).` };
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
- Common habits: Workout, SRE, Sun, Consistency, Maths, IQ, Finger nail, Language (all language study like Hindi, Kannada, etc. map to 'Language'), or any habit.
- Marking complete: When user did/completed a habit (e.g. "did language", "learn hindi", "did kannada lang", "mark SRE done today"), call 'update_habit' with action: 'check' and habit_ids.
- Unmarking: When user says "unmark", "undo", "uncheck", "didn't do", "remove" (e.g. "Unmark language for today", "undo workout"), you MUST call 'update_habit' with action: 'uncheck' and habit_ids.
- Querying Habits: When user asks what habits they completed today, what is pending, what habits they have, or asks about their habit streak/status (e.g. "what all things I have done today ?", "what's pending?"): ALWAYS call 'get_habits'.
- When multiple habits are mentioned in one message, always include all of them in the 'habit_ids' array.

Investments & Portfolio:
- When user asks how much funds they have, emergency fund balance, goals, car fund, or monthly totals: call 'get_investments'.
- When user wants to add or log investments (e.g., "for September I added 3000 to Parag Parikh, 2000 to ICICI N50, and 5000 to Emergency fund"):
  Call 'manage_investments' with month: "2026-09" and investments list.
- When user asks to remove/delete records for a specific month (e.g., "remove data of September" or "delete September records"):
  Call 'remove_investment_data' with month: "2026-09". Emphasize that only September was deleted and all other months are completely safe.

Daily Expenses:
- When user says they spent money, paid for something, or bought an item (e.g. "spent 20 for tea", "paid 50 for auto", "lunch 150", "petrol 300"):
  Call 'add_expense' with amount, description, category, and date.
- When user asks about their spending or expenses (e.g. "how much did I spend today?", "what are my expenses today?"):
  Call 'get_expenses'. ALWAYS display amounts in Indian Rupees (₹) and NEVER in $. Show itemized list if available.
- When user wants to delete, undo, or edit/fix an expense (e.g. "delete my last expense", "change that 500 to 50"):
  Call 'delete_expense' or 'update_expense'.

Ambiguity Handling (Expense vs Investment Portfolio):
- If the user types an ambiguous amount + item without a clear spend verb (spent/paid/bought) and without a clear investment verb (invest/add/to/portfolio) — for example "50 for gold" or "500 silver":
  DO NOT call 'add_expense' or 'manage_investments' yet. Ask clearly: "Should I log **₹<amount> for <item>** as a **Daily Expense** or an **Investment Portfolio** update?"
- When the user replies ("expense" or "portfolio" / "investment"), immediately call 'add_expense' or 'manage_investments' using the amount and item from the previous message.

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
        } else if (call.name === "add_expense") {
          if (toolResult && toolResult.result) {
            responses.push(toolResult.result);
          } else {
            responses.push(`Logged expense successfully! 💸`);
          }
        } else if (call.name === "delete_expense" || call.name === "update_expense") {
          if (toolResult && toolResult.status === "error") {
            responses.push(`⚠️ ${toolResult.message || 'Could not modify expense.'}`);
          } else if (toolResult && toolResult.result) {
            responses.push(toolResult.result);
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
  'learn hindi': 'Language', 'learned hindi': 'Language', 'learning hindi': 'Language', 'hindi language': 'Language', 'hindi lang': 'Language', 'hindilang': 'Language', 'hindilanguage': 'Language', 'hindi study': 'Language', 'hindi practice': 'Language', 'hindi lesson': 'Language', 'hindi revision': 'Language', 'hindi class': 'Language', 'hindi': 'Language',
  'learn kannada': 'Language', 'learned kannada': 'Language', 'learning kannada': 'Language', 'kannada language': 'Language', 'kannada lang': 'Language', 'kannadalang': 'Language', 'kannadalanguage': 'Language', 'kannada study': 'Language', 'kannada practice': 'Language', 'kannada lesson': 'Language', 'kannada revision': 'Language', 'kannada class': 'Language', 'kannada': 'Language',
  'learn language': 'Language', 'learning language': 'Language', 'language learning': 'Language', 'language practice': 'Language', 'language study': 'Language', 'language': 'Language', 'lang': 'Language', 'languages': 'Language', 'vocab': 'Language', 'grammar': 'Language', 'duolingo': 'Language', 'speaking': 'Language'
};

const MARK_VERBS = ['mark', 'marked', 'did', 'done', 'finish', 'finished', 'complete', 'completed', 'check', 'checked', 'log', 'logged', 'track', 'tracked', 'achieve', 'achieved', 'studied', 'practiced', 'exercised', 'walked', 'read', 'lifted', 'trained', 'meditated', 'prayed'];
const UNMARK_VERBS = ['unmark', 'unmarked', 'uncheck', 'unchecked', 'undo', 'remove', 'removed', 'delete', 'deleted', 'skip', 'skipped', 'miss', 'missed', 'revert', 'reverted', 'cancel', 'cancelled', 'did not', 'didnt', 'not done'];

function getIndexedHabitsSummary(targetDate) {
  const todayISO = targetDate || getLocalDateISO();
  const habits = cachedHabits || [];
  if (habits.length === 0) {
    return { date: todayISO, completed: [], pending: [], isEmpty: true };
  }
  const completed = [];
  const pending = [];
  
  habits.forEach(h => {
    if (Array.isArray(h.completedDates) && h.completedDates.includes(todayISO)) {
      completed.push(h.name);
    } else {
      pending.push(h.name);
    }
  });
  
  return { date: todayISO, completed, pending, isEmpty: false };
}

function extractTargetDate(text) {
  const clean = text.toLowerCase();
  const today = new Date();
  
  if (/\b(day before yesterday)\b/i.test(clean)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return { date: getLocalDateISO(d), label: 'day before yesterday', isToday: false };
  }
  if (/\b(yesterday|yday|prev day|previous day)\b/i.test(clean)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return { date: getLocalDateISO(d), label: 'yesterday', isToday: false };
  }
  // Check ISO format YYYY-MM-DD
  const isoMatch = clean.match(/\b(20\d\d-\d\d-\d\d)\b/);
  if (isoMatch) {
    const isToday = isoMatch[1] === getLocalDateISO();
    return { date: isoMatch[1], label: isoMatch[1], isToday };
  }

  // Check "7th sept", "sep 7", "nov 1", "nov 2", "september 7", etc.
  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };
  const mList = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
  const datePattern1 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${mList})(?:\\s+(20\\d\\d))?\\b`, 'i');
  const datePattern2 = new RegExp(`\\b(${mList})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(20\\d\\d))?\\b`, 'i');
  
  const match1 = clean.match(datePattern1);
  const match2 = clean.match(datePattern2);

  if (match1) {
    const day = match1[1].padStart(2, '0');
    const mStr = match1[2].toLowerCase().replace('sept', 'sep');
    const month = monthNames[mStr] || '01';
    const year = match1[3] || today.getFullYear().toString();
    const targetISO = `${year}-${month}-${day}`;
    return { date: targetISO, label: `${match1[1]} ${match1[2]}`, isToday: targetISO === getLocalDateISO() };
  } else if (match2) {
    const day = match2[2].padStart(2, '0');
    const mStr = match2[1].toLowerCase().replace('sept', 'sep');
    const month = monthNames[mStr] || '01';
    const year = match2[3] || today.getFullYear().toString();
    const targetISO = `${year}-${month}-${day}`;
    return { date: targetISO, label: `${match2[1]} ${match2[2]}`, isToday: targetISO === getLocalDateISO() };
  }

  return { date: getLocalDateISO(today), label: 'today', isToday: true };
}

// ==========================================
// --- Expense Tracking Helpers & Fast Intent ---
// ==========================================

const EXPENSE_CATEGORIES_MAP = {
  "Food & Drinks": ["tea", "chai", "coffee", "breakfast", "lunch", "dinner", "snack", "snacks", "swiggy", "zomato", "restaurant", "cafe", "food", "eat", "biryani", "juice", "samosa", "maggie", "biscuit"],
  "Transportation": ["auto", "cab", "uber", "ola", "metro", "bus", "train", "flight", "petrol", "diesel", "fuel", "parking", "toll", "rapido", "rickshaw"],
  "Groceries": ["grocery", "groceries", "supermarket", "vegetables", "fruits", "milk", "bread", "eggs", "rice", "dal", "oil", "curd", "blinkit", "zepto", "instamart", "bigbasket"],
  "Bills & Utilities": ["recharge", "wifi", "internet", "electricity", "water bill", "gas", "cylinder", "rent", "maintenance", "mobile recharge", "broadband"],
  "Shopping": ["shopping", "amazon", "flipkart", "myntra", "clothes", "shoes", "shirt", "pant", "electronics", "gadget"],
  "Entertainment": ["movie", "cinema", "netflix", "prime", "hotstar", "spotify", "youtube", "outing", "party"],
  "Health & Medical": ["medicine", "medicines", "doctor", "hospital", "clinic", "pharmacy", "medical", "tablet", "tablets", "dental"],
  "Other": []
};

function inferExpenseCategory(desc) {
  if (!desc) return "Other";
  const low = desc.toLowerCase();
  for (const [cat, words] of Object.entries(EXPENSE_CATEGORIES_MAP)) {
    for (const w of words) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(low)) return cat;
    }
  }
  return "Other";
}

let cachedExpensesList = getStoredExpenses();
let lastExpenseFetchTime = 0;
let expenseFetchPromise = null;

function normalizeExpenseMonthStr(m) {
  if (!m) return "";
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  const d = new Date(m);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${mo}`;
  }
  return String(m).substring(0, 7);
}

function normalizeExpenseDateStr(dStr) {
  if (!dStr) return getLocalDateISO();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) {
    return getLocalDateISO(d);
  }
  return String(dStr).substring(0, 10);
}

function normalizeExpenseTimeStr(t) {
  if (!t) return "";
  if (t.includes("GMT") || t.includes("1899")) {
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }
  return t;
}

async function fetchExpenseCloudState(force = false) {
  const now = Date.now();
  if (!force && cachedExpensesList && (now - lastExpenseFetchTime < 10000)) {
    return cachedExpensesList;
  }
  if (expenseFetchPromise) return expenseFetchPromise;

  expenseFetchPromise = (async () => {
    try {
      const res = await fetch(`${EXPENSE_GAS_URL}?action=getExpenses&t=${Date.now()}`);
      const data = await res.json();
      if (data && Array.isArray(data.expenses)) {
        const cleanList = data.expenses.map(e => ({
          ...e,
          date: normalizeExpenseDateStr(e.date),
          month: normalizeExpenseMonthStr(e.month || e.date),
          time: normalizeExpenseTimeStr(e.time),
          amount: Number(e.amount) || 0
        }));
        cachedExpensesList = cleanList;
        lastExpenseFetchTime = Date.now();
        try {
          localStorage.setItem("expense_tracker_data", JSON.stringify(cleanList));
        } catch (err) {}
        return cleanList;
      }
    } catch (err) {
      console.warn("Failed to fetch expenses from GAS:", err);
    } finally {
      expenseFetchPromise = null;
    }
    return getStoredExpenses();
  })();

  return expenseFetchPromise;
}

function getStoredExpenses() {
  try {
    const raw = localStorage.getItem("expense_tracker_data");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function logExpenseDirectly(expense) {
  try {
    const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
    list.unshift(expense);
    cachedExpensesList = list;
    lastSessionAction = { type: 'expense', expense };
    localStorage.setItem("expense_tracker_data", JSON.stringify(list));
    
    // Background sync to Google Sheet
    fetch(EXPENSE_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "addExpense", expense: expense }),
      keepalive: true
    }).catch(err => console.warn("Expense GAS sync failed:", err));
  } catch (e) {
    console.error("Failed to log expense directly:", e);
  }
}

function deleteExpenseDirectly(id) {
  try {
    const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
    const filtered = list.filter(e => e.id !== id);
    cachedExpensesList = filtered;
    localStorage.setItem("expense_tracker_data", JSON.stringify(filtered));

    fetch(EXPENSE_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "deleteExpense", id: id }),
      keepalive: true
    }).catch(err => console.warn("Expense delete GAS sync failed:", err));
  } catch (e) {
    console.error("Failed to delete expense directly:", e);
  }
}

function updateExpenseDirectly(expense) {
  try {
    const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
    const idx = list.findIndex(e => e.id === expense.id);
    if (idx !== -1) {
      list[idx] = expense;
      cachedExpensesList = list;
      localStorage.setItem("expense_tracker_data", JSON.stringify(list));
    }

    fetch(EXPENSE_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "updateExpense", expense: expense }),
      keepalive: true
    }).catch(err => console.warn("Expense update GAS sync failed:", err));
  } catch (e) {
    console.error("Failed to update expense directly:", e);
  }
}

function getIndexedExpensesSummary(dateTarget, monthTarget) {
  const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
  const todayISO = dateTarget || getLocalDateISO();
  const filtered = list.filter(e => {
    const expDate = normalizeExpenseDateStr(e.date);
    const expMonth = normalizeExpenseMonthStr(e.month || expDate);
    if (monthTarget) return expMonth === monthTarget || expDate.substring(0, 7) === monthTarget;
    return expDate === todayISO;
  });

  const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return {
    date: todayISO,
    month: monthTarget,
    count: filtered.length,
    total: total,
    expenses: filtered
  };
}

function extractTargetMonthForExpense(clean) {
  const now = new Date();
  if (/\b(this\s*month|current\s*month|monthly|whole\s*month|full\s*month)\b/i.test(clean)) {
    return { month: getLocalDateISO(now).substring(0, 7), label: 'This Month' };
  }
  if (/\b(last\s*month|previous\s*month|prev\s*month)\b/i.test(clean)) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { month: getLocalDateISO(d).substring(0, 7), label: 'Last Month' };
  }
  const yyyymmMatch = clean.match(/\b(20\d\d-\d\d)\b/);
  if (yyyymmMatch) {
    return { month: yyyymmMatch[1], label: yyyymmMatch[1] };
  }

  // Only treat a month name as a monthly query if there is NO specific day number attached (e.g. "nov 1")
  const mList = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
  const hasDay = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${mList})\\b|\\b(${mList})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i').test(clean);
  if (!hasDay) {
    const monthMatch = clean.match(new RegExp(`\\b(${mList})\\b`, 'i'));
    if (monthMatch) {
      const monthNames = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
        january: '01', february: '02', march: '03', april: '04', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
      };
      const mKey = monthMatch[1].toLowerCase();
      const yrMatch = clean.match(/\b(20\d\d)\b/);
      const year = yrMatch ? yrMatch[1] : now.getFullYear().toString();
      const mNum = monthNames[mKey];
      if (mNum) {
        const capName = mKey.charAt(0).toUpperCase() + mKey.slice(1);
        return { month: `${year}-${mNum}`, label: `${capName} ${year}` };
      }
    }
  }
  return null;
}

function tryFastExpenseIntent(userText) {
  const clean = userText.trim().toLowerCase().replace(/[?!.,]/g, '').trim();

  // 0. Fast Undo / Delete Last Expense
  if (/^(undo|undo\s+last|undo\s+(that|expense)|delete\s+last\s+expense|remove\s+last\s+expense|revert\s+last)$/i.test(clean)) {
    if (lastSessionAction && lastSessionAction.type === 'expense' && lastSessionAction.expense) {
      const exp = lastSessionAction.expense;
      deleteExpenseDirectly(exp.id);
      lastSessionAction = null;
      return {
        isQuery: true,
        reply: `↩️ **Undid Expense:** Removed **₹${Number(exp.amount).toLocaleString('en-IN')}** (${exp.description}) from ${exp.date}. *Synced to Google Sheet!*`
      };
    }
    const list = (cachedExpensesList && cachedExpensesList.length > 0) ? cachedExpensesList : getStoredExpenses();
    if (/expense/.test(clean) && list.length > 0) {
      const exp = list[0];
      deleteExpenseDirectly(exp.id);
      return {
        isQuery: true,
        reply: `🗑️ **Deleted Last Expense:** Removed **₹${Number(exp.amount).toLocaleString('en-IN')}** (${exp.description}) from ${normalizeExpenseDateStr(exp.date)}. *Synced to Google Sheet!*`
      };
    }
    if (lastSessionAction && lastSessionAction.type === 'habit') {
      const prev = lastSessionAction;
      const undoAct = prev.action === 'check' ? 'uncheck' : 'check';
      executeToolCall({
        name: 'update_habit',
        args: { habit_ids: prev.habit_ids, action: undoAct, date: prev.date }
      });
      lastSessionAction = null;
      return {
        isQuery: true,
        reply: `↩️ **Undid Habit Update:** ${undoAct === 'uncheck' ? 'Unmarked' : 'Marked'} **${prev.habit_ids.join(', ')}** for ${prev.date}.`
      };
    }
    return {
      isQuery: true,
      reply: `Nothing recent to undo in this session. Try *"delete last expense"* if you want to remove the latest entry from your sheet.`
    };
  }

  // If Leo just asked to clarify Expense vs Portfolio, let the LLM handle short replies like "expense"
  const lastAiMsg = [...chatHistory].reverse().find(m => m.role === 'model');
  const awaitingClarification = lastAiMsg && /expense.*portfolio|portfolio.*expense/i.test(lastAiMsg.content || '');
  if (awaitingClarification && /^(?:an?\s*)?(daily\s*)?(expense|expenses|portfolio|investment|invest|wealthflow)$/i.test(clean)) {
    return null;
  }

  // 1. Expense Queries (e.g. "today expenses", "this month expenses", "how much expense i did in this month", "my expenses")
  const isInvest = /\b(invest|invested|networth|stocks?|etfs?|mutual|portfolio|sips?)\b/i.test(clean);
  const isExplicitLog = /\b(spent|spend|paid|pay)\s*₹?\s*\d+/i.test(clean) || /^\d+\s*(rs|rupees|spent|for)?$/i.test(clean);
  const isModifyCmd = /\b(delete|del|remove|undo|edit|update|change|fix|modify|replace|erase)\b/i.test(clean);
  const isExpQuery = !isInvest && !isExplicitLog && !isModifyCmd &&
    /\b(expenses?|spending|spent\s*today|spend\s*today|total\s*spent|how\s*much.*spent|my\s*expenses?|show\s*expenses?|list\s*expenses?|what.*spent|daily\s*expenses?|monthly\s*expenses?)\b/i.test(clean);

  if (isExpQuery) {
    // 1a. Check if user is asking for a Month (e.g. "this month", "last month", "november")
    const targetMonthInfo = extractTargetMonthForExpense(clean);
    if (targetMonthInfo) {
      const summary = getIndexedExpensesSummary(null, targetMonthInfo.month);
      if (summary.count === 0) {
        return {
          isQuery: true,
          reply: `🧾 **No expenses recorded for ${targetMonthInfo.label} (${targetMonthInfo.month}).**\n\n*You can log anytime by typing: "spent 20 for tea" or "paid 50 for auto"!* ☕`
        };
      }
      // Group by date (newest first) for a clean day-by-day summary
      const byDay = {};
      summary.expenses.forEach(e => {
        const d = normalizeExpenseDateStr(e.date);
        if (!byDay[d]) byDay[d] = { total: 0, count: 0 };
        byDay[d].total += Number(e.amount) || 0;
        byDay[d].count += 1;
      });
      const todayISO = getLocalDateISO();
      const dayLines = Object.keys(byDay).sort().reverse().map(d => {
        const dt = new Date(d + 'T00:00:00');
        const label = !isNaN(dt.getTime())
          ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : d;
        const todayTag = d === todayISO ? ' *(Today)*' : '';
        const entryWord = byDay[d].count === 1 ? 'entry' : 'entries';
        return `- **${label}**${todayTag}: ₹${byDay[d].total.toLocaleString('en-IN')} *(${byDay[d].count} ${entryWord})*`;
      });
      return {
        isQuery: true,
        reply: `🧾 **Expenses for ${targetMonthInfo.label} (${targetMonthInfo.month}):**\n\n${dayLines.join('\n')}\n\n**Total Spent:** ₹${summary.total.toLocaleString('en-IN')} *(${summary.count} entries)* 💸\n*Synced with your Expense Tracker!*`
      };
    }

    // 1b. Otherwise, specific Day query (today, yesterday, nov 1, etc.)
    const targetDateInfo = extractTargetDate(clean);
    const summary = getIndexedExpensesSummary(targetDateInfo.date);
    if (summary.count === 0) {
      return {
        isQuery: true,
        reply: `🧾 **No expenses recorded for ${targetDateInfo.isToday ? 'today' : targetDateInfo.label} (${targetDateInfo.date}).**\n\n*You can log anytime by typing: "spent 20 for tea" or "paid 50 for auto"!* ☕`
      };
    }
    const lines = summary.expenses.map(e => {
      const timeTag = e.time ? ` • ${e.time}` : '';
      return `- **${e.description}**: ₹${Number(e.amount).toLocaleString('en-IN')} *(${e.category}${timeTag})*`;
    });
    return {
      isQuery: true,
      reply: `🧾 **Expenses for ${targetDateInfo.isToday ? 'Today' : targetDateInfo.label} (${targetDateInfo.date}):**\n\n${lines.join('\n')}\n\n**Total:** ₹${summary.total.toLocaleString('en-IN')} 💸\n*Synced with your Expense Tracker!*`
    };
  }

  // 2. Expense Logging (e.g. "spent 200 for today", "spend 10 now", "spent 500", "spent 100", "paid 50", "200")
  const hasSpendVerb = /\b(spent|spend|paid|pay|bought|chai|tea|coffee|lunch|dinner|auto|uber|ola|petrol|swiggy|zomato)\b/i.test(clean) || /^(spent|spend|paid|pay)\b/i.test(clean);
  const numMatch = clean.match(/(?:(?:rs\.?|₹|inr)\s*(\d+(?:\.\d+)?))|(?:(?:spent|spend|paid|pay)\s*(\d+(?:\.\d+)?))|(?:\b(\d+(?:\.\d+)?)\s*(?:rs|rupees|bucks)?\b)/i);
  
  if (hasSpendVerb && numMatch && !/\b(goals?|emergency|ppf|epf|nps|stocks?|etfs?|mutual\s*funds?|goldietf|tata\s*cap)\b/i.test(clean)) {
    const amount = Number(numMatch[1] || numMatch[2] || numMatch[3]);
    if (amount > 0 && amount < 1000000) {
      const targetDateInfo = extractTargetDate(clean);
      let cat = "Other";
      let desc = "";

      for (const [c, words] of Object.entries(EXPENSE_CATEGORIES_MAP)) {
        for (const w of words) {
          if (new RegExp(`\\b${w}\\b`, 'i').test(clean)) {
            cat = c;
            desc = w.charAt(0).toUpperCase() + w.slice(1);
            break;
          }
        }
        if (desc) break;
      }

      let customDesc = clean
        .replace(/(?:spent|spend|paid|pay|for|in|morning|evening|night|today|yesterday|via|rupees|rs\.?|₹|bucks|now)\b/gi, '')
        .replace(/\b\d+(\.\d+)?\b/g, '')
        .trim();
      if (customDesc.length >= 2) {
        desc = customDesc.charAt(0).toUpperCase() + customDesc.slice(1);
      }

      if (!desc) {
        desc = "Expense";
        cat = "Other";
      }

      const expenseObj = {
        id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        date: targetDateInfo.date,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        month: targetDateInfo.date.substring(0, 7),
        amount: amount,
        description: desc,
        category: cat,
        paymentMode: clean.includes("cash") ? "Cash" : (clean.includes("card") ? "Credit Card" : "UPI"),
        source: "AI Agent",
        createdAt: new Date().toISOString()
      };

      return {
        isLog: true,
        expense: expenseObj
      };
    }
  }

  return null;
}

function tryFastHabitIntent(userText) {
  const raw = userText.trim().toLowerCase();
  const clean = raw.replace(/[?!.,]/g, '').trim();
  const targetDateInfo = extractTargetDate(clean);
  const targetISO = targetDateInfo.date;
  const dateLabel = targetDateInfo.label;
  const isToday = targetDateInfo.isToday;

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

  // 1c. Habit Lifetime Stats & Streaks
  const isStatQuery = /\b(total|totally|all\s*time|how\s*many\s*times|how\s*much|count|streak|streaks|stats?|history|record)\b/i.test(clean) &&
    !/\b(put|add|invest|invested|saved|logged|bought|delete|del)\b/i.test(clean);

  if (isStatQuery) {
    const habitsList = cachedHabits || [];
    const matchedStats = [];
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
      if (!matches && (clean.includes('hindi') || clean.includes('kannada') || clean.includes('lang') || clean.includes('language')) && (cleanName.includes('lang') || cleanName.includes('hindi') || cleanName.includes('kannada'))) matches = true;

      if (matches) {
        const dates = Array.isArray(h.completedDates) ? h.completedDates : [];
        const totalCount = dates.length;
        const streak = calculateCurrentStreak(dates);
        const lastDone = dates.length > 0 ? [...dates].sort().reverse()[0] : 'Never';
        matchedStats.push(`📊 **Habit Statistics: ${h.name}**\n- **Total Completed:** ${totalCount} day(s)\n- **Current Streak:** ${streak} day(s) 🔥\n- **Last Completed:** ${lastDone}`);
      }
    }
    if (matchedStats.length > 0) {
      return matchedStats.join('\n\n');
    }
  }

  // 2. Fast Query: Completed habits on target date (today, yesterday, specific date)
  if (/\b(what\s*did\s*i\s*do|what\s*i\s*did|what\s*all\s*i\s*did|what\s*have\s*i\s*done|things\s*i\s*have\s*done|what\s*is\s*done|what\s*is\s*completed|completed\s*(today|yesterday)|done\s*(today|yesterday)|habits\s*(today|yesterday)|(today|yesterday)\s*status)\b/i.test(clean) ||
      (/^(what|show|list|tell|which).*(did|done|completed|finished|have done).*(today|yesterday|habits?)?/i.test(clean))) {
    const summary = getIndexedHabitsSummary(targetISO);
    if (summary.isEmpty) {
      return null;
    }
    const headerTitle = isToday
      ? `📅 **Habits you completed today (${targetISO}):**`
      : `📅 **Habits you completed ${dateLabel} (${targetISO}):**`;

    if (summary.completed.length === 0) {
      const pendingList = summary.pending.length > 0 ? summary.pending.map(h => `- ${h}`).join('\n') : 'No active habits found.';
      const noDoneMsg = isToday
        ? `No habits completed yet today. Let me know when you finish any! ☀️`
        : `No habits were completed on ${targetISO}.`;
      const pendingHeading = isToday ? '**Pending:**' : '**Missed / Not Done:**';
      return `📅 **Status for ${dateLabel} (${targetISO}):**\n\n${noDoneMsg}\n\n${pendingHeading}\n${pendingList}`;
    }
    const completedList = summary.completed.map(h => `- **${h}** ✅`).join('\n');
    const pendingHeading = isToday ? '**Pending:**' : '**Missed / Not Done:**';
    const pendingList = summary.pending.length > 0 ? summary.pending.map(h => `- ${h}`).join('\n') : (isToday ? 'None! All done 🎉' : 'None! Completed all 🌟');
    return `${headerTitle}\n\n${completedList}\n\n${pendingHeading}\n${pendingList}`;
  }

  // 3. Fast Query: Pending habits on target date
  if (/\b(what\s*is\s*pending|pending\s*habits|what\s*is\s*left|whats\s*left|remaining\s*habits|not\s*done|missed\s*habits)\b/i.test(clean) ||
      (/^(what|show|list|which).*(pending|left|remaining|not\s*done|missed).*(today|yesterday|habits?)?/i.test(clean))) {
    const summary = getIndexedHabitsSummary(targetISO);
    if (summary.isEmpty) {
      return null;
    }
    if (summary.pending.length === 0) {
      return isToday
        ? `🎉 **Amazing!** You have completed all your habits for today (${targetISO})! ☀️`
        : `🎉 **All habits were completed on ${targetISO}!** 🌟`;
    }
    const pendingList = summary.pending.map(h => `- **${h}** ⏳`).join('\n');
    const pendingHeading = isToday
      ? `⏳ **Pending habits for today (${targetISO}):**`
      : `⏳ **Pending / Missed habits for ${dateLabel} (${targetISO}):**`;
    return `${pendingHeading}\n\n${pendingList}`;
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
        // Resolve canonicalName to exact habit in cachedHabits if available
        const matchedHabit = matchHabit(habitsList, canonicalName) || matchHabit(habitsList, alias);
        const resolvedName = matchedHabit ? matchedHabit.name : canonicalName;
        if (!detectedHabits.includes(resolvedName)) {
          detectedHabits.push(resolvedName);
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
          // Check words inside multi-word habits
          const words = h.name.toLowerCase().split(/\s+/);
          for (const w of words) {
            if (w.length > 2 && new RegExp(`\\b${w}\\b`, 'i').test(clean)) {
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
        date: targetISO
      };
    }
  }

  return null;
}

function tryFastInvestQuery(userText, investState) {
  const clean = userText.trim().toLowerCase().replace(/[?!.,]/g, '');
  if (!investState || !investState.records) return null;

  // If user is adding/updating amounts (e.g. "50 for gold", "10000 to Goals"), never treat as query
  if (pendingClarification || (/\b\d+\b|\b\d+k\b|₹\d+/i.test(clean) && /\b(to|in|into|for|balance|add|invest|put|set|update|goals?|emergency|gold|silver|ppf|epf|nps)\b/i.test(clean))) {
    return null;
  }
  
  // Extract target month if specified in query
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

  const months = Object.keys(investState.records).sort();
  if (months.length === 0) return null;
  if (!targetMonth) {
    targetMonth = months[months.length - 1];
  }
  
  const monthData = investState.records[targetMonth] || {};
  const assets = investState.assets || DEFAULT_INVEST_ASSETS;
  
  // 1. Total Net Worth / Total Invested / Portfolio Summary
  if (/\b(total\s*net\s*worth|net\s*worth|networth|invested\s*amount|total\s*invested|total\s*investment|total\s*portfolio|portfolio\s*overview|portfolio\s*summary|all\s*investments|list\s*all\s*investments|my\s*holdings)\b/i.test(clean) ||
      (/\b(total|how much|what)\b/i.test(clean) && /\b(networth|net\s*worth|invested|investments?|portfolio|total)\b/i.test(clean))) {
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
  if (/\b(stocks?|etfs?|shares?|equit(y|ies))\b/i.test(clean) && !/\b(mf|mutual|fund)\b/i.test(clean)) {
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
  if (/\b(mutual\s*funds?|mfs?)\b/i.test(clean)) {
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
  if (/\b(gold|silver|digi\s*gold|commodit(y|ies))\b/i.test(clean) && !/\b(parag|hdfc|icici|tata)\b/i.test(clean)) {
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

  // 5. Emergency Fund & Goals (Strictly only queries or chip clicks)
  const isGoalQuery = clean === 'emergency fund' || clean === 'goals' || clean === 'goal' || clean === 'car fund' ||
    (/\b(emergency\s*fund|emergency|goals?|car\s*fund)\b/i.test(clean) && /\b(how much|what is|what's|balance|show|tell|check|status|overview|summary)\b/i.test(clean));

  if (isGoalQuery) {
    let list = [];
    assets.filter(a => a.category === 'Emergency Fund' || a.category === 'Goals').forEach(a => {
      const val = (monthData[a.id] && monthData[a.id].invested) || 0;
      list.push(`- **${a.name}**: ₹${val.toLocaleString('en-IN')}`);
    });
    return `🛡️ **Emergency & Goal Funds (${targetMonth}):**\n\n${list.join('\n')}`;
  }

  // 6. Any Individual Asset Query (e.g. "how much i have in digi gold", "tata capital balance", "what is in ppf")
  const isQuery = /\b(how much|what is|what's|balance|total|value|amount|show|tell|check|holding|funds?)\b/i.test(clean);

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
  
  // Guard against habit logs or questions
  if (/\b(how much|what is|what's|did i|have i|list habits|what all i did)\b/i.test(clean)) return null;

  // Extract month and year (supports "For December 2026 - ", "October 2026", "Oct", "2026-10", etc.)
  let targetMonth = null;
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'sep', 'oct', 'nov', 'dec'];

  let body = clean;
  const headerMatch = clean.match(/^for\s+([a-z]+|\d{4}-\d{2})(?:\s+(\d{4}))?\s*[-:]\s*/i);
  if (headerMatch) {
    body = clean.substring(headerMatch[0].length);
    const mStr = headerMatch[1];
    const yStr = headerMatch[2] || (new Date().getFullYear().toString());
    targetMonth = normalizeMonth(`${mStr} ${yStr}`);
  }

  if (!targetMonth) {
    const yyyymmMatch = clean.match(/\b(20\d\d-\d\d)\b/);
    if (yyyymmMatch) {
      targetMonth = yyyymmMatch[1];
    } else {
      const yrMatch = clean.match(/\b(20\d\d)\b/);
      const yStr = yrMatch ? yrMatch[1] : (new Date().getFullYear().toString());
      for (const m of monthNames) {
        if (new RegExp('\\b' + m + '\\b', 'i').test(clean)) {
          targetMonth = normalizeMonth(`${m} ${yStr}`);
          break;
        }
      }
    }
  }

  if (!targetMonth) {
    targetMonth = normalizeMonth(null); // defaults to current month
  }

  const isSetAction = /\b(set|replace)\b/i.test(clean);
  const items = [];
  const assets = (investState && investState.assets) || DEFAULT_INVEST_ASSETS;
  const filterWordsRegex = new RegExp('\\b(' + monthNames.join('|') + '|for|in|to|into|month|added|add|invested|invest|put|saved|logged|set|deposit|deposited|updating|update|balance|fund|funds)\\b', 'gi');

  // Split clauses by commas, semicolons, newlines, 'and', '&', '+'
  const parts = body.split(/(?:\band\b|[,;&\n\r]+)/i);
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    const numMatch = trimmedPart.match(/(?:₹|rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|lakh|lac|cr)?/i);
    if (numMatch) {
      let rawVal = parseFloat(numMatch[1].replace(/,/g, ''));
      if (numMatch[2] && numMatch[2].toLowerCase() === 'k') rawVal *= 1000;
      if (numMatch[2] && (numMatch[2].toLowerCase() === 'lakh' || numMatch[2].toLowerCase() === 'lac')) rawVal *= 100000;
      if (numMatch[2] && numMatch[2].toLowerCase() === 'cr') rawVal *= 10000000;

      // Extract candidate asset string
      const assetCandidate = trimmedPart
        .replace(numMatch[0], ' ')
        .replace(filterWordsRegex, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .trim();

      if (assetCandidate.length >= 2 && rawVal > 0) {
        const matchedAsset = matchAsset(assets, assetCandidate);
        if (matchedAsset) {
          const existing = items.find(it => it.asset_id === matchedAsset.id);
          if (existing) {
            existing.amount += rawVal;
          } else {
            items.push({
              asset_id: matchedAsset.id,
              name: matchedAsset.name,
              amount: rawVal,
              mode: isSetAction ? 'set' : 'add'
            });
          }
        }
      }
    }
  }

  if (items.length > 0) {
    const hasExplicitInvestSignal =
      Boolean(headerMatch) ||
      items.length > 1 ||
      /\b(add|added|invest|invested|put|set|replace|update|updating|deposit|deposited|save|saved|log|logged|to|into|sip|sips|portfolio|wealthflow|etf|etfs|mutual\s*fund|epf|ppf|nps|goals?|digi\s*gold|goldietf|tatsilv|metalietf)\b/i.test(clean);

    if (!hasExplicitInvestSignal) {
      if (items.length === 1) {
        pendingClarification = {
          amount: items[0].amount,
          assetId: items[0].asset_id,
          assetName: items[0].name,
          description: items[0].name,
          month: targetMonth
        };
      }
      return null;
    }

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

  const clean = text.trim().toLowerCase().replace(/[?!.,]/g, '');
  const isHabitQuery = /\b(what|show|list|tell|which|status|overview|summary|today|pending|left|remaining|done|completed|did|streak|stats)\b/i.test(clean);
  const isInvestQuery = /\b(networth|net\s*worth|portfolio|stocks?|etfs?|mutual\s*funds?|gold|silver|epf|ppf|nps|invested|holdings)\b/i.test(clean);
  const isExpenseQuery = /\b(expenses?|spent|spending|spend|chai|tea|coffee|lunch|dinner|auto|petrol)\b/i.test(clean);

  // Ensure expense cache is populated and fresh from Google Sheets
  if (!cachedExpensesList || isExpenseQuery || Date.now() - lastExpenseFetchTime > 15000) {
    const needIndicator = (!cachedExpensesList || isExpenseQuery) && isExpenseQuery;
    if (needIndicator) showTypingIndicator();
    await fetchExpenseCloudState(isExpenseQuery);
    if (needIndicator) hideTypingIndicator();
  }

  // Ensure habit cache is populated and fresh
  if (!cachedHabits || cachedHabits.length === 0 || habitsFetchPromise || (isHabitQuery && Date.now() - lastHabitFetchTime > 10000)) {
    const needIndicator = !cachedHabits || cachedHabits.length === 0 || (isHabitQuery && Date.now() - lastHabitFetchTime > 10000);
    if (needIndicator) showTypingIndicator();
    await getHabitsState(isHabitQuery);
    if (needIndicator) hideTypingIndicator();
  }
  // Ensure invest cache is populated and fresh
  if (!cachedInvestState || !cachedInvestState.records || Object.keys(cachedInvestState.records).length === 0 || investFetchPromise || (isInvestQuery && Date.now() - lastInvestFetchTime > 20000)) {
    const needIndicator = !cachedInvestState || !cachedInvestState.records || (isInvestQuery && Date.now() - lastInvestFetchTime > 20000);
    if (needIndicator) showTypingIndicator();
    await fetchInvestCloudState(isInvestQuery);
    if (needIndicator) hideTypingIndicator();
  }
  
  // 0. Try Fast Expense Log or Query (0ms)
  const expenseFastMatch = tryFastExpenseIntent(text);
  if (expenseFastMatch) {
    if (expenseFastMatch.isLog) {
      logExpenseDirectly(expenseFastMatch.expense);
      const isToday = expenseFastMatch.expense.date === getLocalDateISO();
      const daySummary = getIndexedExpensesSummary(expenseFastMatch.expense.date);
      const noteStr = (expenseFastMatch.expense.description && expenseFastMatch.expense.description !== 'Expense') ? ` for **${expenseFastMatch.expense.description}**` : '';
      const reply = `💸 **Logged ₹${expenseFastMatch.expense.amount}${noteStr} for ${isToday ? 'today' : expenseFastMatch.expense.date}!**\n\n📅 **Day Total:** ₹${daySummary.total.toLocaleString('en-IN')}\n*Synced to Google Sheet ☁️*`;
      appendMessage('ai', reply);
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'model', content: reply });
      showToast(`Logged ₹${expenseFastMatch.expense.amount}`);
      return;
    } else if (expenseFastMatch.isQuery) {
      appendMessage('ai', expenseFastMatch.reply);
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'model', content: expenseFastMatch.reply });
      return;
    }
  }

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
      lastSessionAction = {
        type: 'habit',
        habit_ids: habitFastMatch.habit_ids,
        action: habitFastMatch.action,
        date: habitFastMatch.date
      };
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
  const aiMsgEl = appendMessage('ai', aiResponse);
  chatHistory.push({ role: 'model', content: aiResponse });

  // Attach 1-tap clarification buttons if Leo asked Expense vs. Portfolio
  if (pendingClarification && /expense.*portfolio|portfolio.*expense/i.test(aiResponse || '')) {
    const ctx = pendingClarification;
    pendingClarification = null;
    const contentEl = aiMsgEl.querySelector('.message-content');
    if (contentEl) {
      const btnWrap = document.createElement('div');
      btnWrap.className = 'clarify-actions';

      const expBtn = document.createElement('button');
      expBtn.type = 'button';
      expBtn.className = 'clarify-btn';
      expBtn.textContent = `💸 Daily Expense (₹${ctx.amount})`;

      const portBtn = document.createElement('button');
      portBtn.type = 'button';
      portBtn.className = 'clarify-btn portfolio-btn';
      portBtn.textContent = `📈 Portfolio (${ctx.assetName})`;

      const disableAll = () => {
        expBtn.disabled = true;
        portBtn.disabled = true;
      };

      expBtn.addEventListener('click', () => {
        disableAll();
        const todayISO = getLocalDateISO();
        const expObj = {
          id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          date: todayISO,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          month: todayISO.substring(0, 7),
          amount: Number(ctx.amount),
          description: ctx.description,
          category: inferExpenseCategory(ctx.description),
          paymentMode: "UPI",
          source: "AI Agent",
          createdAt: new Date().toISOString()
        };
        logExpenseDirectly(expObj);
        const daySummary = getIndexedExpensesSummary(todayISO);
        const reply = `💸 **Logged ₹${expObj.amount} for ${expObj.description} today!**\n\n📅 **Day Total:** ₹${daySummary.total.toLocaleString('en-IN')}\n*Synced to Google Sheet ☁️*`;
        appendMessage('ai', reply);
        chatHistory.push({ role: 'model', content: reply });
        showToast(`Logged ₹${expObj.amount}`);
      });

      portBtn.addEventListener('click', async () => {
        disableAll();
        await executeToolCall({
          name: 'manage_investments',
          args: {
            month: ctx.month,
            investments: [{ asset_id: ctx.assetId, amount: Number(ctx.amount), mode: 'add' }]
          }
        });
        const reply = `📈 **Logged Investment for ${ctx.month}:**\n\n- **${ctx.assetName}**: +₹${Number(ctx.amount).toLocaleString('en-IN')}\n\n*Saved to your Wealthflow portfolio!*`;
        appendMessage('ai', reply);
        chatHistory.push({ role: 'model', content: reply });
      });

      btnWrap.appendChild(expBtn);
      btnWrap.appendChild(portBtn);
      contentEl.appendChild(btnWrap);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  } else {
    pendingClarification = null;
  }
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

// --- Quick Prompt Suggestion Chips ---
const quickChipsContainer = document.getElementById('quickChipsContainer');
if (quickChipsContainer) {
  quickChipsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    const query = btn.getAttribute('data-query');
    if (!query) return;
    chatInput.value = query;
    chatForm.dispatchEvent(new Event('submit'));
  });
}

// --- Monthly Investment Update Sidebar Helper ---
const DEFAULT_MONTHLY_SIPS = [
  // User's Core Monthly SIPs & Contributions
  { id: 'goal_car_fund', name: 'Goals', fullName: 'Car Fund / Goals', group: 'savings', icon: '🎯', category: 'Car Fund / Goals', amount: 0 },
  { id: 'goal_digi_gold', name: 'digi gold', fullName: 'Digi Gold', group: 'savings', icon: '🪙', category: 'Gold Investment', amount: 0 },
  { id: 'goal_emergency_fund', name: 'emergency fund', fullName: 'Emergency Fund', group: 'savings', icon: '🛡️', category: 'Emergency Savings', amount: 0 },
  { id: 'nps_tier1', name: 'nps', fullName: 'NPS Tier 1', group: 'savings', icon: '🏛️', category: 'NPS Tier 1', amount: 0 },
  { id: 'ppf_balance', name: 'ppf', fullName: 'PPF Balance', group: 'savings', icon: '🏦', category: 'PPF Balance', amount: 0 },
  { id: 'mf_parag_parikh', name: 'Parag pariek', fullName: 'Parag Parikh Flexi Cap', group: 'mutual', icon: '📈', category: 'Flexi Cap Fund', amount: 0 },
  { id: 'mf_icici_n50', name: 'icici nifty 50 fund', fullName: 'ICICI Nifty 50 Index', group: 'mutual', icon: '📊', category: 'Index Fund', amount: 0 },
  { id: 'mf_bandhan_small', name: 'bandan small cap', fullName: 'Bandhan Small Cap', group: 'mutual', icon: '🚀', category: 'Small Cap Fund', amount: 0 },
  { id: 'epf_balance', name: 'epf balance', fullName: 'EPF Balance', group: 'savings', icon: '💼', category: 'EPF Balance', amount: 0 },

  // Wealthflow Stocks & ETFs Holdings
  { id: 'st_tata_cap', name: 'TATA Capital', fullName: 'TATA Capital', group: 'stocks', icon: '🏢', category: 'Financial Services (NBFC)', amount: 0 },
  { id: 'st_tatsilv', name: 'TATSILV', fullName: 'TATSILV', group: 'stocks', icon: '🥈', category: 'Commodities - Silver ETF', amount: 0 },
  { id: 'st_goldietf', name: 'GOLDIETF', fullName: 'GOLDIETF', group: 'stocks', icon: '🥇', category: 'Commodities - Gold ETF', amount: 0 },
  { id: 'st_hdfc', name: 'HDFC BANK', fullName: 'HDFC BANK', group: 'stocks', icon: '🏦', category: 'Banking - Private Sector', amount: 0 },
  { id: 'st_bpcl', name: 'BPCL', fullName: 'BPCL', group: 'stocks', icon: '⛽', category: 'Oil & Gas', amount: 0 },
  { id: 'st_icici', name: 'ICICI BANK', fullName: 'ICICI BANK', group: 'stocks', icon: '🏦', category: 'Banking - Private Sector', amount: 0 },
  { id: 'st_metalietf', name: 'METALIETF', fullName: 'METALIETF', group: 'stocks', icon: '⛏️', category: 'Metals & Mining ETF', amount: 0 },
  { id: 'st_southbank', name: 'SOUTHBANK', fullName: 'SOUTHBANK', group: 'stocks', icon: '🏛️', category: 'Banking - Private Sector', amount: 0 },
  { id: 'st_nippon_it', name: 'Nippon India ETF IT', fullName: 'Nippon India ETF IT', group: 'stocks', icon: '💻', category: 'Information Technology ETF', amount: 0 },
  { id: 'nps_tier2', name: 'nps tier 2', fullName: 'NPS Tier 2', group: 'savings', icon: '🏛️', category: 'NPS Tier 2', amount: 0 }
];

function initMonthlyUpdateSidebar() {
  const openBtn = document.getElementById('openMonthlyUpdateBtn');
  const closeBtn = document.getElementById('closeMonthlySidebarBtn');
  const overlay = document.getElementById('monthlySidebarOverlay');
  const monthSelect = document.getElementById('templateMonthSelect');
  const yearSelect = document.getElementById('templateYearSelect');
  const categoryTabs = document.getElementById('sidebarCategoryTabs');
  const inputsList = document.getElementById('assetInputsList');
  const outputTextarea = document.getElementById('monthlyPromptOutput');
  const copyBtn = document.getElementById('copyPromptBtn');
  const sendBtn = document.getElementById('sendPromptBtn');

  if (!openBtn || !overlay || !inputsList || !outputTextarea) return;

  let activeFilter = 'all';
  let sips = JSON.parse(JSON.stringify(DEFAULT_MONTHLY_SIPS));
  try {
    localStorage.removeItem('leo_monthly_sips_template');
  } catch (e) {}

  function syncAssetsFromCloud() {
    const cloudAssets = (cachedInvestState && Array.isArray(cachedInvestState.assets) && cachedInvestState.assets.length > 0)
      ? cachedInvestState.assets
      : DEFAULT_INVEST_ASSETS;

    const merged = JSON.parse(JSON.stringify(DEFAULT_MONTHLY_SIPS));
    cloudAssets.forEach(ca => {
      if (!ca || !ca.id) return;
      const existing = merged.find(m => m.id === ca.id);
      if (existing) {
        existing.fullName = ca.name || existing.fullName;
        if (ca.sector) existing.category = ca.sector;
      } else {
        const catLow = (ca.category || '').toLowerCase();
        let group = 'savings';
        let icon = '💼';
        if (catLow.includes('stock') || catLow.includes('etf')) {
          group = 'stocks';
          icon = '🏢';
        } else if (catLow.includes('mutual')) {
          group = 'mutual';
          icon = '📈';
        } else if (catLow.includes('gold')) {
          icon = '🪙';
        } else if (catLow.includes('goal')) {
          icon = '🎯';
        } else if (catLow.includes('emergency')) {
          icon = '🛡️';
        }
        merged.push({
          id: ca.id,
          name: ca.name,
          fullName: ca.name,
          group: group,
          icon: icon,
          category: ca.sector || ca.category || 'Wealthflow Asset',
          amount: 0
        });
      }
    });
    merged.forEach(item => { item.amount = 0; });
    sips = merged;
  }

  // Populate month options
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const nextMonthIdx = (now.getMonth() + 1) % 12;
  const targetMonthName = monthNames[nextMonthIdx];

  monthSelect.innerHTML = '';
  const reorderedMonths = [targetMonthName, ...monthNames.filter(m => m !== targetMonthName)];
  reorderedMonths.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });
  monthSelect.value = targetMonthName;

  // Populate year options
  const currentYear = now.getFullYear();
  const defaultYear = (nextMonthIdx === 0 && now.getMonth() === 11) ? currentYear + 1 : currentYear;

  if (yearSelect) {
    yearSelect.innerHTML = '';
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
    yearSelect.value = defaultYear;
    yearSelect.addEventListener('change', updateGeneratedPrompt);
  }

  // Category filter tabs
  if (categoryTabs) {
    categoryTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.sidebar-cat-pill');
      if (!btn) return;
      categoryTabs.querySelectorAll('.sidebar-cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderInputs();
    });
  }

  function renderInputs() {
    inputsList.innerHTML = '';
    const filtered = sips.filter(item => {
      if (activeFilter === 'all') return true;
      return item.group === activeFilter;
    });

    filtered.forEach((item) => {
      const globalIdx = sips.findIndex(s => s.id === item.id);
      const row = document.createElement('div');
      row.className = 'asset-input-row';
      row.innerHTML = `
        <div class="asset-info">
          <span class="asset-icon">${item.icon}</span>
          <div class="asset-text">
            <span class="asset-name">${item.fullName || item.name}</span>
            <span class="asset-category">${item.category}</span>
          </div>
        </div>
        <div class="asset-input-box">
          <span class="currency-symbol">₹</span>
          <input type="number" class="asset-num-input" data-index="${globalIdx}" value="${item.amount > 0 ? item.amount : ''}" placeholder="0" min="0" step="any">
        </div>
      `;
      inputsList.appendChild(row);
    });

    inputsList.querySelectorAll('.asset-num-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        const val = parseFloat(e.target.value) || 0;
        sips[idx].amount = val;
        try {
          localStorage.setItem('leo_monthly_sips_template', JSON.stringify(sips));
        } catch (err) {}
        updateGeneratedPrompt();
      });
    });

    updateGeneratedPrompt();
  }

  function updateGeneratedPrompt() {
    const chosenMonth = monthSelect ? monthSelect.value : '';
    const chosenYear = yearSelect ? yearSelect.value : '';
    const parts = sips
      .filter(item => item.amount > 0)
      .map(item => `${item.amount} to ${item.name}`);

    const yearSuffix = chosenYear ? ` ${chosenYear}` : '';
    outputTextarea.value = parts.length > 0 ? `For ${chosenMonth}${yearSuffix} - ${parts.join(', ')}` : '';

    const total = sips.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalEl = document.getElementById('sidebarTotalAmount');
    if (totalEl) totalEl.textContent = `Total: ₹${total.toLocaleString('en-IN')}`;
  }

  monthSelect.addEventListener('change', updateGeneratedPrompt);

  openBtn.addEventListener('click', () => {
    syncAssetsFromCloud();
    renderInputs();
    overlay.classList.add('active');
    lucide.createIcons();
  });

  closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  // Copy to clipboard
  copyBtn.addEventListener('click', async () => {
    const text = outputTextarea.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied update prompt to clipboard! 📋');
    } catch (err) {
      outputTextarea.select();
      document.execCommand('copy');
      showToast('Copied to clipboard! 📋');
    }
  });

  // Send directly to Leo
  sendBtn.addEventListener('click', () => {
    const text = outputTextarea.value;
    if (!text) return;
    overlay.classList.remove('active');
    chatInput.value = text;
    chatForm.dispatchEvent(new Event('submit'));
  });

  renderInputs();
}

// Initialization

window.addEventListener('DOMContentLoaded', async () => {
  // Pre-load fresh data in background for instant responsiveness
  getHabitsState(true);
  fetchInvestCloudState(true);
  fetchExpenseCloudState(true);
  initMonthlyUpdateSidebar();
  checkReminders();
});
