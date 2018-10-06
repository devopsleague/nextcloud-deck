/*
 * @copyright Copyright (c) 2018 Julius Härtl <jus@bitgrid.net>
 *
 * @author Julius Härtl <jus@bitgrid.net>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global OC OCA */

import CommentCollection from '../legacy/commentcollection';
import CommentModel from '../legacy/commentmodel';

class ActivityController {
	constructor ($scope, CardService, ActivityService) {
		'ngInject';
		this.cardservice = CardService;
		this.activityservice = ActivityService;
		this.$scope = $scope;
		this.type = '';
		this.loading = false;
		this.status = {
			commentCreateLoading: false
		};
		this.$scope.newComment = '';

		const self = this;
		this.$scope.$watch(function () {
			return self.element.id;
		}, function (params) {
			if (self.getData(self.element.id).length === 0) {
				self.activityservice.loadComments(self.element.id);
				self.loading = true;
				self.fetchUntilResults();
			}
			self.activityservice.fetchNewerActivities(self.type, self.element.id).then(function () {});
		}, true);


		let $target = $('.newCommentForm .message');
		if (!$target) {
			return;
		}
		$target.atwho({
			at: "@",
			data:[{id: 'johndoe', label: 'John Doe'}],
			callbacks: {
				highlighter: function (li) {
					// misuse the highlighter callback to instead of
					// highlighting loads the avatars.
					var $li = $(li);
					$li.find('.avatar').avatar(undefined, 32);
					return $li;
				},
				sorter: function (q, items) { return items; }
			},
			displayTpl: function (item) {
				return '<li>' +
					'<span class="avatar-name-wrapper">' +
					'<span class="avatar" ' +
					'data-username="' + escapeHTML(item.id) + '" ' + // for avatars
					'data-user="' + escapeHTML(item.id) + '" ' + // for contactsmenu
					'data-user-display-name="' + escapeHTML(item.label) + '">' +
					'</span>' +
					'<strong>' + escapeHTML(item.label) + '</strong>' +
					'</span></li>';
			},
			insertTpl: function (item) {
				return '' +
					'<span class="avatar-name-wrapper">' +
					'<span class="avatar" ' +
					'data-username="' + escapeHTML(item.id) + '" ' + // for avatars
					'data-user="' + escapeHTML(item.id) + '" ' + // for contactsmenu
					'data-user-display-name="' + escapeHTML(item.label) + '">' +
					'</span>' +
					'<strong>' + escapeHTML(item.label) + '</strong>' +
					'</span>';
			},
			searchKey: "label"
		});
		$target.on('inserted.atwho', function (je, $el) {
			$(je.target).find(
				'span[data-username="' + $el.find('[data-username]').data('username') + '"]'
			).avatar();
		});
	}

	commentBodyToPlain(content) {
		let $comment = $('<div/>').html(content);
		$comment.find('.avatar-name-wrapper').each(function () {
			var $this = $(this);
			var $inserted = $this.parent();
			$inserted.html('@' + $this.find('.avatar').data('username'));
		});
		$comment.html(OCP.Comments.richToPlain($comment.html()));
		$comment.html($comment.html().replace(/<br\s*[\/]?>/gi, "\n"));
		return $comment.text();
	}

	static _composeHTMLMention(uid, displayName) {
		var avatar = '' +
			'<span class="avatar" ng-attr-size="16" ' +
			'ng-attr-user="' + _.escape(uid) + '" ' +
			'ng-attr-displayname="' + _.escape(displayName) + '">' +
			'</span>';

		var isCurrentUser = (uid === OC.getCurrentUser().uid);

		return '' +
			'<span class="atwho-inserted">' +
			'<span class="avatar-name-wrapper' + (isCurrentUser ? ' currentUser' : '') + '">' +
			avatar +
			'<strong>' + _.escape(displayName) + '</strong>' +
			'</span>' +
			'</span>';
	}

	formatMessage(activity) {
		let message = activity.message;
		let mentions = activity.commentModel.get('mentions');
		const editMode = false;
		message = escapeHTML(message).replace(/\n/g, '<br/>');

		for(var i in mentions) {
			if(!mentions.hasOwnProperty(i)) {
				return;
			}
			var mention = '@' + mentions[i].mentionId;
			// escape possible regex characters in the name
			mention = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

			const displayName = ActivityController._composeHTMLMention(mentions[i].mentionId, mentions[i].mentionDisplayName);
			// replace every mention either at the start of the input or after a whitespace
			// followed by a non-word character.
			message = message.replace(new RegExp("(^|\\s)(" + mention + ")\\b", 'g'),
				function(match, p1) {
					// to  get number of whitespaces (0 vs 1) right
					return p1+displayName;
				}
			);

		}
		if(editMode !== true) {
			message = OCP.Comments.plainToRich(message);
		}
		return message;
	}

	postComment() {
		const self = this;
		this.status.commentCreateLoading = true;

		let content = this.commentBodyToPlain(self.$scope.newComment);
		if (content.length < 1) {
			self.status.commentCreateLoading = false;
			OC.Notification.showTemporary(t('deck', 'Please provide a content for your comment.'));
			return;
		}
		var model = this.activityservice.commentCollection.create({
			actorId: OC.getCurrentUser().uid,
			actorDisplayName: OC.getCurrentUser().displayName,
			actorType: 'users',
			verb: 'comment',
			message: content,
			creationDateTime: (new Date()).toUTCString()
		}, {
			at: 0,
			// wait for real creation before adding
			wait: true,
			success: function() {
				self.$scope.newComment = '';
				self.activityservice.fetchNewerActivities(self.type, self.element.id).then(function () {});
				self.status.commentCreateLoading = false;
			},
			error: function() {
				self.status.commentCreateLoading = false;
				OC.Notification.showTemporary(t('deck', 'Posting the comment failed.'));
			}
		});
	}

	updateComment(item) {
		let newMessage = 'Edited at ' + (new Date());
		item.commentModel.save({
			message: newMessage,
		});
		item.message = newMessage;

	}

	deleteComment(item) {
		item.commentModel.destroy();
		item.deleted = true;
	}

	getCommentDetails() {}



	getData(id) {
		return this.activityservice.getData(this.type, id);
	}

	parseMessage(subject, parameters) {
		OCA.Activity.RichObjectStringParser._userLocalTemplate = '<span class="avatar-name-wrapper"><avatar ng-attr-contactsmenu ng-attr-tooltip ng-attr-user="{{ id }}" ng-attr-displayname="{{name}}" ng-attr-size="16"></avatar> {{ name }}</span>';
		return OCA.Activity.RichObjectStringParser.parseMessage(subject, parameters);
	}

	fetchUntilResults () {
		const self = this;
		let dataLengthBefore = self.getData(self.element.id).length;
		let _executeFetch = function() {
			let promise = self.activityservice.fetchMoreActivities(self.type, self.element.id);
			promise.then(function (data) {
				let dataLengthAfter = self.getData(self.element.id).length;
				if (data !== null && (dataLengthAfter <= dataLengthBefore || dataLengthAfter < self.activityservice.RESULT_PER_PAGE)) {
					_executeFetch();
				} else {
					self.loading = false;
				}
			}, function () {
				self.loading = false;
				self.$scope.$apply();
			});

		};
		_executeFetch();
	}

	getComments() {
		return this.activityservice.comments;
	}

	getActivityStream() {
		let activities = this.activityservice.getData(this.type, this.element.id);
		return activities;
	}

	page() {
		if (!this.activityservice.since[this.type][this.element.id].finished) {
			this.loading = true;
			this.fetchUntilResults();
		} else {
			this.loading = false;
		}
	}

	loadingNewer() {
		return this.activityservice.runningNewer;
	}

}

let activityComponent = {
	templateUrl: OC.linkTo('deck', 'templates/part.card.activity.html'),
	controller: ActivityController,
	bindings: {
		type: '@',
		element: '='
	}
};
export default activityComponent;
