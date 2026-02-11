import { BillingService } from '@/application/services/BillingService';

export function getBillingService(): BillingService {
  const getPrisma = require('@/infrastructure/database/prisma').default;
  const { PrismaOrganizationRepository } = require('@/infrastructure/repositories/PrismaOrganizationRepository');
  const { PrismaUserRepository } = require('@/infrastructure/repositories/PrismaUserRepository');
  const { PrismaSubscriptionRepository } = require('@/infrastructure/repositories/PrismaSubscriptionRepository');
  const { PrismaBillingEventRepository } = require('@/infrastructure/repositories/PrismaBillingEventRepository');
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository');
  const { StripePaymentGateway } = require('@/infrastructure/external/stripe/StripePaymentGateway');
  const { planFromPriceId } = require('@/infrastructure/external/stripe/stripePriceConfig');
  const { CreateCheckoutSessionUseCase } = require('@/domain/usecases/CreateCheckoutSessionUseCase');
  const { CreatePortalSessionUseCase } = require('@/domain/usecases/CreatePortalSessionUseCase');
  const { HandleStripeWebhookUseCase } = require('@/domain/usecases/HandleStripeWebhookUseCase');
  const { GetSubscriptionUseCase } = require('@/domain/usecases/GetSubscriptionUseCase');
  const { CheckFeatureAccessUseCase } = require('@/domain/usecases/CheckFeatureAccessUseCase');

  const prisma = getPrisma();
  const orgRepo = new PrismaOrganizationRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const subscriptionRepo = new PrismaSubscriptionRepository(prisma);
  const billingEventRepo = new PrismaBillingEventRepository(prisma);
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const paymentGateway = new StripePaymentGateway(
    process.env.STRIPE_SECRET_KEY!,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  const createCheckoutUC = new CreateCheckoutSessionUseCase(userRepo, orgRepo, paymentGateway);
  const createPortalUC = new CreatePortalSessionUseCase(userRepo, orgRepo, paymentGateway);
  const handleWebhookUC = new HandleStripeWebhookUseCase(
    paymentGateway,
    subscriptionRepo,
    billingEventRepo,
    orgRepo,
    planFromPriceId,
  );
  const getSubscriptionUC = new GetSubscriptionUseCase(subscriptionRepo, orgRepo);
  const checkFeatureAccessUC = new CheckFeatureAccessUseCase(orgRepo, adAccountRepo, userRepo);

  return new BillingService(
    createCheckoutUC,
    createPortalUC,
    handleWebhookUC,
    getSubscriptionUC,
    checkFeatureAccessUC,
  );
}
