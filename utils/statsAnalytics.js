import { daysAgo, startOfDay, toYmd } from '@/utils/date'

const DAY_MS = 24 * 60 * 60 * 1000

export const SPORT_TYPE_FILTERS = ['全部', '跑步', '步行', '骑行', '力量', '游泳', '瑜伽', '其它']

export const RANGE_OPTIONS = [
	{ key: 'week', label: '7天' },
	{ key: 'month', label: '30天' },
	{ key: 'year', label: '本年' }
]

export const TYPE_COLORS = {
	跑步: '#1e80ff',
	步行: '#64748b',
	骑行: '#10b981',
	力量: '#f59e0b',
	游泳: '#06b6d4',
	瑜伽: '#a855f7',
	其它: '#94a3b8'
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n))
}

export function getRangeMeta(rangeKey, now = new Date()) {
	const end = startOfDay(now).getTime() + DAY_MS
	if (rangeKey === 'year') {
		const year = now.getFullYear()
		const start = new Date(year, 0, 1).getTime()
		return {
			key: rangeKey,
			start,
			end,
			title: `${year} 年运动概览`,
			trendTitle: '月度运动趋势',
			bucket: 'month',
			dayCount: null
		}
	}
	const dayCount = rangeKey === 'month' ? 30 : 7
	const start = startOfDay(daysAgo(dayCount - 1)).getTime()
	return {
		key: rangeKey,
		start,
		end,
		title: rangeKey === 'month' ? '近 30 天运动概览' : '近 7 天运动概览',
		trendTitle: rangeKey === 'month' ? '每日运动趋势' : '每日运动趋势',
		bucket: 'day',
		dayCount
	}
}

export function filterRecordsByRange(records, rangeKey, typeFilter = '全部') {
	const { start, end } = getRangeMeta(rangeKey)
	return (records || []).filter((r) => {
		const t = new Date(r.startAt).getTime()
		if (t < start || t >= end) return false
		if (typeFilter !== '全部' && r.type !== typeFilter) return false
		return true
	})
}

export function computeSummary(list) {
	const minutes = list.reduce((sum, r) => sum + (Number(r.durationMin) || 0), 0)
	const distanceKm = list.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0)
	const calories = list.reduce((sum, r) => sum + (Number(r.calories) || 0), 0)
	const sessions = list.length
	const runList = list.filter((r) => r.type === '跑步' && r.distanceKm > 0 && r.durationMin > 0)
	let averagePaceSec = null
	if (runList.length) {
		const totalSec = runList.reduce((s, r) => s + Number(r.durationMin) * 60, 0)
		const totalKm = runList.reduce((s, r) => s + Number(r.distanceKm), 0)
		if (totalKm > 0) averagePaceSec = totalSec / totalKm
	}
	return {
		minutes: Math.round(minutes),
		distanceKm: Number(distanceKm.toFixed(2)),
		calories: Math.round(calories),
		sessions,
		averagePaceSec
	}
}

function formatShortLabel(ymd) {
	const parts = String(ymd).split('-')
	return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : ymd
}

export function computeDailyRows(records, rangeKey, typeFilter = '全部') {
	const meta = getRangeMeta(rangeKey)
	if (meta.bucket !== 'day') return []

	const map = new Map()
	for (let i = meta.dayCount - 1; i >= 0; i--) {
		const ymd = toYmd(daysAgo(i))
		map.set(ymd, 0)
	}
	filterRecordsByRange(records, rangeKey, typeFilter).forEach((r) => {
		const ymd = toYmd(r.startAt)
		if (!map.has(ymd)) return
		map.set(ymd, map.get(ymd) + (Number(r.durationMin) || 0))
	})
	const rows = Array.from(map.entries()).map(([ymd, minutes]) => ({
		ymd,
		label: formatShortLabel(ymd),
		minutes: Math.round(minutes)
	}))
	const max = Math.max(1, ...rows.map((r) => r.minutes))
	return rows.map((r) => ({ ...r, p: Math.round((r.minutes / max) * 100) }))
}

export function computeMonthlyRows(records, rangeKey, typeFilter = '全部') {
	const meta = getRangeMeta(rangeKey)
	if (meta.bucket !== 'month') return []

	const now = new Date()
	const year = now.getFullYear()
	const currentMonth = now.getMonth()
	const rows = []
	for (let m = 0; m <= currentMonth; m++) {
		rows.push({
			month: m + 1,
			label: `${m + 1}月`,
			minutes: 0
		})
	}
	filterRecordsByRange(records, rangeKey, typeFilter).forEach((r) => {
		const d = new Date(r.startAt)
		if (d.getFullYear() !== year) return
		const idx = d.getMonth()
		if (idx >= 0 && idx < rows.length) {
			rows[idx].minutes += Number(r.durationMin) || 0
		}
	})
	const normalized = rows.map((r) => ({ ...r, minutes: Math.round(r.minutes) }))
	const max = Math.max(1, ...normalized.map((r) => r.minutes))
	return normalized.map((r) => ({ ...r, p: Math.round((r.minutes / max) * 100) }))
}

export function buildTrendChartData(records, rangeKey, typeFilter = '全部') {
	const meta = getRangeMeta(rangeKey)
	const color = typeFilter === '全部' ? '#1e80ff' : TYPE_COLORS[typeFilter] || '#1e80ff'

	if (meta.bucket === 'month') {
		const rows = computeMonthlyRows(records, rangeKey, typeFilter)
		return {
			categories: rows.map((r) => r.label),
			series: [
				{
					name: '运动分钟',
					data: rows.map((r) => r.minutes),
					color
				}
			],
			chartType: 'column',
			hasData: rows.some((r) => r.minutes > 0)
		}
	}

	const rows = computeDailyRows(records, rangeKey, typeFilter)
	return {
		categories: rows.map((r) => r.label),
		series: [
			{
				name: '运动分钟',
				data: rows.map((r) => r.minutes),
				color
			}
		],
		chartType: 'area',
		hasData: rows.some((r) => r.minutes > 0),
		enableScroll: rows.length > 7
	}
}

export function buildTypeDistribution(records, rangeKey) {
	const list = filterRecordsByRange(records, rangeKey, '全部')
	const byType = new Map()
	list.forEach((r) => {
		const type = r.type || '其它'
		byType.set(type, (byType.get(type) || 0) + (Number(r.durationMin) || 0))
	})
	const series = [...byType.entries()]
		.filter(([, minutes]) => minutes > 0)
		.sort((a, b) => b[1] - a[1])
		.map(([name, minutes]) => ({
			name,
			data: Math.round(minutes),
			color: TYPE_COLORS[name] || '#94a3b8'
		}))
	return {
		series,
		hasData: series.length > 0,
		totalMinutes: series.reduce((s, item) => s + item.data, 0)
	}
}

export function computeGoalProgress(minutes, goalMinutes) {
	const goal = Number.isFinite(goalMinutes) && goalMinutes > 0 ? Math.round(goalMinutes) : 150
	const p = goal > 0 ? Math.round((minutes / goal) * 100) : 0
	return {
		goalMinutes: goal,
		progressPercent: clamp(p, 0, 100)
	}
}

export function computePaceZones(records, rangeKey, typeFilter = '全部') {
	if (typeFilter !== '全部' && typeFilter !== '跑步') {
		return { totalMinutes: 0, items: [] }
	}
	const zones = [
		{ name: 'Z1 慢走/恢复(≥7:00)', min: 7 * 60, max: Infinity },
		{ name: 'Z2 轻松跑(6:00–7:00)', min: 6 * 60, max: 7 * 60 },
		{ name: 'Z3 有氧(5:00–6:00)', min: 5 * 60, max: 6 * 60 },
		{ name: 'Z4 阈值(4:30–5:00)', min: 4.5 * 60, max: 5 * 60 },
		{ name: 'Z5 间歇(<4:30)', min: 0, max: 4.5 * 60 }
	]
	const list = filterRecordsByRange(records, rangeKey, '跑步').filter(
		(r) => r.paceSecPerKm && r.durationMin
	)
	const minutesByZone = zones.map(() => 0)
	list.forEach((r) => {
		const pace = Number(r.paceSecPerKm)
		const min = Number(r.durationMin) || 0
		if (!Number.isFinite(pace) || min <= 0) return
		const idx = zones.findIndex((z) => pace >= z.min && pace < z.max)
		if (idx >= 0) minutesByZone[idx] += min
	})
	const total = minutesByZone.reduce((s, v) => s + v, 0)
	if (!total) return { totalMinutes: 0, items: [] }
	const max = Math.max(...minutesByZone)
	const items = zones
		.map((z, i) => ({
			name: z.name,
			minutes: Math.round(minutesByZone[i]),
			p: max > 0 ? Math.round((minutesByZone[i] / max) * 100) : 0
		}))
		.filter((it) => it.minutes > 0)
	return { totalMinutes: total, items }
}

export function computeHrZones(records, rangeKey, maxHr, typeFilter = '全部') {
	if (typeFilter !== '全部' && typeFilter !== '跑步') {
		return { totalMinutes: 0, items: [] }
	}
	const effectiveMaxHr = maxHr || 190
	const zones = [
		{
			name: `Z1 恢复(50–60%) ${Math.round(effectiveMaxHr * 0.5)}–${Math.round(effectiveMaxHr * 0.6)}`,
			min: effectiveMaxHr * 0.5,
			max: effectiveMaxHr * 0.6
		},
		{
			name: `Z2 轻松(60–70%) ${Math.round(effectiveMaxHr * 0.6)}–${Math.round(effectiveMaxHr * 0.7)}`,
			min: effectiveMaxHr * 0.6,
			max: effectiveMaxHr * 0.7
		},
		{
			name: `Z3 有氧(70–80%) ${Math.round(effectiveMaxHr * 0.7)}–${Math.round(effectiveMaxHr * 0.8)}`,
			min: effectiveMaxHr * 0.7,
			max: effectiveMaxHr * 0.8
		},
		{
			name: `Z4 阈值(80–90%) ${Math.round(effectiveMaxHr * 0.8)}–${Math.round(effectiveMaxHr * 0.9)}`,
			min: effectiveMaxHr * 0.8,
			max: effectiveMaxHr * 0.9
		},
		{
			name: `Z5 最大(90–100%) ≥${Math.round(effectiveMaxHr * 0.9)}`,
			min: effectiveMaxHr * 0.9,
			max: Infinity
		}
	]
	const list = filterRecordsByRange(records, rangeKey, '跑步').filter((r) => r.avgHr && r.durationMin)
	const minutesByZone = zones.map(() => 0)
	list.forEach((r) => {
		const hr = Number(r.avgHr)
		const min = Number(r.durationMin) || 0
		if (!Number.isFinite(hr) || min <= 0) return
		const idx = zones.findIndex((z) => hr >= z.min && hr < z.max)
		if (idx >= 0) minutesByZone[idx] += min
	})
	const total = minutesByZone.reduce((s, v) => s + v, 0)
	if (!total) return { totalMinutes: 0, items: [] }
	const max = Math.max(...minutesByZone)
	const items = zones
		.map((z, i) => ({
			name: z.name,
			minutes: Math.round(minutesByZone[i]),
			p: max > 0 ? Math.round((minutesByZone[i] / max) * 100) : 0
		}))
		.filter((it) => it.minutes > 0)
	return { totalMinutes: total, items }
}

export function formatPace(secPerKm) {
	if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '--'
	const total = Math.round(secPerKm)
	const min = Math.floor(total / 60)
	const sec = total % 60
	return `${min}:${sec.toString().padStart(2, '0')} /km`
}
