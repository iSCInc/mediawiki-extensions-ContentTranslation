<?php
/**
 * ContentTranslation Translation
 */
namespace ContentTranslation;

class Translation {
	private $lastSaveWasCreate = false;

	function __construct( $translation ) {
		$this->translation = $translation;
	}

	public function create() {
		$dbw = Database::getConnection( DB_MASTER );

		$values = [
			'translation_source_title' => $this->translation['sourceTitle'],
			'translation_target_title' => $this->translation['targetTitle'],
			'translation_source_language' => $this->translation['sourceLanguage'],
			'translation_target_language' => $this->translation['targetLanguage'],
			'translation_source_revision_id' => $this->translation['sourceRevisionId'],
			'translation_source_url' => $this->translation['sourceURL'],
			'translation_status' => $this->translation['status'],
			'translation_last_updated_timestamp' => $dbw->timestamp(),
			'translation_progress' => $this->translation['progress'],
			'translation_last_update_by' => $this->translation['lastUpdatedTranslator'],
		];

		$values['translation_start_timestamp'] = $dbw->timestamp();
		$values['translation_started_by'] = $this->translation['startedTranslator'];

		if ( $this->translation['status'] === 'published' ) {
			$values['translation_target_url'] = $this->translation['targetURL'];
			$values['translation_target_revision_id'] = $this->translation['targetRevisionId'];
		}

		$dbw->insert(
			'cx_translations',
			$values,
			__METHOD__
		);

		$this->translation['id'] = (int)$dbw->insertId();
	}

	public function update( array $options = null ) {
		$dbw = Database::getConnection( DB_MASTER );

		$values = [
			'translation_target_title' => $this->translation['targetTitle'],
			'translation_source_revision_id' => $this->translation['sourceRevisionId'],
			'translation_source_url' => $this->translation['sourceURL'],
			'translation_status' => $this->translation['status'],
			'translation_last_updated_timestamp' => $dbw->timestamp(),
			'translation_progress' => $this->translation['progress'],
			'translation_last_update_by' => $this->translation['lastUpdatedTranslator'],
		];

		if ( $this->translation['status'] === 'published' ) {
			$values['translation_target_url'] = $this->translation['targetURL'];
			$values['translation_target_revision_id'] = $this->translation['targetRevisionId'];
		}

		if ( isset( $options['freshTranslation'] ) && $options['freshTranslation'] === true ) {
			$values['translation_start_timestamp'] = $dbw->timestamp();
			$values['translation_started_by'] = $this->translation['startedTranslator'];
		}

		$dbw->update(
			'cx_translations',
			$values,
			[ 'translation_id' => $this->translation['id'] ],
			__METHOD__
		);
	}

	/**
	 * A convenient abstraction of create and update methods. Checks if
	 * translation exists and chooses either of create or update actions.
	 */
	public function save() {
		$existingTranslation = Translation::find(
			$this->translation['sourceLanguage'],
			$this->translation['targetLanguage'],
			$this->translation['sourceTitle']
		);

		if ( $existingTranslation === null ) {
			$this->create();
			$this->lastSaveWasCreate = true;
		} else {
			$options = [];
			if ( $existingTranslation->translation['status'] === 'deleted' ) {
				// Existing translation is deleted, so this is a fresh start of same
				// language pair and source title.
				$options['freshTranslation'] = true;
			}
			$this->translation['id'] = $existingTranslation->getTranslationId();
			$this->update( $options );
			$this->lastSaveWasCreate = false;
		}
	}

	/**
	 * @return bool Whether the last save() call on this object instance made a new row
	 */
	public function lastSaveWasCreate() {
		return $this->lastSaveWasCreate;
	}

	/*
	 * @param string $sourceLanguage
	 * @param string $targetLanguage
	 * @param string|string[] $titles
	 * @return Translation|Translation[]|null Translation
	 */
	public static function find( $sourceLanguage, $targetLanguage, $titles ) {
		if ( $titles === null || empty( $titles ) ) {
			return null;
		}

		$dbr = Database::getConnection( DB_SLAVE );
		$values = [
			'translation_source_language' => $sourceLanguage,
			'translation_target_language' => $targetLanguage,
			'translation_source_title' => $titles
		];

		$rows = $dbr->select(
			'cx_translations',
			'*',
			$values,
			__METHOD__
		);

		$result = [];

		foreach ( $rows as $row ) {
			$result[] = Translation::newFromRow( $row );
		}

		if ( !is_array( $titles ) ) {
			return isset( $result[0] ) ? $result[0]: null;
		}

		return $result;
	}

	public static function delete( $translationId ) {
		$dbw = Database::getConnection( DB_MASTER );

		$dbw->update(
			'cx_translations',
			[ 'translation_status' => 'deleted' ],
			[ 'translation_id' => $translationId ],
			__METHOD__
		);
	}

	/**
	 * Get the stats for all translations in draft or published status.
	 */
	public static function getStats() {
		return array_merge( Translation::getDraftStats(), Translation::getPublishedStats() );
	}

	/**
	 * Get the stats for all translations in draft status and not having
	 * any published URL.
	 * If the translation is with draft status and has a target_url it
	 * was published atleast once.
	 */
	public static function getDraftStats() {
		$dbr = Database::getConnection( DB_SLAVE );

		$rows = $dbr->select(
			'cx_translations',
			[
				'translation_source_language as sourceLanguage',
				'translation_target_language as targetLanguage',
				'translation_status as status',
				'COUNT(*) AS count',
				'COUNT(DISTINCT translation_started_by) AS translators',
			],
			[
				'translation_status' => 'draft',
				'translation_target_url IS NULL'
			],
			__METHOD__,
			[
				'GROUP BY' => [
					'translation_source_language',
					'translation_target_language',
				],
			]
		);

		$result = [];

		foreach ( $rows as $row ) {
			$result[] = (array) $row;
		}

		return $result;
	}

	/**
	 * Get the stats for all translations in published status or having
	 * a published URL.
	 * If the translation has a target_url it was published atleast once.
	 */
	public static function getPublishedStats() {
		$dbr = Database::getConnection( DB_SLAVE );

		$rows = $dbr->select(
			'cx_translations',
			[
				'translation_source_language as sourceLanguage',
				'translation_target_language as targetLanguage',
				"'published' as status",
				'COUNT(*) AS count',
				'COUNT(DISTINCT translation_started_by) AS translators',
			],
			$dbr->makeList(
				[
					'translation_status' => 'published',
					'translation_target_url IS NOT NULL',
				],
				LIST_OR
			),
			__METHOD__,
			[
				'GROUP BY' => [
					'translation_source_language',
					'translation_target_language',
				],
			]
		);

		$result = [];
		foreach ( $rows as $row ) {
			$result[] = (array) $row;
		}

		return $result;
	}

	/**
	 * Get time-wise cumulative number of deletions for given
	 * language pairs, with given interval.
	 */
	public static function getDeletionTrend( $interval ) {
		$dbr = wfGetDB( DB_SLAVE );

		$conditions = [
			'ct_tag' => 'contenttranslation',
			'ar_rev_id = ct_rev_id'
		];

		$options = null;
		if ( $interval === 'week' ) {
			$options = [
				'GROUP BY' => [
					'YEARWEEK(ar_timestamp)',
				],
			];
		} elseif ( $interval === 'month' ) {
			$options = [
				'GROUP BY' => [
					'YEAR(ar_timestamp), MONTH(ar_timestamp)',
				],
			];
		}

		$rows = $dbr->select(
			[ 'change_tag', 'archive' ],
			[ 'ar_timestamp', 'count(ar_page_id) as count' ],
			$conditions,
			__METHOD__,
			$options
		);

		$count = 0;
		$result = [];
		foreach ( $rows as $row ) {
			$count += (int)$row->count;
			$time = self::getResultTime( $row->ar_timestamp, $interval );
			$result[$time] = [
				'count' => $count,
				'delta' => (int)$row->count,
			];
		}

		return $result;
	}

	protected static function getResultTime( $timestamp, $interval ) {
		$unix = wfTimestamp( TS_UNIX, $timestamp );
		if ( $interval === 'week' ) {
			$n = 7 - date( 'w', $unix );
			$unix = strtotime( "+$n days", $unix );
			return date( 'Y-m-d', $unix );
		} else {
			return date( 'Y-m', $unix );
		}
	}

	/**
	 * Get time-wise cumulative number of translations for given
	 * language pairs, with given interval.
	 *
	 * @param string $source Source language code
	 * @param string $target Target language code
	 * @param string $status Status of translation. Either 'published' or 'draft'
	 * @param string $interval 'weekly' or 'monthly' trend
	 * @return array
	 */
	public static function getTrendByStatus(
		$source, $target, $status, $interval, $translatorId
	) {
		$dbr = Database::getConnection( DB_SLAVE );

		$conditions = [];
		if ( $status === 'published' ) {
			$conditions[] = $dbr->makeList(
				[
					'translation_status' => 'published',
					'translation_target_url IS NOT NULL',
				],
				LIST_OR
			);
		} else {
			$conditions[] = $dbr->makeList(
				[
					'translation_status' => 'draft',
					'translation_target_url IS NULL'
				],
				LIST_AND
			);
		}

		if ( $source !== null ) {
			$conditions['translation_source_language'] = $source;
		}
		if ( $target !== null ) {
			$conditions['translation_target_language'] = $target;
		}
		if ( $translatorId !== null ) {
			$conditions['translation_last_update_by'] = $translatorId;
		}
		$options = null;
		if ( $interval === 'week' ) {
			$options = [
				'GROUP BY' => [
					'YEARWEEK(translation_last_updated_timestamp)',
				],
			];
		} elseif ( $interval === 'month' ) {
			$options = [
				'GROUP BY' => [
					'YEAR(translation_last_updated_timestamp), MONTH(translation_last_updated_timestamp)',
				],
			];
		}

		$rows = $dbr->select(
			[ 'cx_translations' ],
			[ 'translation_last_updated_timestamp as date', 'count(translation_id) as count' ],
			$dbr->makeList( $conditions, LIST_AND ),
			__METHOD__,
			$options
		);

		$count = 0;
		$result = [];
		foreach ( $rows as $row ) {
			$count += (int)$row->count;
			$time = self::getResultTime( $row->date, $interval );
			$result[$time] = [
				'count' => $count,
				'delta' => (int)$row->count,
			];
		}

		return $result;
	}

	public function getTranslationId() {
		return $this->translation['id'];
	}

	public static function newFromId( $translationId ) {
		$dbr = Database::getConnection( DB_SLAVE );

		$rows = $dbr->select(
			[ 'cx_translations', 'cx_drafts' ],
			'*',
			[
				'translation_id' => $translationId,
				'draft_id' => $translationId,
			],
			__METHOD__
		);

		$result = [];

		foreach ( $rows as $row ) {
			$result[] = Translation::newFromRow( $row );
		}

		return $result;
	}

	/**
	 * Get all published translation records.
	 *
	 * @param string $from Source language code
	 * @param string $to Target language code
	 * @param int $limit Number of records to fetch atmost
	 * @param int $offset Offset from which at most $limit records to fetch
	 * @return array
	 */
	public static function getAllPublishedTranslations( $from, $to, $limit, $offset ) {
		$dbr = Database::getConnection( DB_SLAVE );
		$conditions = [ $dbr->makeList(
			[
				'translation_status' => 'published',
				'translation_target_url IS NOT NULL',
			],
			LIST_OR
		) ];

		if ( $from ) {
			$conditions['translation_source_language'] = $from;
		}

		if ( $to ) {
			$conditions['translation_target_language'] = $to;
		}

		$options = [ 'LIMIT' => $limit ];

		if ( $offset ) {
			$options['OFFSET'] = $offset;
		}

		$rows = $dbr->select(
			'cx_translations',
			[
				'translation_id AS translationId',
				'translation_source_title AS sourceTitle',
				'translation_target_title AS targetTitle',
				'translation_source_language AS sourceLanguage',
				'translation_source_revision_id AS sourceRevisionId',
				'translation_target_revision_id AS targetRevisionId',
				'translation_target_language AS targetLanguage',
				'translation_source_url AS sourceURL',
				'translation_target_url AS targetURL',
				'translation_last_updated_timestamp AS publishedDate',
				'translation_progress AS stats',
			],
			$conditions,
			__METHOD__,
			$options
		);

		$result = [];

		foreach ( $rows as $row ) {
			$translation = (array) $row;
			$translation['stats'] = json_decode( $translation['stats'] );
			$result[] = $translation;
		}

		return $result;
	}

	/**
	 * @return Translation
	 */
	public static function newFromRow( $row ) {
		$translation = new Translation( [
			'id' => (int)$row->translation_id,
			'sourceTitle' => $row->translation_source_title,
			'targetTitle' => $row->translation_target_title,
			'sourceLanguage' => $row->translation_source_language,
			'targetLanguage' => $row->translation_target_language,
			'sourceRevisionId' => $row->translation_source_revision_id,
			'targetRevisionId' => $row->translation_target_revision_id,
			'sourceURL' => $row->translation_source_url,
			'targetURL' => $row->translation_target_url,
			'status' => $row->translation_status,
			'startTimestamp' => $row->translation_start_timestamp,
			'lastUpdateTimestamp' => $row->translation_last_updated_timestamp,
			'progress' => $row->translation_progress,
			'startedTranslator' => $row->translation_started_by,
			'lastUpdatedTranslator' => $row->translation_last_update_by,
			'draftContent' => isset( $row->draft_content ) ? $row->draft_content: null,
			'draftTimestamp' => isset( $row->draft_timestamp ) ? $row->draft_timestamp: null,
		] );

		return $translation;
	}
}
