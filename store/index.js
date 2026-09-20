import { clearState, loadState, saveState } from '@/utils/storage'
import { createId } from '@/utils/id'
import { startOfDay, toYmd } from '@/utils/date'
import { getAchievementSnapshot } from '@/utils/achievements'
import { getSmartAdvice } from '@/utils/smartAdvice'
import { isLoggedIn } from '@/utils/authSession'
import { pruneSharedRecords } from '@/utils/socialApi'
function defaultSettings() {
	return {
		weightKg: null,
		weeklyMinutesGoal: 150,
		weeklyRunPlan: [],
		// 心率区间计算
		maxHr: null,      // 最大心率，用于计算区间
		age: null          // 年龄，未填最大心率时用 220-年龄 估算
	}
}

function normalizeRecord(input) {
	const now = new Date().toISOString()
	const record = {
		id: input && input.id ? input.id : createId('sport'),
		type: input && input.type ? input.type : '跑步',
		runSubtype: input && input.runSubtype ? input.runSubtype : '',
		perceivedEffort: input && input.perceivedEffort != null ? Number(input.perceivedEffort) : null,
		shoes: input && input.shoes ? String(input.shoes) : '',
		avgHr: input && input.avgHr != null && input.avgHr !== '' ? Number(input.avgHr) : null,
		maxHr: input && input.maxHr != null && input.maxHr !== '' ? Number(input.maxHr) : null,
		startAt: input && input.startAt ? input.startAt : now,
		durationMin: Number(input && input.durationMin != null ? input.durationMin : 30) || 0,
		distanceKm: input && input.distanceKm != null && input.distanceKm !== '' ? Number(input.distanceKm) : null,
		calories: input && input.calories != null && input.calories !== '' ? Number(input.calories) : null,
		paceSecPerKm: input && input.paceSecPerKm != null ? Number(input.paceSecPerKm) : null,
		note: input && input.note ? String(input.note) : '',
		checkInImage:
			input && input.checkInImage != null && String(input.checkInImage).trim()
				? String(input.checkInImage)
				: '',
		createdAt: input && input.createdAt ? input.createdAt : now,
		updatedAt: now
	}
	// 如果是跑步且有距离和体重，且没填卡路里，则根据体重和距离估算热量（约 1 kcal/kg/km）
	if (record.type === '跑步' && record.distanceKm != null && (record.calories == null || Number.isNaN(record.calories))) {
		const w = input && input.weightKg != null ? Number(input.weightKg) : null
		if (w && Number.isFinite(w)) {
			record.calories = Math.round(w * record.distanceKm)
		}
	}
	// 如果有距离和时长，自动算配速（秒/公里）
	if (record.distanceKm && record.durationMin) {
		const totalSec = Number(record.durationMin) * 60
		if (totalSec > 0) {
			record.paceSecPerKm = Math.round(totalSec / Number(record.distanceKm))
		}
	}
	return record
}

function buildPersistedState(state) {
	return {
		records: state.records,
		settings: state.settings
	}
}

function persist(state) {
	saveState(buildPersistedState(state))
}

// #ifndef VUE3
import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)
const store = new Vuex.Store({
// #endif

// #ifdef VUE3
import { createStore } from 'vuex'
const store = createStore({
// #endif
	state: {
		records: [],
		settings: defaultSettings(),
		lastSavedRecord: null
	},
	getters: {
		recordsSorted(state) {
			return [...state.records].sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
		},
		weeklyRunPlan(state) {
			// 确保 plan 始终是数组
			return Array.isArray(state.settings.weeklyRunPlan) ? state.settings.weeklyRunPlan : []
		},
		// 用于心率区间计算的 maxHr：优先用设置值，否则用 220-年龄，否则默认 190
		effectiveMaxHr(state) {
			const max = state.settings.maxHr != null ? Number(state.settings.maxHr) : null
			if (Number.isFinite(max) && max > 0) return Math.round(max)
			const age = state.settings.age != null ? Number(state.settings.age) : null
			if (Number.isFinite(age) && age > 0 && age < 120) return Math.round(220 - age)
			return 190
		},
		todaySummary(state) {
			const dayStart = startOfDay(new Date()).getTime()
			const dayEnd = dayStart + 24 * 60 * 60 * 1000
			const today = state.records.filter(r => {
				const t = new Date(r.startAt).getTime()
				return t >= dayStart && t < dayEnd
			})
			const runOnly = today.filter(r => r.type === '跑步')
			const minutes = runOnly.reduce((sum, r) => sum + (Number(r.durationMin) || 0), 0)
			const distanceKm = runOnly.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0)
			const calories = runOnly.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
			return {
				count: today.length,
				minutes,
				distanceKm: distanceKm || 0,
				calories: calories || 0
			}
		},
		weeklyPlanProgress(state, getters) {
			const plan = getters.weeklyRunPlan
			if (!plan.length) {
				return {
					totalSessions: 0,
					completedSessions: 0,
					nextSession: null
				}
			}
			const now = new Date()
			const todayYmd = toYmd(now)
			const monday = startOfDay(new Date())
			const day = monday.getDay() || 7
			monday.setDate(monday.getDate() - (day - 1))
			const start = monday.getTime()
			const end = start + 7 * 24 * 60 * 60 * 1000

			const weekRuns = state.records.filter(r => {
				if (r.type !== '跑步') return false
				const t = new Date(r.startAt).getTime()
				return t >= start && t < end
			})

			const byDay = new Map()
			weekRuns.forEach(r => {
				const ymd = toYmd(r.startAt)
				if (!byDay.has(ymd)) byDay.set(ymd, [])
				byDay.get(ymd).push(r)
			})

			const sessions = plan.map((p) => {
				const targetWeekday = p.weekday
				const diff = targetWeekday - 1
				const date = new Date(start + diff * 24 * 60 * 60 * 1000)
				const ymd = toYmd(date)
				const runs = byDay.get(ymd) || []
				let done = false
				if (p.targetMinutes) {
					const totalMin = runs.reduce((sum, r) => sum + (Number(r.durationMin) || 0), 0)
					done = totalMin >= p.targetMinutes
				} else if (p.targetDistanceKm) {
					const totalKm = runs.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0)
					done = totalKm >= p.targetDistanceKm
				} else {
					done = runs.length > 0
				}
				return {
					...p,
					dateYmd: ymd,
					done,
					isToday: ymd === todayYmd
				}
			})

			const completedSessions = sessions.filter(s => s.done).length
			const totalSessions = sessions.length

			let nextSession = null
			const upcoming = sessions
				.filter(s => !s.done)
				.sort((a, b) => a.weekday - b.weekday)
			if (upcoming.length) {
				nextSession = upcoming[0]
			}
			return { totalSessions, completedSessions, nextSession, sessions }
		},
		achievementSnapshot(state) {
			return getAchievementSnapshot(state.records)
		},
		smartAdvice(state) {
			return getSmartAdvice({ records: state.records, settings: state.settings })
		}
	},
	mutations: {
		initFromStorage(state) {
			const saved = loadState()
			if (!saved) return
			if (Array.isArray(saved.records)) state.records = saved.records
			if (saved.settings) state.settings = { ...defaultSettings(), ...saved.settings }
		},
		reloadFromStorage(state) {
			const saved = loadState()
			if (!saved) {
				state.records = []
				state.settings = defaultSettings()
				state.lastSavedRecord = null
				return
			}
			state.records = Array.isArray(saved.records) ? saved.records : []
			state.settings = saved.settings ? { ...defaultSettings(), ...saved.settings } : defaultSettings()
			state.lastSavedRecord = null
		},
		initFromCloud(state, { records, settings }) {
			if (Array.isArray(records)) state.records = records
			if (settings) state.settings = { ...defaultSettings(), ...settings }
			persist(state)
		},
		addRecord(state, payload) {
			const record = normalizeRecord(payload)
			state.records = [record, ...state.records]
			state.lastSavedRecord = record
			persist(state)
		},
		updateRecord(state, payload) {
			const record = normalizeRecord(payload)
			const idx = state.records.findIndex(r => r.id === record.id)
			if (idx === -1) {
				state.records = [record, ...state.records]
			} else {
				const next = [...state.records]
				next.splice(idx, 1, { ...next[idx], ...record })
				state.records = next
			}
			state.lastSavedRecord = state.records.find(r => r.id === record.id) || record
			persist(state)
		},
		deleteRecord(state, id) {
			state.records = state.records.filter(r => r.id !== id)
			persist(state)
		},
		setSettings(state, partial) {
			state.settings = { ...state.settings, ...partial }
			persist(state)
		},
		resetAll(state) {
			state.records = []
			state.settings = defaultSettings()
			state.lastSavedRecord = null
			clearState()
		}
	},
	actions: {
		async sportInit({ commit, state }) {
			commit('initFromStorage')
			if (isLoggedIn()) {
				try {
					await pruneSharedRecords(state.records)
				} catch (e) {}
			}
		}
	}
})

export default store
