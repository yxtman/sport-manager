export function createId(prefix = 'id') {
	const rand = Math.random().toString(36).slice(2, 10)
	return `${prefix}_${Date.now().toString(36)}_${rand}`
}

