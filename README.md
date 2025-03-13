# Astra DB Plugin for Genkit

This plugin provides a [Astra DB](https://docs.datastax.com/en/astra-db-serverless/index.html) retriever and indexer for [Genkit](https://firebase.google.com/docs/genkit).

## Installation

```sh
npm i genkitx-astra-db
```

## Prerequisites

You will need a DataStax account in which to run an Astra DB database. You can [sign up for a free DataStax account here](https://astra.datastax.com/signup).

Once you have an account, create a Serverless Vector database. Once the database has been provisioned, create a collection. Ensure that you choose the same number of dimensions as the embedding provider you are going to use.

You will then need the database's API Endpoint, an Application Token and the name of the collection in order to configure the plugin.

## Configuration

To use the Astra DB plugin, specify it when you call `configureGenkit()`.

```typescript
import { genkit } from "genkit";
import { textEmbedding004 } from "@genkit-ai/googleai";
import { astraDB } from "genkitx-astra-db";

configureGenkit({
  plugins: [
    astraDB([
      {
        clientParams: {
          applicationToken: "your_application_token",
          apiEndpoint: "your_astra_db_endpoint",
          keyspace: "default_keyspace",
        },
        collectionName: "your_collection_name",
        embedder: textEmbedding004,
      },
    ]),
  ],
});
```

### Client Parameters

You will need an Application Token and API Endpoint from Astra DB. You can either provide them through the `clientParams` object or by setting the environment variables `ASTRA_DB_APPLICATION_TOKEN` and `ASTRA_DB_API_ENDPOINT`.

If you are using the default namespace, you do not need to pass it as config.

### Options

- `collectionName`: You need to provide a collection name that matches a collection in the database accessed at the API endpoint
- `embedder`: You need to provide an embedder, like Google's `textEmbedding004`. Ensure that you have set up your collection with the correct number of dimensions for the embedder that you are using
- `embedderOptions`: If the embedder takes extra options you can provide them

### Astra DB Vectorize

You do not need to provide an `embedder` as you can use [Astra DB Vectorize](https://docs.datastax.com/en/astra-db-serverless/databases/embedding-generation.html) to generate your vectors. Ensure that you have [set up your collection with an embedding provider](https://docs.datastax.com/en/astra-db-serverless/databases/embedding-generation.html#external-embedding-provider-integrations). You can then skip the `embedder` option:

```typescript
import { genkit } from "genkit";
import { astraDB } from "genkitx-astra-db";

configureGenkit({
  plugins: [
    astraDB([
      {
        clientParams: {
          applicationToken: "your_application_token",
          apiEndpoint: "your_astra_db_endpoint",
          keyspace: "default_keyspace",
        },
        collectionName: "your_collection_name",
      },
    ]),
  ],
});
```

## Usage

Import the indexer and retriever references like so:

```typescript
import { astraDBIndexerRef, astraDBRetrieverRef } from "genkitx-astra-db";
```

Then get a reference using the `collectionName` and an optional `displayName` and pass the relevant references to the Genkit functions `index()` or `retrieve()`.

### Indexer

```typescript
export const astraDBIndexer = astraDBIndexerRef({
  collectionName: "your_collection_name",
});

await index({
  indexer: astraDBIndexer,
  documents,
});
```

### Retriever

```typescript
export const astraDBRetriever = astraDBRetrieverRef({
  collectionName: "your_collection_name",
});

await retrieve({
  retriever: astraDBRetriever,
  query,
});
```

#### Options

You can pass options to `retrieve()` that will affect the retriever. The available options are:

- `k`: The number of documents to return from the retriever. The default is 5.
- `filter`: A `Filter` as defined by the [Astra DB library](https://docs.datastax.com/en/astra-api-docs/_attachments/typescript-client/types/Filter.html). See below for how to use a filter

#### Advanced usage

If you want to perform a vector search with additional filtering (hybrid search) you can pass a schema type to `astraDBRetrieverRef`. For example:

```typescript
type Schema = {
  _id: string;
  text: string;
  score: number;
};

export const astraDBRetriever = astraDBRetrieverRef<Schema>({
  collectionName: "your_collection_name",
});

await retrieve({
  retriever: astraDBRetriever,
  query,
  options: {
    filter: {
      score: { $gt: 75 },
    },
  },
});
```

You can find the [operators that you can use in filters in the Astra DB documentation](https://docs.datastax.com/en/astra-db-serverless/api-reference/overview.html#operators).

If you don't provide a schema type, you can still filter but you won't get type-checking on the filtering options.

## Further information

For more on using indexers and retrievers with Genkit check out the documentation on [Retrieval-Augmented Generation with Genkit](https://firebase.google.com/docs/genkit/rag).
