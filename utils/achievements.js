import { startOfDay } from '@/utils/date'

const DAY_MS = 24 * 60 * 60 * 1000

export const ACHIEVEMENT_DEFS = [
	{
		id: 'first_record',
		title: '初出茅庐',
		description: '完成第 1 条运动记录',
		icon: '🌱',
		category: '打卡',
		type: 'count',
		target: 1,
		metric: 'records'
	},
	{
		id: 'record_5',
		title: '渐入佳境',
		description: '累计完成 5 条运动记录',
		icon: '🏅',
		category: '打卡',
		type: 'count',
		target: 5,
		metric: 'records'
	},
	{
		id: 'record_20',
		title: '运动达人',
		description: '累计完成 20 条运动记录',
		icon: '🏆',
		category: '打卡',
		type: 'count',
		target: 20,
		metric: 'records'
	},
	{
		id: 'streak_3',
		title: '三日坚持',
		description: '连续 3 天都有运动记录',
		icon: '🔥',
		category: '连续打卡',
		type: 'streak',
		target: 3,
		metric: 'streakDays'
	},
	{
		id: 'streak_7',
		title: '习惯养成',
		description: '连续 7 天都有运动记录',
		icon: '💪',
		category: '连续打卡',
		type: 'streak',
		target: 7,
		metric: 'streakDays'
	},
	{
		id: 'duration_30',
		title: '稳定输出',
		description: '单次运动时长达到 30 分钟',
		icon: '⏱️',
		category: '时长',
		type: 'single',
		target: 30,
		metric: 'singleDuration'
	},
	{
		id: 'duration_60',
		title: '耐力新星',
		description: '单次运动时长达到 60 分钟',
		icon: '🚀',
		category: '时长',
		type: 'single',
		target: 60,
		metric: 'singleDuration'
	},
	{
		id: 'minutes_300',
		title: '热身完成',
		description: '累计运动时长达到 300 分钟',
		icon: '🎯',
		category: '累计时长',
		type: 'sum',
		target: 300,
		metric: 'totalMinutes'
	},
	{
		id: 'calories_1000',
		title: '燃脂达人',
		description: '累计消耗达到 1000 千卡',
		icon: '🔥',
		category: '消耗',
		type: 'sum',
		target: 1000,
		metric: 'totalCalories'
	},
	{
		id: 'distance_20',
		title: '跑者进阶',
		description: '累计跑步距离达到 20 公里',
		icon: '👟',
		category: '跑步',
		type: 'sum',
		target: 20,
		metric: 'runDistance'
	}
]

function normalizeRecords(records) {
	return [...(records || [])].sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
}

function getRecordDayMs(record) {
	return startOfDay(record.startAt).getTime()
}

function buildStats(records) {
	const list = normalizeRecords(records)
	const uniqueDays = []
	const daySet = new Set()

	let totalMinutes = 0
	let totalCalories = 0
	let runDistance = 0
	let singleDuration = 0
	let currentStreak = 0
	let bestStreak = 0
	let maxProgressDate = null
	const unlockAt = {}

	list.forEach((r) => {
		const dayMs = getRecordDayMs(r)
		if (!daySet.has(dayMs)) {
			daySet.add(dayMs)
			uniqueDays.push(dayMs)
		}

		const duration = Number(r.durationMin) || 0
		const calories = Number(r.calories) || 0
		const distanceKm = r.type === '跑步' ? (Number(r.distanceKm) || 0) : 0

		totalMinutes += duration
		totalCalories += calories
		runDistance += distanceKm
		singleDuration = Math.max(singleDuration, duration)

		if (duration >= 30 && !unlockAt.duration_30) unlockAt.duration_30 = r.startAt
		if (duration >= 60 && !unlockAt.duration_60) unlockAt.duration_60 = r.startAt
		if (totalMinutes >= 300 && !unlockAt.minutes_300) unlockAt.minutes_300 = r.startAt
		if (totalCalories >= 1000 && !unlockAt.calories_1000) unlockAt.calories_1000 = r.startAt
		if (runDistance >= 20 && !unlockAt.distance_20) unlockAt.distance_20 = r.startAt
	})

	if (list.length > 0) {
		unlockAt.first_record = list[0].startAt
	}
	if (list.length >= 5) {
		unlockAt.record_5 = list[4].startAt
	}
	if (list.length >= 20) {
		unlockAt.record_20 = list[19].startAt
	}

	let streak = 0
	let prevDayMs = null
	uniqueDays.forEach((dayMs) => {
		if (prevDayMs == null) {
			streak = 1
		} else if (dayMs - prevDayMs === DAY_MS) {
			streak += 1
		} else {
			streak = 1
		}
		if (streak > bestStreak) {
			bestStreak = streak
			maxProgressDate = dayMs
		}
		if (streak >= 3 && !unlockAt.streak_3) unlockAt.streak_3 = new Date(dayMs).toISOString()
		if (streak >= 7 && !unlockAt.streak_7) unlockAt.streak_7 = new Date(dayMs).toISOString()
		prevDayMs = dayMs
	})

	if (uniqueDays.length) {
		let tail = 1
		for (let i = uniqueDays.length - 1; i > 0; i--) {
			if (uniqueDays[i] - uniqueDays[i - 1] === DAY_MS) tail += 1
			else break
		}
		currentStreak = tail
	}

	return {
		records: list.length,
		totalMinutes: Math.round(totalMinutes),
		totalCalories: Math.round(totalCalories),
		runDistance: Number(runDistance.toFixed(2)),
		singleDuration: Math.round(singleDuration),
		streakDays: currentStreak,
		bestStreakDays: bestStreak,
		bestStreakReachedAt: maxProgressDate ? new Date(maxProgressDate).toISOString() : '',
		unlockAt
	}
}

function getProgressValue(def, stats) {
	const value = Number(stats[def.metric]) || 0
	if (def.type === 'single') return Math.round(value)
	if (def.metric === 'runDistance') return Number(value.toFixed(2))
	return Math.round(value)
}

function formatUnlockTime(iso) {
	if (!iso) return ''
	const d = new Date(iso)
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

export function getAchievementSnapshot(records) {
	const stats = buildStats(records)
	const achievements = ACHIEVEMENT_DEFS.map((def) => {
		const current = getProgressValue(def, stats)
		const unlockedAt = stats.unlockAt[def.id] || ''
		const unlocked = !!unlockedAt
		const progressPercent = def.target > 0 ? Math.min(100, Math.round((current / def.target) * 100)) : 0
		return {
			...def,
			current,
			unlocked,
			unlockedAt,
			unlockedDateText: formatUnlockTime(unlockedAt),
			progressPercent
		}
	})

	const unlockedList = achievements.filter((a) => a.unlocked)
	const lockedList = achievements.filter((a) => !a.unlocked)
	const recentUnlocked = [...unlockedList]
		.sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
		.slice(0, 3)

	return {
		stats,
		achievements,
		unlockedCount: unlockedList.length,
		totalCount: achievements.length,
		completionPercent: achievements.length ? Math.round((unlockedList.length / achievements.length) * 100) : 0,
		unlockedList,
		lockedList,
		recentUnlocked
	}
}
