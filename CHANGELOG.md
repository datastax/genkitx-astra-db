# Changelog for `genkitx-astra-db`

## Ongoing [☰](https://github.com/datastax/genkitx-astra-db/compare/v0.2.0...main)

...

## 0.3.0 (2025-03-13) [☰](https://github.com/datastax/genkitx-astra-db/compare/v0.2.0...v0.3.0)

### Fixed

- Changed upsert back to insert because that didn't work

### Changed

- Support for Genkit v1.0
- Handle multiple embeddings per document

## 0.2.0 (2024-12-19) [☰](https://github.com/datastax/genkitx-astra-db/compare/v0.1.2...v0.2.0)

### Changed

- Updated to Genkit 0.9
- Updated @datastax/astra-db-ts dependency
- Changed terminology from namespace to keyspace

## 0.1.2 (2024-09-04) [☰](https://github.com/datastax/genkitx-astra-db/compare/v0.1.1...v0.1.2)

### Changed

- Changed insert to upsert to avoid errors with ID clashes
- Allows running indexer multiple times on same content

## 0.1.1 (2024-09-04) [☰](https://github.com/datastax/genkitx-astra-db/compare/v0.1.0...v0.1.1)

### Fixed

- Fixed build process for npm publishing

## 0.1.0 (2024-08-13) [☰](https://github.com/datastax/genkitx-astra-db/commits/v0.1.0)

Initial release.

- Astra DB retriever and indexer for Genkit
- Support for storing metadata as filterable object
- Optional embedder argument
