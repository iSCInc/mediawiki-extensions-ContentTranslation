/*!
 * ContentTranslation Tools
 * A tool that allows editors to translate pages from one language
 * to another with the help of machine translation and other translation tools
 *
 * @ingroup Extensions
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */
( function ( $, mw ) {
	'use strict';

	/**
	 * Fetch the source content filter configuration
	 * for the given language pairs.
	 *
	 * @param {string} sourceLanguage
	 * @param {string} targetLanguage
	 * @return {jQuery.Promise}
	 */
	function fetchFilterConfiguration( sourceLanguage, targetLanguage ) {
		var api = new mw.Api();

		return api.get( {
			action: 'cxconfiguration',
			from: sourceLanguage,
			to: targetLanguage,
			format: 'json'
		} );
	}

	/**
	 * CXSourceFilter
	 *
	 * @class
	 */
	function CXSourceFilter( element ) {
		this.$container = $( element );
		this.configuration = null;
		this.listen();
	}

	/**
	 * Simple check for inline templates.
	 *
	 * @param {jQuery} $template
	 * @return {boolean} Whether the template is inline or not.
	 */
	function isInlineTemplate( $template ) {
		var aboutAttr;

		// We need to identify whether the template is a section or an inline element.
		// In CX the HTML elements that are considered as a section are defined in
		// mw.cx.getSectionSelector().
		if ( $template.is( mw.cx.getSectionSelector() ) ) {
			return false;
		}

		// See https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec#Transclusion_content
		aboutAttr = $template.attr( 'about' );

		if ( aboutAttr ) {
			// In a page, there will n number of elements with the same "about" attribute.
			// For templates, n is 2, from observation. There can be templates without an "about"
			// attribute, but such templates are self-contained, and already handled above.
			return !$( '[about="' + aboutAttr + '"]:eq( 1 )' ).is( mw.cx.getSectionSelector() );
		}

		return true;
	}

	/**
	 * Check if the template contains <references> transclusion in itself, in
	 * its children, or in the related elements.
	 *
	 * @param {jQuery} $template
	 * @return {boolean} Whether the template contains <references> or not.
	 */
	CXSourceFilter.prototype.hasReferences = function ( $template ) {
		var hasReference = false,
			$relatedElements = this.getRelatedElements( $template );

		$relatedElements.each( function () {
			if (
				$( this ).is( '[typeof~="mw:Extension/references"]' ) ||
				$( this ).find( '[typeof~="mw:Extension/references"]' ).length
			) {
				hasReference = true;
				return false;
			}
		} );

		return hasReference;
	};

	/**
	 * Filter the templates present in the source article based on the configuration.
	 *
	 * @param {Object} [configuration]
	 */
	CXSourceFilter.prototype.filter = function ( configuration ) {
		var sourceFilter = this;

		this.$container.find( '[typeof~="mw:Transclusion"]' ).each( function () {
			var title, mwData, templateName, templateConf,
				$template = $( this );

			mwData = $template.data( 'mw' );

			if ( !mwData ) {
				mw.log( '[CX] Skipping template!' );
				return;
			}

			if ( mwData.parts.length > 1 ) {
				// This is compound content block that include output from several transclusions
				// At present, we cannot provide edit support to them.
				// See https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec#Transclusion_content
				// An example:
				// {{Version |o |1.1}}{{efn-ua |Due to an incident ...<ref name="releases" />}}
				// in enwiki:Debian, Timeline table.
				mw.log( '[CX] Removing multi-part template' );
				sourceFilter.removeTemplate( $template );
				return;
			}

			templateName = mwData.parts[ 0 ].template.target.wt.trim();

			// Normalize the name
			title = mw.Title.newFromText( templateName );
			if ( title ) {
				templateName = title.getPrefixedText();
			}

			templateConf = configuration &&
				configuration.templates &&
				configuration.templates[ templateName ];

			if ( templateConf ) {
				mw.log( '[CX] Keeping template: ' + templateName );
				$template.attr( {
					'data-editable': templateConf.editable,
					'data-template-mapping': JSON.stringify( templateConf )
				} );

				return;
			}

			if ( isInlineTemplate( $template ) ) {
				mw.log( '[CX] Keeping inline template: ' + templateName );
				return;
			}
			// Check whether this template contains <references>.
			// If so, let it pass even without being whitelisted in the template configuration
			// because we want references to appear in the published translation.
			if ( sourceFilter.hasReferences( $template ) ) {
				mw.log( '[CX] Keeping references transclusion: ' + templateName );
			} else {
				mw.log( '[CX] Removing template: ' + templateName );
				sourceFilter.removeTemplate( $template );
			}
		} );

		// Remove <timeline> sections.
		// Maybe in the future they can be adapted.
		this.$container.find( '[typeof~="mw:Extension/timeline"]' ).each( function () {
			mw.log( '[CX] Removing timeline.' );
			sourceFilter.removeTimeline( $( this ) );
		} );

		mw.hook( 'mw.cx.source.ready' ).fire();
	};

	/**
	 * Remove a template.
	 *
	 * @param {jQuery} $template The main element of the template.
	 */
	CXSourceFilter.prototype.removeTemplate = function ( $template ) {
		this.getRelatedElements( $template ).remove();
	};

	/**
	 * Remove a timeline.
	 *
	 * @param {jQuery} $timelineMap The <map> element of the timeline.
	 */
	CXSourceFilter.prototype.removeTimeline = function ( $timelineMap ) {
		this.getRelatedElements( $timelineMap ).remove();
	};

	/**
	 * Get a DOM element and all elements that are related to it
	 * according to the "about" attribute.
	 * See https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec#Transclusion_content .
	 *
	 * @param {jQuery} $element
	 */
	CXSourceFilter.prototype.getRelatedElements = function ( $element ) {
		var about;

		// Templates and some other special elements, such as <timeline>s,
		// are represented as DOM elements with a "data-parsoid" attribute,
		// and typeof attributes like mw:Transclusion or mw:Extensions.
		// Their actual content can be in a different DOM element.
		// All the related DOM have the 'about' attribute with the same value.
		about = $element.attr( 'about' );

		if ( about ) {
			// This will include the main element,
			// because all the elements in the group have the same "about" value.
			return this.$container.find( '[about="' + about + '"]' );
		}
		// If there is no about value, just return this element.
		return $element;
	};

	CXSourceFilter.prototype.listen = function () {
		var filter = this;

		// Fetch the configuration now, but use it once source is loaded
		fetchFilterConfiguration( mw.cx.sourceLanguage, mw.cx.targetLanguage )
			.done( function ( response ) {
				filter.configuration = response.configuration;
			} )
			.always( function () {
				mw.hook( 'mw.cx.source.loaded' ).add( function () {
					filter.filter( filter.configuration );
				} );
			} );
	};

	$.fn.cxFilterSource = function () {
		return this.each( function () {
			var $this = $( this ),
				data = $this.data( 'cxSourceFilter' );

			if ( !data ) {
				$this.data(
					'cxSourceFilter', ( data = new CXSourceFilter( this ) )
				);
			}
		} );
	};

	$.fn.cxSource.defaults = {};
}( jQuery, mediaWiki ) );
