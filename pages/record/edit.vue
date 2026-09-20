<template>
	<view class="page">
		<view class="card">
			<uni-forms ref="formRef" :model="form" label-width="90">
				<uni-forms-item label="类型" name="type" required>
					<uni-data-select v-model="form.type" :localdata="typeOptions" />
				</uni-forms-item>

				<view v-if="form.type === '跑步'">
					<uni-forms-item label="跑步方式" name="runSubtype">
						<uni-data-select v-model="form.runSubtype" :localdata="runSubtypeOptions" />
					</uni-forms-item>
					<uni-forms-item label="主观强度" name="perceivedEffort">
						<uni-data-select v-model="form.perceivedEffort" :localdata="effortOptions" />
					</uni-forms-item>
					<uni-forms-item label="平均心率" name="avgHr">
						<uni-easyinput v-model="form.avgHr" type="number" placeholder="例如 145，可选" />
					</uni-forms-item>
					<uni-forms-item label="最高心率" name="maxHr">
						<uni-easyinput v-model="form.maxHr" type="number" placeholder="例如 165，可选" />
					</uni-forms-item>
				</view>

				<uni-forms-item label="时间" name="startAt" required>
					<uni-datetime-picker v-model="form.startAt" type="datetime" return-type="string" />
				</uni-forms-item>

				<uni-forms-item label="时长(分)" name="durationMin" required>
					<uni-easyinput v-model="form.durationMin" type="number" placeholder="例如 30" />
				</uni-forms-item>

				<uni-forms-item label="距离(km)" name="distanceKm">
					<uni-easyinput v-model="form.distanceKm" type="number" placeholder="例如 5（跑步请尽量填写）" />
				</uni-forms-item>

				<uni-forms-item label="消耗(千卡)" name="calories">
					<uni-easyinput v-model="form.calories" type="number" placeholder="可选，留空则自动估算" />
				</uni-forms-item>

				<uni-forms-item v-if="form.type === '跑步'" label="跑鞋" name="shoes">
					<uni-easyinput v-model="form.shoes" placeholder="可记录你穿的跑鞋" />
				</uni-forms-item>

				<uni-forms-item label="打卡图" name="checkInImage">
					<view class="checkin">
						<view v-if="form.checkInImage" class="checkin__preview-wrap">
							<image class="checkin__preview" :src="form.checkInImage" mode="aspectFill" @tap="previewCheckIn" />
							<text class="checkin__remove" @tap.stop="removeCheckIn">移除</text>
						</view>
						<view v-else class="checkin__placeholder">可选，上传运动现场或截图留作打卡纪念</view>
						<button class="checkin__btn" type="default" size="mini" @tap="pickCheckInImage">相册 / 拍照</button>
					</view>
				</uni-forms-item>

				<uni-forms-item label="备注" name="note">
					<uni-easyinput v-model="form.note" type="textarea" placeholder="可选" />
				</uni-forms-item>
			</uni-forms>
		</view>

		<view class="actions">
			<button class="primary" @tap="save">保存</button>
			<button v-if="editingId" class="ghost" @tap="remove">删除</button>
		</view>
	</view>
</template>

<script>
	import { feedbackSuccess } from '@/utils/uiFeedback.js'
	import { isLoggedIn } from '@/utils/authSession.js'
	import { syncSportRecord, deleteSportRecord } from '@/utils/socialApi.js'

	function pad2(n) {
		return String(n).padStart(2, '0')
	}

	function toPickerString(isoOrDate) {
		const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
		const yyyy = d.getFullYear()
		const mm = pad2(d.getMonth() + 1)
		const dd = pad2(d.getDate())
		const hh = pad2(d.getHours())
		const mi = pad2(d.getMinutes())
		const ss = pad2(d.getSeconds())
		return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
	}

	function toIsoFromPickerString(s) {
		if (!s) return new Date().toISOString()
		const normalized = String(s).replace('T', ' ')
		const [datePart, timePart = '00:00:00'] = normalized.split(' ')
		const [y, m, d] = datePart.split('-').map(v => parseInt(v, 10))
		const [hh, mi, ss] = timePart.split(':').map(v => parseInt(v, 10))
		const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mi || 0, ss || 0)
		return dt.toISOString()
	}

	export default {
		data() {
			return {
				editingId: '',
				typeOptions: [
					{ value: '跑步', text: '跑步' },
					{ value: '步行', text: '步行' },
					{ value: '骑行', text: '骑行' },
					{ value: '力量', text: '力量' },
					{ value: '游泳', text: '游泳' },
					{ value: '瑜伽', text: '瑜伽' },
					{ value: '其它', text: '其它' }
				],
				runSubtypeOptions: [
					{ value: '', text: '未分类' },
					{ value: '轻松跑', text: '轻松跑' },
					{ value: '间歇跑', text: '间歇跑' },
					{ value: '节奏跑', text: '节奏跑' },
					{ value: '长距离', text: '长距离' }
				],
				effortOptions: [
					{ value: 1, text: '1 很轻松' },
					{ value: 2, text: '2 稍微有点累' },
					{ value: 3, text: '3 中等偏累' },
					{ value: 4, text: '4 很累' },
					{ value: 5, text: '5 极限' }
				],
				form: {
					id: '',
					type: '跑步',
					startAt: toPickerString(new Date()),
					durationMin: '30',
					distanceKm: '',
					calories: '',
					runSubtype: '',
					perceivedEffort: null,
					avgHr: '',
					maxHr: '',
					shoes: '',
					checkInImage: '',
					note: ''
				}
			}
		},
		onLoad(options) {
			const id = options && options.id ? String(options.id) : ''
			if (id) {
				const record = (this.$store && this.$store.state && this.$store.state.records || []).find(r => r.id === id)
				if (record) {
					this.editingId = id
					this.form = {
						id: record.id,
						type: record.type || '跑步',
						startAt: toPickerString(record.startAt),
						durationMin: String(record.durationMin != null ? record.durationMin : ''),
						distanceKm: record.distanceKm != null ? String(record.distanceKm) : '',
						calories: record.calories != null ? String(record.calories) : '',
						runSubtype: record.runSubtype || '',
						perceivedEffort: record.perceivedEffort != null ? Number(record.perceivedEffort) : null,
						avgHr: record.avgHr != null ? String(record.avgHr) : '',
						maxHr: record.maxHr != null ? String(record.maxHr) : '',
						shoes: record.shoes || '',
						checkInImage: record.checkInImage || '',
						note: record.note || ''
					}
				}
				return
			}

			const preset = (options && options.preset) ? String(options.preset) : ''
			if (!preset) return

			if (preset === 'easy_run') {
				this.form.type = '跑步'
				this.form.runSubtype = '轻松跑'
				this.form.perceivedEffort = 2
				if (!this.form.durationMin || Number(this.form.durationMin) <= 0) this.form.durationMin = '30'
			} else if (preset === 'tempo_run') {
				this.form.type = '跑步'
				this.form.runSubtype = '节奏跑'
				this.form.perceivedEffort = 4
				if (!this.form.durationMin || Number(this.form.durationMin) <= 0) this.form.durationMin = '40'
			} else if (preset === 'recovery') {
				this.form.type = '步行'
				this.form.runSubtype = ''
				this.form.perceivedEffort = null
				if (!this.form.durationMin || Number(this.form.durationMin) <= 0) this.form.durationMin = '25'
			}

			const duration = options && options.durationMin != null ? Number(options.durationMin) : null
			if (Number.isFinite(duration) && duration > 0) {
				this.form.durationMin = String(Math.round(duration))
			}
		},
		methods: {
			pickCheckInImage() {
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						const temp = res.tempFilePaths && res.tempFilePaths[0]
						if (!temp) {
							uni.showToast({ title: '未选择图片', icon: 'none' })
							return
						}
						this.persistCheckInToBase64(temp)
					}
				})
			},
			persistCheckInToBase64(filePath) {
				// H5(浏览器) 下 getFileSystemManager/readFile 可能不可用或受限，直接使用临时路径展示与保存即可
				// App/小程序等仍尝试转 base64，方便离线与跨端展示
				const isH5 = typeof window !== 'undefined' && typeof document !== 'undefined'
				if (isH5) {
					this.form.checkInImage = filePath
					return
				}
				const afterRead = (path) => {
					const fs = uni.getFileSystemManager()
					fs.readFile({
						filePath: path,
						encoding: 'base64',
						success: (r) => {
							const b64 = typeof r.data === 'string' ? r.data : ''
							if (!b64) {
								uni.showToast({ title: '读取图片失败', icon: 'none' })
								return
							}
							const dataUrl = `data:image/jpeg;base64,${b64}`
							const maxLen = 2.2 * 1024 * 1024
							if (dataUrl.length > maxLen) {
								uni.showToast({ title: '图片过大，请换一张或裁剪后再试', icon: 'none' })
								return
							}
							this.form.checkInImage = dataUrl
						},
						fail: () => {
							uni.showToast({ title: '读取图片失败', icon: 'none' })
						}
					})
				}
				if (typeof uni.compressImage === 'function') {
					uni.compressImage({
						src: filePath,
						quality: 76,
						success: (c) => afterRead(c.tempFilePath || filePath),
						fail: () => afterRead(filePath)
					})
				} else {
					afterRead(filePath)
				}
			},
			previewCheckIn() {
				if (!this.form.checkInImage) return
				uni.previewImage({ urls: [this.form.checkInImage] })
			},
			removeCheckIn() {
				this.form.checkInImage = ''
			},
			save() {
				const duration = Number(this.form.durationMin)
				if (!this.form.type || !this.form.startAt || !Number.isFinite(duration) || duration <= 0) {
					uni.showToast({ title: '请填写类型、时间和时长', icon: 'none' })
					return
				}

				const payload = {
					id: this.form.id || undefined,
					type: this.form.type,
					startAt: toIsoFromPickerString(this.form.startAt),
					durationMin: duration,
					distanceKm: this.form.distanceKm === '' ? null : Number(this.form.distanceKm),
					calories: this.form.calories === '' ? null : Number(this.form.calories),
					runSubtype: this.form.type === '跑步' ? this.form.runSubtype : '',
					perceivedEffort: this.form.type === '跑步' && this.form.perceivedEffort != null ? Number(this.form.perceivedEffort) : null,
					avgHr: this.form.type === '跑步' && this.form.avgHr !== '' ? Number(this.form.avgHr) : null,
					maxHr: this.form.type === '跑步' && this.form.maxHr !== '' ? Number(this.form.maxHr) : null,
					shoes: this.form.type === '跑步' ? this.form.shoes : '',
					weightKg: this.$store && this.$store.state && this.$store.state.settings && this.$store.state.settings.weightKg != null
						? Number(this.$store.state.settings.weightKg)
						: null,
					checkInImage: this.form.checkInImage || '',
					note: this.form.note
				}

				if (this.editingId) this.$store.commit('updateRecord', payload)
				else this.$store.commit('addRecord', payload)

				const savedRecord = this.$store && this.$store.state && this.$store.state.lastSavedRecord
				if (isLoggedIn() && savedRecord) {
					syncSportRecord(savedRecord).catch(() => {})
				}

				feedbackSuccess('已保存')
				setTimeout(() => uni.navigateBack(), 350)
			},
			remove() {
				uni.showModal({
					title: '删除记录',
					content: '确定要删除这条记录吗？',
					success: (res) => {
						if (!res.confirm) return
						const recordId = this.editingId
						this.$store.commit('deleteRecord', recordId)
						if (isLoggedIn() && recordId) {
							deleteSportRecord(recordId).catch(() => {})
						}
						feedbackSuccess('已删除')
						setTimeout(() => uni.navigateBack(), 350)
					}
				})
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx 24rpx 32rpx 24rpx;
	}

	.card {
		background: #fff;
		border-radius: 16rpx;
		padding: 18rpx 16rpx 6rpx 16rpx;
	}

	.actions {
		margin-top: 18rpx;
		display: flex;
		gap: 16rpx;
	}

	.primary {
		flex: 1;
		background: #1e80ff;
		color: #fff;
		border-radius: 14rpx;
		font-weight: 700;
	}

	.ghost {
		width: 200rpx;
		background: #fff;
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.35);
		border-radius: 14rpx;
		font-weight: 700;
	}

	.checkin {
		display: flex;
		flex-direction: column;
		gap: 14rpx;
	}

	.checkin__preview-wrap {
		position: relative;
		width: 100%;
		max-width: 420rpx;
	}

	.checkin__preview {
		width: 100%;
		height: 280rpx;
		border-radius: 12rpx;
		background: #f3f4f6;
	}

	.checkin__remove {
		display: inline-block;
		margin-top: 8rpx;
		font-size: 26rpx;
		color: #ef4444;
	}

	.checkin__placeholder {
		font-size: 24rpx;
		color: #9ca3af;
		line-height: 1.5;
	}

	.checkin__btn {
		align-self: flex-start;
		background: #f3f4f6;
		color: #111827;
		border-radius: 10rpx;
	}
</style>
