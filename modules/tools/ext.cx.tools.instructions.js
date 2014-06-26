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

	var template = '<div class="card instructions">' +
		'<div class="card__section">' +
		'<div class="tools serial number">' +
		'<div class="tools count one"></div></div>' +
		'<div class="instruction text">' +
		'<div class="text heading one"></div>' +
		'<div class="text description one"></div></div></div>' +
		'<div class="card__section">' +
		'<div class="tools serial number">' +
		'<div class="tools count two"></div></div>' +
		'<div class="instruction text">' +
		'<div class="text heading two"></div>' +
		'<div class="text description two"></div></div></div>' +
		'<div class="card__section">' +
		'<div class="tools serial number">' +
		'<div class="tools count three"></div></div>' +
		'<div class="instruction text">' +
		'<div class="text heading three"></div>' +
		'<div class="text description three"></div></div></div>' +
		'<div class="card__section guidelines"></div></div>';

	function InstructionsCard() {
		this.$card = $( template );
		this.render();
	}

	InstructionsCard.prototype.constructor = InstructionsCard;

	InstructionsCard.prototype.render = function () {
		var $guidelines;

		this.$card.find( '.tools.count.one' )
			.text( mw.language.convertNumber( 1 ) );
		this.$card.find( '.text.heading.one' )
			.text( mw.msg( 'cx-tools-instructions-text1' ) );
		this.$card.find( '.text.description.one' )
			.text( mw.msg( 'cx-tools-instructions-text2' ) );

		this.$card.find( '.tools.count.two' )
			.text( mw.language.convertNumber( 2 ) );
		this.$card.find( '.text.heading.two' )
			.text( mw.msg( 'cx-tools-instructions-text3' ) );
		this.$card.find( '.text.description.two' )
			.text( mw.msg( 'cx-tools-instructions-text4' ) );

		this.$card.find( '.tools.count.three' )
			.text( mw.language.convertNumber( 3 ) );
		this.$card.find( '.text.heading.three' )
			.text( mw.msg( 'cx-tools-instructions-text5' ) );
		this.$card.find( '.text.description.three' )
			.text( mw.msg( 'cx-tools-instructions-text6' ) );

		$guidelines = this.$card.find( '.card__section.guidelines' )
			.html(
				mw.message(
					'cx-tools-view-guidelines',
					mw.util.getUrl( 'Wikipedia:Translation#How_to_translate' )
				).parse()
			);

		// The <a> element is added by the message, which has [].
		// This makes the article open in a new tab (or window).
		$guidelines.find( 'a' ).prop( 'target', '_blank' );
	};

	InstructionsCard.prototype.getCard = function () {
		return this.$card;
	};

	InstructionsCard.prototype.start = function () {
		this.$card.show();
	};

	InstructionsCard.prototype.stop = function () {
		this.$card.remove();
	};

	InstructionsCard.prototype.getTriggerEvents = function () {
		return [
			'mw.cx.source.ready'
		];
	};

	mw.cx.tools.instructions = InstructionsCard;
}( jQuery, mediaWiki ) );
