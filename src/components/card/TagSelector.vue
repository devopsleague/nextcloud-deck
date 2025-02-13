<template>
	<div class="selector-wrapper" :aria-label="t('deck', 'Assign a tag to this card…')">
		<div class="selector-wrapper--icon">
			<TagMultiple :size="20" />
		</div>
		<NcMultiselect v-model="assignedLabels"
			class="selector-wrapper--selector"
			:multiple="true"
			:disabled="disabled"
			:options="labelsSorted"
			:placeholder="t('deck', 'Assign a tag to this card…')"
			:taggable="true"
			label="title"
			track-by="id"
			@select="onSelect"
			@remove="onRemove"
			@tag="onNewTag">
			<template #option="scope">
				<div :style="{ backgroundColor: '#' + scope.option.color, color: textColor(scope.option.color)}" class="tag">
					{{ scope.option.title }}
				</div>
			</template>
			<template #tag="scope">
				<div :style="{ backgroundColor: '#' + scope.option.color, color: textColor(scope.option.color)}" class="tag">
					{{ scope.option.title }}
				</div>
			</template>
		</NcMultiselect>
	</div>
</template>

<script>
import { NcMultiselect } from '@nextcloud/vue'
import Color from '../../mixins/color.js'
import TagMultiple from 'vue-material-design-icons/TagMultiple.vue'

export default {
	name: 'TagSelector',
	components: { TagMultiple, NcMultiselect },
	mixins: [Color],
	props: {
		card: {
			type: Object,
			default: null,
		},
		labels: {
			type: Array,
			default: () => [],
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			assignedLabels: null,
		}
	},
	computed: {
		labelsSorted() {
			return [...this.labels].sort((a, b) => (a.title < b.title) ? -1 : 1)
		},
	},
	watch: {
		card() {
			this.initialize()
		},
	},
	mounted() {
		this.initialize()
	},
	methods: {
		async initialize() {
			if (!this.card) {
				return
			}

			this.assignedLabels = [...this.card.labels].sort((a, b) => (a.title < b.title) ? -1 : 1)
		},
		onSelect(newLabel) {
			this.$emit('select', newLabel)
		},
		onRemove(removedLabel) {
			this.$emit('remove', removedLabel)
		},
		async onNewTag(name) {
			this.$emit('newtag', name)
		},
	},
}
</script>

<style lang="scss" scoped>
@import '../../css/selector';

.multiselect--active {
	z-index: 10022;
}

.tag {
	flex-grow: 0;
	flex-shrink: 1;
	overflow: hidden;
	padding: 0px 5px;
	border-radius: 15px;
	font-size: 85%;
	margin-right: 3px;
}
</style>
