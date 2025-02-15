<!--
  - @copyright Copyright (c) 2020 Julius Härtl <jus@bitgrid.net>
  -
  - @author Julius Härtl <jus@bitgrid.net>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<div v-if="copiedCard">
		<TagSelector :card="card"
			:labels="currentBoard.labels"
			:disabled="!canEdit"
			@select="addLabelToCard"
			@remove="removeLabelFromCard"
			@newtag="addLabelToBoardAndCard" />

		<AssignmentSelector :card="card"
			:assignables="assignables"
			:can-edit="canEdit"
			@select="assignUserToCard"
			@remove="removeUserFromCard" />

		<DueDateSelector :card="card" :can-edit="canEdit && !saving" @change="updateCardDue" />

		<div v-if="projectsEnabled" class="section-wrapper">
			<CollectionList v-if="card.id"
				:id="`${card.id}`"
				:name="card.title"
				type="deck-card" />
		</div>

		<Description :key="card.id"
			:card="card"
			:can-edit="canEdit"
			show-attachments
			@change="descriptionChanged" />
	</div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import moment from '@nextcloud/moment'
import { loadState } from '@nextcloud/initial-state'

import { CollectionList } from 'nextcloud-vue-collections'
import Color from '../../mixins/color.js'
import {
	getLocale,
} from '@nextcloud/l10n'
import Description from './Description.vue'
import TagSelector from './TagSelector.vue'
import AssignmentSelector from './AssignmentSelector.vue'
import DueDateSelector from './DueDateSelector.vue'

export default {
	name: 'CardSidebarTabDetails',
	components: {
		DueDateSelector,
		AssignmentSelector,
		TagSelector,
		Description,
		CollectionList,
	},
	mixins: [Color],
	props: {
		card: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			saving: false,
			addedLabelToCard: null,
			copiedCard: null,
			locale: getLocale(),
			projectsEnabled: loadState('core', 'projects_enabled', false),
		}
	},
	computed: {
		...mapState({
			currentBoard: state => state.currentBoard,
		}),
		...mapGetters(['canEdit', 'assignables']),
		cardDetailsInModal: {
			get() {
				return this.$store.getters.config('cardDetailsInModal')
			},
			set(newValue) {
				this.$store.dispatch('setConfig', { cardDetailsInModal: newValue })
			},
		},

		labelsSorted() {
			return [...this.currentBoard.labels].sort((a, b) => (a.title < b.title) ? -1 : 1)
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
		descriptionChanged(newDesc) {
			this.$store.dispatch('updateCardDesc', { ...this.card, description: newDesc })
			this.copiedCard.description = newDesc
		},
		async initialize() {
			if (!this.card) {
				return
			}

			this.copiedCard = JSON.parse(JSON.stringify(this.card))
			localStorage.setItem('deck.selectedBoardId', this.currentBoard.id)
			localStorage.setItem('deck.selectedStackId', this.card.stackId)
		},

		async updateCardDue(val) {
			this.saving = true
			await this.$store.dispatch('updateCardDue', {
				...this.copiedCard,
				duedate: val ? (new Date(val)).toISOString() : null,
			})
			this.saving = false
		},

		assignUserToCard(user) {
			this.$store.dispatch('assignCardToUser', {
				card: this.copiedCard,
				assignee: {
					userId: user.uid,
					type: user.type,
				},
			})
		},

		removeUserFromCard(user) {
			this.$store.dispatch('removeUserFromCard', {
				card: this.copiedCard,
				assignee: {
					userId: user.uid,
					type: user.type,
				},
			})
		},

		addLabelToCard(newLabel) {
			this.copiedCard.labels.push(newLabel)
			const data = {
				card: this.copiedCard,
				labelId: newLabel.id,
			}
			this.$store.dispatch('addLabel', data)
		},

		async addLabelToBoardAndCard(name) {
			await this.$store.dispatch('addLabelToCurrentBoardAndCard', {
				card: this.copiedCard,
				newLabel: {
					title: name,
					color: this.randomColor(),
				},
			})
		},

		removeLabelFromCard(removedLabel) {
			const removeIndex = this.copiedCard.labels.findIndex((label) => {
				return label.id === removedLabel.id
			})
			if (removeIndex !== -1) {
				this.copiedCard.labels.splice(removeIndex, 1)
			}

			const data = {
				card: this.copiedCard,
				labelId: removedLabel.id,
			}
			this.$store.dispatch('removeLabel', data)
		},
		stringify(date) {
			return moment(date).locale(this.locale).format('LLL')
		},
		parse(value) {
			return moment(value).toDate()
		},
	},
}
</script>
<style lang="scss" scoped>

.section-wrapper:deep(.mx-datepicker-main.mx-datepicker-popup) {
	left: 0 !important;
}

.section-wrapper:deep(.mx-datepicker-main.mx-datepicker-popup.mx-datepicker-sidebar) {
	padding: 0 !important;
}

.section-wrapper {
	display: flex;
	max-width: 100%;
	margin-top: 10px;

	.section-label {
		background-position: 0px center;
		width: 28px;
		margin-left: 9px;
		flex-shrink: 0;
	}

	.section-details {
		flex-grow: 1;
		display: flex;
		flex-wrap: wrap;

		button.action-item--single {
			margin-top: -3px;
		}
	}
}

.avatarLabel {
	padding: 6px
}

.section-details:deep(.multiselect__tags-wrap) {
	flex-wrap: wrap;
}

.avatar-list--readonly .avatardiv {
	margin-right: 3px;
}

.avatarlist--inline {
	display: flex;
	align-items: center;
	margin-right: 3px;
	.avatarLabel {
		padding: 0;
	}
}

.multiselect:deep(.multiselect__tags-wrap) {
	z-index: 2;
}

.multiselect.multiselect--active:deep(.multiselect__tags-wrap) {
	z-index: 0;
}
</style>
<style>
.mx-datepicker-main.mx-datepicker-popup {
	/* above the modal */
	z-index: 9999 !important;
}
</style>
