/**
 * ContentTranslation Tools
 * A tool that allows editors to translate pages from one language
 * to another with the help of machine translation and other translation tools
 *
 * @file
 * @ingroup Extensions
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */
( function ( $, mw ) {
	'use strict';

	var template = '<div class="card mtabuse">' +
		'<h2 class="card__mtabuse-title"></h2>' +
		'<div class="card__mtabuse-details"></div>' +
		'<div class="card__mtabuse-link"></div>' +
		'</div>';

	function MTAbuseCard() {
		this.$card = $( template );
		this.render();
	}

	MTAbuseCard.prototype.render = function () {
		var uri = new mw.Uri(),
			domainTemplate = mw.config.get( 'wgContentTranslationDomainTemplate' );

		this.$card.find( '.card__mtabuse-details' )
			.text( mw.msg( 'cx-mt-abuse-warning-text' ) );
		uri.host = domainTemplate.replace( '$1', mw.cx.targetLanguage );
		uri.path = mw.config.get( 'wgScript' );
		uri.query = {
			// TODO: This must customizable per project
			title: 'Project:Translation#How_to_translate'
		};

		this.$card.find( '.card__mtabuse-link' )
			.append( $( '<a>' )
				.prop( {
					href: uri.toString(),
					target: '_blank'
				} )
				.text( mw.msg( 'cx-tools-view-guidelines' ) )
		);
	};

	MTAbuseCard.prototype.onShow = function () {
		mw.hook( 'mw.cx.tools.shown' ).fire( true );
	};

	MTAbuseCard.prototype.getCard = function () {
		return this.$card;
	};

	MTAbuseCard.prototype.start = function ( mtPercentage ) {
		this.$card.show();
		mtPercentage = parseInt( mtPercentage, 10 );
		this.$card.find( '.card__mtabuse-title' )
			.text( mw.msg( 'cx-mt-abuse-warning-title', mw.language.convertNumber( mtPercentage ) ) );
		this.onShow();
	};

	MTAbuseCard.prototype.stop = function () {
		this.$card.remove();
		mw.hook( 'mw.cx.tools.shown' ).fire( false );
	};

	MTAbuseCard.prototype.getTriggerEvents = function () {
		return [
			'mw.cx.warning.mtabuse'
		];
	};

	mw.cx.tools.mtabuse = MTAbuseCard;
}( jQuery, mediaWiki ) );