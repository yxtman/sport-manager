import { daysAgo, startOfDay, toYmd } from '@/utils/date'

const DAY_MS = 24 * 60 * 60 * 1000

function sum(list, pick) {
	return (list || []).reduce((s, x) => s + (Number(pick(x)) || 0), 0)
}

function getWeekRange(now = new Date()) {
	const monday = startOfDay(new Date(now))
	const day = monday.getDay() || 7
	monday.setDate(monday.getDate() - (day - 1))
	const start = monday.getTime()
	const end = start + 7 * DAY_MS
	return { start, end }
}

function getRecentRecords(records, days) {
	const start = startOfDay(daysAgo(days - 1)).getTime()
	const end = startOfDay(new Date()).getTime() + DAY_MS
	return (records || []).filter((r) => {
		const t = new Date(r.startAt).getTime()
		return t >= start && t < end
	})
}

function inferIntensity(record) {
	const pe = record && record.perceivedEffort != null ? Number(record.perceivedEffort) : null
	if (Number.isFinite(pe) && pe >= 1 && pe <= 5) {
		if (pe >= 4) return 'high'
		if (pe >= 3) return 'medium'
		return 'low'
	}
	return 'unknown'
}

function getPreference(records, lookbackDays = 14) {
	const list = getRecentRecords(records, lookbackDays)
	if (!list.length) return { topType: '', topRunSubtype: '', runShare: 0 }

	const byType = new Map()
	const bySubtype = new Map()
	list.forEach((r) => {
		const t = r.type || '其它'
		byType.set(t, (byType.get(t) || 0) + 1)
		if (t === '跑步') {
			const st = (r.runSubtype || '').trim() || '未分类'
			bySubtype.set(st, (bySubtype.get(st) || 0) + 1)
		}
	})

	const total = list.length
	const runCount = byType.get('跑步') || 0

	const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0][0]
	const topRunSubtype = bySubtype.size
		? [...bySubtype.entries()].sort((a, b) => b[1] - a[1])[0][0]
		: ''
	return { topType, topRunSubtype, runShare: total ? runCount / total : 0 }
}

function countConsecutiveHighIntensityDays(records, lookbackDays = 7) {
	const list = getRecentRecords(records, lookbackDays)
	if (!list.length) return 0

	const byDay = new Map()
	list.forEach((r) => {
		const ymd = toYmd(r.startAt)
		if (!byDay.has(ymd)) byDay.set(ymd, [])
		byDay.get(ymd).push(r)
	})

	const days = [...byDay.keys()].sort()
	let streak = 0
	for (let i = days.length - 1; i >= 0; i--) {
		const dayRecords = byDay.get(days[i]) || []
		const hasHigh = dayRecords.some((r) => inferIntensity(r) === 'high')
		if (hasHigh) streak += 1
		else break
	}
	return streak
}

function getWeekRunMinutes(records) {
	const { start, end } = getWeekRange(new Date())
	const weekRuns = (records || []).filter((r) => {
		if (r.type !== '跑步') return false
		const t = new Date(r.startAt).getTime()
		return t >= start && t < end
	})
	return sum(weekRuns, (r) => r.durationMin)
}

function buildPresetUrl(preset, params = {}) {
	const qs = Object.keys(params)
		.filter((k) => params[k] != null && params[k] !== '')
		.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
		.join('&')
	return `/pages/record/edit?preset=${encodeURIComponent(preset)}${qs ? `&${qs}` : ''}`
}

export function getSmartAdvice({ records, settings }) {
	const advices = []
	const recs = records || []
	const goal = settings && settings.weeklyMinutesGoal != null ? Number(settings.weeklyMinutesGoal) : 150
	const goalMinutes = Number.isFinite(goal) && goal > 0 ? Math.round(goal) : 150

	const weekRunMinutes = Math.round(getWeekRunMinutes(recs))
	const remaining = Math.max(0, goalMinutes - weekRunMinutes)
	if (remaining > 0) {
		const sessions = Math.max(1, Math.ceil(remaining / 30))
		const each = Math.ceil(remaining / sessions)
		advices.push({
			id: 'weekly_goal',
			title: '本周跑步还差一点',
			level: remaining > 60 ? 'info' : 'tip',
			text: `本周距离 ${goalMinutes} 分钟目标还差 ${remaining} 分钟，建议再完成 ${sessions} 次约 ${each} 分钟的慢跑。`,
			actions: [
				{ label: '一键记录慢跑', url: buildPresetUrl('easy_run', { durationMin: each }) }
			]
		})
	} else {
		advices.push({
			id: 'weekly_goal_done',
			title: '本周目标已达成',
			level: 'good',
			text: `你已完成本周跑步目标（${weekRunMinutes}/${goalMinutes} 分钟）。可以安排一次轻松恢复跑或拉伸。`,
			actions: [{ label: '记录一次', url: buildPresetUrl('easy_run', { durationMin: 25 }) }]
		})
	}

	const highStreak = countConsecutiveHighIntensityDays(recs, 7)
	if (highStreak >= 2) {
		advices.push({
			id: 'recovery',
			title: '建议安排恢复训练',
			level: 'warn',
			text: `你已连续 ${highStreak} 天出现高强度训练（主观强度 4–5），建议今天安排 20–30 分钟轻松跑/步行或休息。`,
			actions: [{ label: '一键记录恢复', url: buildPresetUrl('recovery', { durationMin: 25 }) }]
		})
	}

	const pref = getPreference(recs, 14)
	if (pref.runShare >= 0.6) {
		const topSub = pref.topRunSubtype || ''
		if (topSub && topSub !== '节奏跑') {
			advices.push({
				id: 'try_tempo',
				title: '给跑步加点变化',
				level: 'tip',
				text: `你最近以「${topSub}」为主，建议本周尝试 1 次「节奏跑」来提升心肺（例如：热身 10 分 + 稳定节奏 15–20 分 + 放松 10 分）。`,
				actions: [{ label: '一键记录节奏跑', url: buildPresetUrl('tempo_run', { durationMin: 40 }) }]
			})
		} else if (!topSub) {
			advices.push({
				id: 'categorize_runs',
				title: '完善跑步分类更好分析',
				level: 'tip',
				text: '你最近跑步记录里「跑步方式」填写较少。建议记录时选择轻松跑/间歇跑/节奏跑/长距离，统计会更准确。',
				actions: [{ label: '去完善一条', url: '/pages/record/edit' }]
			})
		}
	}

	const last7 = getRecentRecords(recs, 7)
	const totalMinutes7 = Math.round(sum(last7, (r) => r.durationMin))
	if (last7.length === 0) {
		advices.unshift({
			id: 'start',
			title: '从第一条记录开始',
			level: 'tip',
			text: '你最近 7 天还没有运动记录。今天先来一条 20–30 分钟的轻松活动，把习惯重新建立起来。',
			actions: [{ label: '一键开始', url: buildPresetUrl('easy_run', { durationMin: 25 }) }]
		})
	} else if (totalMinutes7 < 60) {
		advices.push({
			id: 'low_volume',
			title: '运动量偏少',
			level: 'info',
			text: `近 7 天累计仅 ${totalMinutes7} 分钟。建议把本周拆成 2–3 次，每次 20–30 分钟更容易坚持。`,
			actions: [{ label: '一键记录 20 分钟', url: buildPresetUrl('easy_run', { durationMin: 20 }) }]
		})
	}

	const unique = new Map()
	advices.forEach((a) => {
		if (!unique.has(a.id)) unique.set(a.id, a)
	})

	return {
		weekRunMinutes,
		goalMinutes,
		items: [...unique.values()].slice(0, 4)
	}
}
