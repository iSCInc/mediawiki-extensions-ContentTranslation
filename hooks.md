Hooks defined in Content Translation
====================================

See also https://www.mediawiki.org/wiki/Content_translation/Front_end .

We use the mw.hooks wrapper of jQuery.Callbacks for achieving a subscriber-publisher events pattern. The hook names are prefixed with mw.cx as a convention.

# List of hooks

## mw.cx.success

Used for displaying a success message in the info bar. The message can be passed as the argument.

## mw.cx.error

Fired whenever an error occurs. The parameter is a string (message) that will be shown
in the info bar.

## mw.cx.error.anonuser

Fired when the frontend identifies that the user is anonymous.

## mw.cx.progress

Fired when the translation progress is recalculated.

## mw.cx.publish

Used to trigger the publish action. Optionally, key-value pairs of extra parameters to publising API can be passed.

## mw.cx.publish.captcha

Publishing module fires this when publishing failed because of a CAPTCHA question. A module can listen for this and present a form to the user to fill captcha. Once filled mw.cx.publish can be again fired with filled form parameters as arguments.

## mw.cx.search.link

This is fired when a link title is searched in tools search box. The search string is passed as an argument. Example subscribers are link and dictionary tools.

## mw.cx.search.word

This is fired when a word is searched in the tools search box. The search string is passed as an argument. Example subscribers are link and dictionary tools.

## mw.cx.select.link

This is fired when a link is clicked in the source or translation column. Example subscriber is link tool. Parameters:
* {string|jQuery} link The link element or target title.
* {string} [language] The language where the link points to.

## mw.cx.select.reference

This is fired when a reference is clicked in the source or translation column. Example subscriber is reference tool.
Parameters:

* {string} refNumber - The reference number. Example: [4]
* {string} reference - The reference content. Can be html.
* {jQuery} [$reference] - The jquery object related to reference. If passed,  the reference card give and option to delete it.
* {string} [language] - Language code of language where this reference exist.

## mw.cx.select.word

This is fired when a text is selected in the source or translation column. Example subscribers are link and dictionary tool. Parameters:
* {string} The selected text
* {string} [language] The language where the link points to.

## mw.cx.source.loaded

Fired when the source article content is loaded.

## mw.cx.source.ready

Fired when the source article content is ready from API, but not rendered at the source column.

## mw.cx.source.select

Fires when Special:CX is missing required parameters to start a translation, such as source language, source article title etc. Example subscriber is CX source selector module.

## mw.cx.tools.ready

Fires when the tools system is ready.

## mw.cx.tools.shown

Every tool card fires this when it is ready. Tools manager listen for this so that it can stop showing the loading indicator.

## mw.cx.translation.published

Fires when the article is published successfully. Example subsciber is event logging (analytics) module.

## mw.cx.translation.add

Used to trigger the pre-translation for a source section. Source section id is passed as argument. The translation module listens for this.

## mw.cx.translation.change

Fired when the translation section changed because of any reason.

## mw.cx.translation.clear

Fired when the translation section is cleared.

## mw.cx.translation.edit

Fired when translator edits the translation section, for example by typing.

## mw.cx.translation.focus

Fired when translation section receives focus.

## mw.cx.translation.postMT

Fired after the MT is used for the pre-translation. Link, image, template adaptation can listen for this.

## mw.cx.translation.ready

Fired when the translation column is rendered and ready. No subscribers yet.

## mw.cx.translation.updated

Fired when the translation section was updated using the MT card, for example with the 'restore' or 'use source text' actions.

## mw.cx.warning.mtabuse

Fired by the progress calculation module when the MT is beyond a threshold. The percentage of MT is passed as argument. The MT abuse tool card listens for this.