<script>
export default {
	onLaunch: function() {
		if (this.$store && this.$store.dispatch) {
			this.$store.dispatch('sportInit')
		}
	}
}
</script>

<style lang="scss">
	@import '@/uni_modules/uni-scss/index.scss';

	page {
		background-color: #efeff4;
		height: 100%;
		font-size: 28rpx;
	}
</style>
