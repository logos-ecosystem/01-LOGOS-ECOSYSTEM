import { gql } from '@apollo/client';

// User fragments
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    firstName
    lastName
    fullName
    avatar
    role
    isActive
    emailVerified
    twoFactorEnabled
    language
    timezone
    createdAt
    lastLogin
  }
`;

// Product fragments
export const PRODUCT_FRAGMENT = gql`
  fragment ProductFields on Product {
    id
    name
    description
    type
    features
    pricing {
      monthly
      yearly
      currency
    }
    limits {
      apiCalls
      storage
      bandwidth
      users
    }
    status
    averageRating
    createdAt
  }
`;

// Subscription fragments
export const SUBSCRIPTION_FRAGMENT = gql`
  fragment SubscriptionFields on Subscription {
    id
    status
    billingCycle
    currentPeriodStart
    currentPeriodEnd
    cancelAtPeriodEnd
    trialStart
    trialEnd
    createdAt
    product {
      ...ProductFields
    }
  }
  ${PRODUCT_FRAGMENT}
`;

// Auth queries
export const ME_QUERY = gql`
  query Me {
    me {
      ...UserFields
      subscriptions {
        ...SubscriptionFields
      }
    }
  }
  ${USER_FRAGMENT}
  ${SUBSCRIPTION_FRAGMENT}
`;

// Product queries
export const PRODUCTS_QUERY = gql`
  query Products($filter: ProductFilter, $pagination: PaginationInput) {
    products(filter: $filter, pagination: $pagination) {
      edges {
        node {
          ...ProductFields
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      ...ProductFields
      reviews {
        id
        rating
        comment
        createdAt
        user {
          firstName
          lastName
          avatar
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

// Subscription queries
export const MY_SUBSCRIPTIONS_QUERY = gql`
  query MySubscriptions {
    mySubscriptions {
      ...SubscriptionFields
      usage {
        apiCalls
        storage
        bandwidth
        aiTokens
        period
      }
    }
  }
  ${SUBSCRIPTION_FRAGMENT}
`;

// Invoice queries
export const INVOICES_QUERY = gql`
  query Invoices($filter: InvoiceFilter, $pagination: PaginationInput) {
    invoices(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id
          invoiceNumber
          amount
          currency
          status
          dueDate
          paidAt
          createdAt
          downloadUrl
          subscription {
            product {
              name
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
    }
  }
`;

// Support ticket queries
export const TICKETS_QUERY = gql`
  query Tickets($filter: TicketFilter, $pagination: PaginationInput) {
    tickets(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id
          ticketNumber
          subject
          description
          status
          priority
          category
          createdAt
          resolvedAt
          assignedTo {
            firstName
            lastName
          }
          comments {
            id
            comment
            createdAt
            author {
              firstName
              lastName
              avatar
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
    }
  }
`;

// AI Bot queries
export const BOTS_QUERY = gql`
  query Bots($filter: BotFilter, $pagination: PaginationInput) {
    bots(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id
          name
          description
          status
          model {
            name
            provider
            maxTokens
          }
          configuration {
            temperature
            maxTokens
            systemPrompt
          }
          usage {
            totalMessages
            totalTokens
            lastUsed
            averageResponseTime
          }
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      totalCount
    }
  }
`;

// Analytics queries
export const DASHBOARD_QUERY = gql`
  query Dashboard($period: AnalyticsPeriod!) {
    dashboard(period: $period) {
      revenue {
        total
        growth
        chart {
          timestamp
          value
        }
      }
      users {
        total
        active
        new
        chart {
          timestamp
          value
        }
      }
      usage {
        apiCalls
        storage
        bandwidth
        aiTokens
      }
      support {
        openTickets
        avgResponseTime
        satisfactionRate
      }
      bots {
        total
        active
        totalMessages
        avgResponseTime
      }
    }
  }
`;

export const METRICS_QUERY = gql`
  query Metrics($metric: MetricType!, $period: AnalyticsPeriod!, $groupBy: GroupByInterval) {
    metrics(metric: $metric, period: $period, groupBy: $groupBy) {
      metric
      period
      data {
        timestamp
        value
        label
      }
      summary {
        total
        average
        min
        max
        trend
      }
    }
  }
`;

// System queries
export const SYSTEM_HEALTH_QUERY = gql`
  query SystemHealth {
    systemHealth {
      status
      uptime
      lastCheck
      services {
        name
        status
        responseTime
        message
      }
    }
  }
`;

// Webhook queries
export const WEBHOOKS_QUERY = gql`
  query Webhooks {
    webhooks {
      id
      url
      events
      isActive
      lastError
      createdAt
    }
  }
`;