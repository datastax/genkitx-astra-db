// Copyright DataStax, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { EmbedderArgument } from "genkit/embedder";
import {
  CommonRetrieverOptionsSchema,
  indexerRef,
  retrieverRef,
} from "genkit/retriever";
import { GenkitPlugin, genkitPlugin } from "genkit/plugin";
import { Genkit, GenkitError, z } from "genkit";
import { Md5 } from "ts-md5";
import { DataAPIClient, Filter, SomeDoc } from "@datastax/astra-db-ts";

type AstraDBClientOptions = {
  applicationToken: string;
  apiEndpoint: string;
  keyspace?: string;
};

const PLUGIN_NAME = "astradb";
const DEFAULT_KEYSPACE = "default_keyspace";

const createAstraDBRetrieverOptionsSchema = <Schema extends SomeDoc>() =>
  CommonRetrieverOptionsSchema.extend({
    filter: z.custom<Filter<Schema>>().optional(),
  });

const AstraDBIndexerOptionsSchema = z.object({});

export const astraDBRetrieverRef = <Schema extends SomeDoc>(params: {
  collectionName: string;
  displayName?: string;
}) => {
  return retrieverRef({
    name: `${PLUGIN_NAME}/${params.collectionName}`,
    info: {
      label: params.displayName ?? `Astra DB - ${params.collectionName}`,
    },
    configSchema: createAstraDBRetrieverOptionsSchema<Schema>(),
  });
};

export const astraDBIndexerRef = (params: {
  collectionName: string;
  displayName?: string;
}) => {
  return indexerRef({
    name: `${PLUGIN_NAME}/${params.collectionName}`,
    info: {
      label: params.displayName ?? `Astra DB - ${params.collectionName}`,
    },
    configSchema: AstraDBIndexerOptionsSchema,
  });
};

export function astraDB<EmbedderCustomOptions extends z.ZodTypeAny>(
  params: {
    clientParams?: AstraDBClientOptions;
    collectionName: string;
    embedder?: EmbedderArgument<EmbedderCustomOptions>;
    embedderOptions?: z.infer<EmbedderCustomOptions>;
  }[]
): GenkitPlugin {
  return genkitPlugin(PLUGIN_NAME, async (ai: Genkit) => {
    params.forEach((i) => configureAstraDBRetriever(ai, i));
    params.forEach((i) => configureAstraDBIndexer(ai, i));
  });
}

export function configureAstraDBRetriever<
  Schema extends SomeDoc,
  EmbedderCustomOptions extends z.ZodTypeAny
>(
  ai: Genkit,
  params: {
    clientParams?: AstraDBClientOptions;
    collectionName: string;
    embedder?: EmbedderArgument<EmbedderCustomOptions>;
    embedderOptions?: z.infer<EmbedderCustomOptions>;
  }
) {
  const { collectionName, embedder, embedderOptions } = params;
  const { applicationToken, apiEndpoint } =
    params.clientParams ?? getDefaultConfig();
  const keyspace = params.clientParams?.keyspace ?? DEFAULT_KEYSPACE;

  const client = new DataAPIClient(applicationToken);
  const db = client.db(apiEndpoint, { keyspace });
  const collection = db.collection<Schema>(collectionName);

  return ai.defineRetriever(
    {
      name: `${PLUGIN_NAME}/${collectionName}`,
      configSchema: createAstraDBRetrieverOptionsSchema<Schema>().optional(),
    },
    async (content, options) => {
      let embedding;
      if (embedder) {
        embedding = await ai.embed({
          embedder,
          content,
          options: embedderOptions,
        });
      }
      const filter = options?.filter || {};
      const limit = options?.k || 5;
      const sort = embedding
        ? { $vector: embedding }
        : { $vectorize: content.text };

      const cursor = collection.find(filter, { sort, limit });
      const results = await cursor.toArray();
      const documents = results.map((result) => {
        const { text, metadata } = result;
        return { content: [{ text }], metadata };
      });
      return { documents };
    }
  );
}

export function configureAstraDBIndexer<
  EmbedderCustomOptions extends z.ZodTypeAny
>(
  ai: Genkit,
  params: {
    clientParams?: AstraDBClientOptions;
    collectionName: string;
    embedder?: EmbedderArgument<EmbedderCustomOptions>;
    embedderOptions?: z.infer<EmbedderCustomOptions>;
  }
) {
  const { collectionName, embedder, embedderOptions } = {
    ...params,
  };
  const { applicationToken, apiEndpoint } =
    params.clientParams ?? getDefaultConfig();
  const keyspace = params.clientParams?.keyspace ?? DEFAULT_KEYSPACE;

  const client = new DataAPIClient(applicationToken);
  const db = client.db(apiEndpoint, { keyspace });
  const collection = db.collection(collectionName);

  return ai.defineIndexer(
    {
      name: `${PLUGIN_NAME}/${collectionName}`,
      configSchema: AstraDBIndexerOptionsSchema,
    },
    async (docs) => {
      let documents;

      if (embedder) {
        const embeddings = await Promise.all(
          docs.map((doc) =>
            ai.embed({
              embedder,
              content: doc,
              options: embedderOptions,
            })
          )
        );

        documents = docs.map((doc, i) => ({
          _id: Md5.hashStr(JSON.stringify(doc)),
          text: doc.text,
          $vector: embeddings[i],
          metadata: doc.metadata,
        }));
      } else {
        documents = docs.map((doc) => ({
          _id: Md5.hashStr(JSON.stringify(doc)),
          text: doc.text,
          $vectorize: doc.text,
          metadata: doc.metadata,
        }));
      }

      await collection.updateMany(documents, {}, { upsert: true });
    }
  );
}

function getDefaultConfig(): AstraDBClientOptions {
  const maybeApiKey = process.env.ASTRA_DB_APPLICATION_TOKEN;
  const maybeEndpoint = process.env.ASTRA_DB_API_ENDPOINT;
  if (!maybeApiKey) {
    throw new GenkitError({
      status: "INVALID_ARGUMENT",
      message:
        "Please pass in the API key or set ASTRA_DB_APPLICATION_TOKEN environment variable.\n" +
        "For more details see https://firebase.google.com/docs/genkit/plugins/astraDB",
      source: PLUGIN_NAME,
    });
  }
  if (!maybeEndpoint) {
    throw new GenkitError({
      status: "INVALID_ARGUMENT",
      message:
        "Please pass in the Astra DB API endpoint or set ASTRA_DB_API_ENDPOINT environment variable.\n" +
        "For more details see https://firebase.google.com/docs/genkit/plugins/astraDB",
      source: PLUGIN_NAME,
    });
  }
  return {
    applicationToken: maybeApiKey,
    apiEndpoint: maybeEndpoint,
  };
}
