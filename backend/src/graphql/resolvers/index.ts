import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { GraphQLUpload } from 'graphql-upload';
import { merge } from 'lodash';

// Import resolvers
import userResolvers from './user.resolver';
import authResolvers from './auth.resolver';
import productResolvers from './product.resolver';
import subscriptionResolvers from './subscription.resolver';
import invoiceResolvers from './invoice.resolver';
import supportResolvers from './support.resolver';
import botResolvers from './bot.resolver';
import analyticsResolvers from './analytics.resolver';
import webhookResolvers from './webhook.resolver';
import systemResolvers from './system.resolver';

// Custom scalars
const scalarResolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,
};

// Merge all resolvers
const resolvers = merge(
  { ...scalarResolvers },
  authResolvers,
  userResolvers,
  productResolvers,
  subscriptionResolvers,
  invoiceResolvers,
  supportResolvers,
  botResolvers,
  analyticsResolvers,
  webhookResolvers,
  systemResolvers
);

export default resolvers;