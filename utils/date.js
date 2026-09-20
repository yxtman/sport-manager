function pad2(n) {
	return String(n).padStart(2, '0')
}

export function toYmd(dateLike) {
	const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function startOfDay(dateLike) {
	const d = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike)
	d.setHours(0, 0, 0, 0)
	return d
}

export function daysAgo(n) {
	const d = new Date()
	d.setDate(d.getDate() - n)
	return d
}

