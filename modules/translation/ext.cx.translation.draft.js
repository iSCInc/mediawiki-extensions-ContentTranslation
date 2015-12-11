/*!
 * ContentTranslation - Save translation as draft
 *
 * @ingroup Extensions
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */
( function ( $, mw ) {
	'use strict';

	var timer;

	/**
	 * @class
	 */
	function ContentTranslationDraft() {
		this.$draft = null;
		this.disabled = false;
		this.$source = null;
		this.$translation = null;
		this.listen();
	}

	/**
	 * Initalize the draft storage.
	 *
	 * @return {jQuery.Promise}
	 */
	ContentTranslationDraft.prototype.init = function () {
		var self = this;
		// There is no known consumer for this return value. Just returning it
		// to help testing in future.
		return this.find().then( function ( translation ) {
			if ( !translation ) {
				return false;
			}
			// If this translation is draft and not by current user, there is an
			// existing translation.
			if ( translation.translatorName !== mw.user.getName() &&
				translation.status === 'draft'
			) {
				self.showConflictWarning( translation );
				self.disabled = true;
				return false;
			}
			// Set the translationId
			mw.cx.translationId = translation.id;
			if ( translation.status !== 'deleted' ) {
				// Fetch the translation content
				return self.fetch();
			}
		} );
	};

	/**
	 * Get the content to save. Clean up the content by removing
	 * all unwanted classes and placeholders.
	 *
	 * @return {string} HTML to save
	 */
	ContentTranslationDraft.prototype.getContent = function () {
		var $content;

		if ( !this.$translation || !this.$translation.length ) {
			this.$translation = $( '.cx-column--translation .cx-column__content' );
		}
		$content = this.$translation.clone();
		// Remove placeholder sections
		$content.find( '.placeholder' ).remove();
		// Remove empty sections.
		$content.find( mw.cx.getSectionSelector() ).each( function () {
			var $section = $( this );

			if ( !$.trim( $section.text() ) && !$section.children().length ) {
				$section.remove();
			}
		} );
		// Remove all highlighting before saving
		$content
			.find( '.cx-highlight, .cx-highlight--blue, .cx-highlight--lightblue' )
			.removeClass( 'cx-highlight cx-highlight--blue cx-highlight--lightblue' );

		return $content.html();
	};

	function checkAndSave() {
		if ( mw.cx.dirty ) {
			mw.hook( 'mw.cx.translation.save' ).fire();
		}
	}

	/**
	 * Event bindings
	 */
	ContentTranslationDraft.prototype.listen = function () {
		mw.hook( 'mw.cx.translation.save' ).add( $.proxy( this.save, this ) );
		// Save the draft on progress events, but not in all progress
		// events. Use a few seconds delay.
		mw.hook( 'mw.cx.progress' ).add( $.debounce( 5000, checkAndSave ) );

		// Save when CTRL+S is pressed.
		$( document ).on( 'keydown', function ( e ) {
			// See https://medium.com/medium-eng/the-curious-case-of-disappearing-polish-s-fa398313d4df
			if ( ( e.metaKey || e.ctrlKey && !e.altKey ) && e.which === 83 ) {
				checkAndSave();
				return false;
			}
		} );
	};

	ContentTranslationDraft.prototype.showConflictWarning = function ( translation ) {
		mw.loader.using( 'ext.cx.translation.conflict' ).then( function () {
			mw.hook( 'mw.cx.translation.conflict' ).fire( translation );
		} );
	};

	/**
	 * Find if there is a draft existing for the current title and language pair.
	 *
	 * @return {jQuery.Promise}
	 */
	ContentTranslationDraft.prototype.find = function () {
		var api = new mw.Api();

		return api.get( {
			action: 'query',
			list: 'contenttranslation',
			sourcetitle: mw.cx.sourceTitle,
			from: mw.cx.sourceLanguage,
			to: mw.cx.targetLanguage,
			format: 'json'
		} ).then( function ( response ) {
			return response.query && response.query.contenttranslation.translation;
		} );
	};

	/**
	 * Fetch a draft content and restore it.
	 *
	 * @return {jQuery.Promise}
	 */
	ContentTranslationDraft.prototype.fetch = function () {
		var self = this,
			api = new mw.Api();

		mw.hook( 'mw.cx.draft.restoring' ).fire();

		return api.get( {
			action: 'query',
			list: 'contenttranslation',
			translationid: mw.cx.translationId,
			format: 'json'
		} ).then( function ( response ) {
			var translation, draftContent;

			translation = response.query.contenttranslation.translation;
			draftContent = translation.draftContent;

			self.$draft = $( draftContent );
			mw.hook( 'mw.cx.translation.placeholders.ready' ).add( function () {
				self.restore();
				mw.hook( 'mw.cx.draft.restored' ).fire();
			} );
		}, function ( errorCode, details ) {
			var uri = new mw.Uri();

			// Wrong draft id passed.
			delete uri.query.draft;
			location.href = uri.toString();

			if ( details.exception instanceof Error ) {
				details.exception = details.exception.toString();
			}
			details.errorCode = errorCode;
			mw.hook( 'mw.cx.draft.restore-failed' ).fire(
				mw.cx.sourceLanguage,
				mw.cx.targetLanguage,
				mw.cx.sourceTitle,
				this.targetTitle,
				JSON.stringify( details )
			);
		} );
	};

	/**
	 * Add an orphan translation. Orphan translation is a translation without
	 * source section. We add a dummy source section for such cases. Dummy source section
	 * is a placeholder - a white block in source column.
	 *
	 * @param {jQuery} $translation The translation to add.
	 * @param {jQuery} $section Add it before/after this section.
	 * @param {string} afterOrBefore Whether the orphan to be added after or before $section.
	 */
	ContentTranslationDraft.prototype.addOrphanTranslation = function ( $translation, $section, afterOrBefore ) {
		// Add a dummy source section
		var $dummySourceSection = $( '<' + $translation.prop( 'tagName' ) + '>' )
			.css( 'height', 1 ) // Non-zero height to avoid it ignored by keepAlignment plugin.
			.attr( 'id', $translation.data( 'source' ) );

		if ( afterOrBefore === 'after' ) {
			$( '#' + $section.data( 'source' ) ).after( $dummySourceSection );
			$section.after( $translation );
		} else {
			$( '#' + $section.data( 'source' ) ).before( $dummySourceSection );
			$section.before( $translation );
		}
		// Annotate the section to indicate it was restored from draft
		// so that certain adaptations can be skipped.
		$translation.attr( {
			id: 'cx' + $dummySourceSection.prop( 'id' ),
			'data-cx-draft': true,
			'data-source': $dummySourceSection.prop( 'id' )
		} ).keepAlignment();
		mw.hook( 'mw.cx.translation.postMT' ).fire( $translation );
	};

	/**
	 * Restore this draft to the appropriate placeholders
	 */
	ContentTranslationDraft.prototype.restore = function () {
		var i, j, $draftSection, sectionId, $section, $sourceSection,
			$placeholderSection, orphans = [],
			$lastPlaceholder;

		// We cannot populate this early because this ext.cx.translation.draft modules may be loaded before
		// source and target is ready.
		if ( !this.$source || !this.$source.length ) {
			this.$source = $( '.cx-column--source .cx-column__content' );
		}
		if ( !this.$translation || !this.$translation.length ) {
			this.$translation = $( '.cx-column--translation .cx-column__content' );
		}
		for ( i = 0; i < this.$draft.length; i++ ) {
			$draftSection = $( this.$draft[ i ] );
			sectionId = $draftSection.prop( 'id' );
			if ( !sectionId ) {
				// Is this possible?
				continue;
			}
			$placeholderSection = this.$translation.find( '#' + sectionId );
			$sourceSection = this.$source.find( '#' + $placeholderSection.data( 'source' ) );
			if ( !$placeholderSection.length ) {
				// Support old sections with sequential idendifiers
				$sourceSection = this.$source.find( '[data-seqid="' + $draftSection.data( 'source' ) + '"]' );
				$placeholderSection = this.$translation.find( '#cx' +
					$sourceSection.prop( 'id' )
				);
				sectionId = $placeholderSection.prop( 'id' );
				if ( sectionId ) {
					// Update the id of this old draft
					$draftSection.prop( 'id', sectionId );
				}
			}
			// If we still don't see the source section for this draft section, it means the
			// source article changed.
			if ( !$placeholderSection.length ) {
				mw.log( 'Source section not found for ' + $draftSection.prop( 'id' ) );
				orphans.push( $draftSection );
				continue;
			}

			$placeholderSection.replaceWith( $draftSection );
			// Get new section
			$section = this.$translation.find( '#' + sectionId );
			// Annotate the section to indicate it was restored from draft
			// so that certain adaptations can be skipped.
			$section.attr( {
				'data-cx-draft': true,
				'data-source': $sourceSection.prop( 'id' )
			} ).keepAlignment();
			mw.hook( 'mw.cx.translation.postMT' ).fire( $section );
			// We have a matching source and target section. Get all orphan backlog added.
			// We add them before this section.
			for ( j = 0; j < orphans.length; j++ ) {
				this.addOrphanTranslation( orphans[ j ], $section );
			}
			// Clear the orphans array
			orphans = [];
		}

		// Do we have any more orphans left out?
		if ( orphans.length === this.$draft.length ) {
			// Source article changed completely!
			for ( j = 0; j < orphans.length; j++ ) {
				// Add it after the first placeholder
				$placeholderSection = this.$translation.find( '.placeholder:first' );
				if ( $placeholderSection && $placeholderSection.length ) {
					sectionId = orphans[ j ].prop( 'id' );
					$sourceSection = this.$source.find( '#' + $placeholderSection.data( 'source' ) );
					$placeholderSection.replaceWith( orphans[ j ] );
					$section = this.$translation.find( '#' + sectionId );
					$section.attr( {
						id: 'cx' + $sourceSection.prop( 'id' ),
						'data-cx-draft': true,
						'data-source': $sourceSection.prop( 'id' )
					} ).keepAlignment();
					mw.hook( 'mw.cx.translation.postMT' ).fire( $section );
				} else {
					// We ran out of placeholders. Add orphan sections to end.
					this.addOrphanTranslation( orphans[ j ], $section, 'after' );
				}
			}
		} else {
			// Add it after the last placeholder
			$lastPlaceholder = this.$translation.find( '.placeholder:last' );
			for ( j = 0; j < orphans.length; j++ ) {
				// Add it after the last placeholder
				this.addOrphanTranslation( orphans[ j ], $lastPlaceholder, 'after' );
			}
		}

		mw.hook( 'mw.cx.translation.continued' ).fire(
			mw.cx.sourceLanguage,
			mw.cx.targetLanguage,
			mw.cx.sourceTitle
		);
	};

	/**
	 * Save the translation
	 */
	ContentTranslationDraft.prototype.save = function () {
		var targetTitle, params, apiParams, now,
			api = new mw.Api();

		if ( this.disabled ) {
			return;
		}
		targetTitle = $( '.cx-column--translation > h2' ).text();
		clearInterval( timer );
		params = {
			from: mw.cx.sourceLanguage,
			to: mw.cx.targetLanguage,
			sourcetitle: mw.cx.sourceTitle,
			title: targetTitle,
			html: EasyDeflate.deflate( this.getContent() ),
			status: 'draft',
			sourcerevision: mw.cx.sourceRevision,
			progress: JSON.stringify( mw.cx.getProgress() )
		};

		if ( !params.html ) {
			// There's no content to save,
			// but don't let the save initiator wait infinitely
			mw.hook( 'mw.cx.translation.saved' ).fire(
				mw.cx.sourceLanguage,
				mw.cx.targetLanguage,
				mw.cx.sourceTitle,
				targetTitle
			);

			return;
		}

		now = Date.now();
		apiParams = $.extend( {}, params, {
			assert: 'user',
			action: 'cxpublish'
		} );
		api.postWithToken( 'edit', apiParams, {
			timeout: 100 * 1000 // in milliseconds
		} ).done( function () {
			mw.hook( 'mw.cx.translation.saved' ).fire(
				mw.cx.sourceLanguage,
				mw.cx.targetLanguage,
				mw.cx.sourceTitle,
				targetTitle
			);
			timer = setInterval( function () {
				checkAndSave();
			}, 5 * 60 * 1000 );
		} ).fail( function ( errorCode, details ) {
			var extra;

			if ( errorCode === 'assertuserfailed' ) {
				mw.hook( 'mw.cx.error' ).fire( mw.msg( 'cx-lost-session-draft' ) );
			}

			extra = {
				d: Date.now() - now,
				s: params.html.length
			};
			// Hope these will be in the beginning of the string
			details = $.extend( extra, details );

			if ( details.exception instanceof Error ) {
				details.exception = details.exception.toString();
			}
			details.errorCode = errorCode;

			mw.hook( 'mw.cx.translation.save-failed' ).fire(
				mw.cx.sourceLanguage,
				mw.cx.targetLanguage,
				mw.cx.sourceTitle,
				this.targetTitle,
				JSON.stringify( details )
			);
		} );
	};

	mw.cx.ContentTranslationDraft = ContentTranslationDraft;
	$( function () {
		var draft,
			query = new mw.Uri().query;

		if ( mw.config.get( 'wgContentTranslationDatabase' ) === null ) {
			mw.log( 'The ext.cx.translation.draft module can only work if CX Database configured.' );
			return;
		}
		draft = new ContentTranslationDraft();
		if ( query.to && query.from && query.page ) {
			draft.init();
		}
	} );
}( jQuery, mediaWiki ) );
