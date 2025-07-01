import { ApolloClient, InMemoryCache, createHttpLink, split, ApolloLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@graphql-transport-ws/client';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// Get environment variables
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/graphql';

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

// Create HTTP link
const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include',
});

// Create WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: () => ({
      authorization: getAuthToken() ? `Bearer ${getAuthToken()}` : '',
    }),
    reconnect: true,
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Auth link - add authorization header
const authLink = setContext((_, { headers }) => {
  const token = getAuthToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle specific errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear token and redirect to login
        setAuthToken(null);
        window.location.href = '/auth/signin';
      }
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    // Handle network errors
    if ('statusCode' in networkError) {
      switch (networkError.statusCode) {
        case 401:
          // Unauthorized - clear token
          setAuthToken(null);
          window.location.href = '/auth/signin';
          break;
        case 503:
          // Service unavailable
          console.error('Service temporarily unavailable');
          break;
      }
    }
  }
});

// Retry link for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors but not auth errors
      return !!error && !error.message.includes('UNAUTHENTICATED');
    },
  },
});

// Split link - use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Combine all links
const link = ApolloLink.from([
  errorLink,
  retryLink,
  authLink,
  splitLink,
]);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Pagination handling for products
          products: {
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.pagination?.page || args.pagination.page === 1) {
                return incoming;
              }
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              };
            },
          },
          // Similar pagination for other lists
          subscriptions: {
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.pagination?.page || args.pagination.page === 1) {
                return incoming;
              }
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              };
            },
          },
        },
      },
      // Normalize cache IDs
      User: {
        keyFields: ['id'],
      },
      Product: {
        keyFields: ['id'],
      },
      Subscription: {
        keyFields: ['id'],
      },
      Invoice: {
        keyFields: ['id'],
      },
      SupportTicket: {
        keyFields: ['id'],
      },
      AIBot: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Helper functions for common operations
export const clearCache = () => {
  apolloClient.clearStore();
};

export const resetCache = () => {
  apolloClient.resetStore();
};

// Export types
export type { ApolloClient } from '@apollo/client';
export { gql, useQuery, useMutation, useSubscription, useLazyQuery } from '@apollo/client';