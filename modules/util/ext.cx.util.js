/*!
 * ContentTranslation extension
 * A tool that allows editors to translate pages from one language
 * to another with the help of machine translation and other translation
 *
 * @ingroup Extensions
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */
( function ( mw, $ ) {
	'use strict';

	/**
	 * Generate a jQuery selector for all possible sections.
	 *
	 * @return {string} the section selector string
	 */
	mw.cx.getSectionSelector = function () {
		var sectionTypes;

		sectionTypes = [
			'div', 'p',
			// tables
			'table', 'tbody', 'thead', 'tfoot', 'caption', 'th', 'tr', 'td',
			// lists
			'ul', 'ol', 'li', 'dl', 'dt', 'dd',
			// HTML5 heading content
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup',
			// HTML5 sectioning content
			'article', 'aside', 'body', 'nav', 'section', 'footer', 'header', 'figure',
			'figcaption', 'fieldset', 'details', 'blockquote',
			// other
			'hr', 'button', 'canvas', 'center', 'col', 'colgroup', 'embed',
			'map', 'object', 'pre', 'progress', 'video'
		];

		return sectionTypes.join( ',' );
	};

	/**
	 * Get the source section by a given Id. These Ids are generated
	 * by parsoid. Usually it is prefixed with 'mw'. But it is not
	 * guaranteed. Sometimes templates assign their own ids to sections.
	 * See T112253
	 *
	 * @param  {string} id Source section id.
	 * @return {jQuery}
	 */
	mw.cx.getSourceSection = function ( id ) {
		return $( document.getElementById( id ) );
	};

	/**
	 * Get the target section by a given source section Id.
	 *
	 * @param  {string} id Source section id.
	 * @return {jQuery}
	 */
	mw.cx.getTranslationSection = function ( id ) {
		return $( document.getElementById( 'cx' + id ) );
	};

	/**
	 * Return array with duplicate items removed
	 *
	 * @param {Array} list List of strings, numbers or boolean
	 * @return {Array}
	 */
	mw.cx.unique = function ( list ) {
		return $.grep( list, function ( v, k ) {
			return $.inArray( v, list ) === k;
		} );
	};
}( mediaWiki, jQuery ) );
