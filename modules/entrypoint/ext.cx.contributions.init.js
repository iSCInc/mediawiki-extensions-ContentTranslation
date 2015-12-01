/*!
 * Provides entry point in Special:MyContributions
 *
 * @copyright See AUTHORS.txt
 * @license GPL-2.0+
 */
( function ( $ ) {
	'use strict';

	$( document ).ready( function () {
		var $element = $( '<span>' );

		$element.cxContributions();
		$( '#firstHeading' ).before( $element );
	} );

}( jQuery ) );
