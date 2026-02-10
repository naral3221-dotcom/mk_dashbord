import { CreateCheckoutSessionUseCase } from '@/domain/usecases/CreateCheckoutSessionUseCase';
import { CreatePortalSessionUseCase } from '@/domain/usecases/CreatePortalSessionUseCase';
import { HandleStripeWebhookUseCase } from '@/domain/usecases/HandleStripeWebhookUseCase';
import { GetSubscriptionUseCase } from '@/domain/usecases/GetSubscriptionUseCase';
import {
  CheckFeatureAccessUseCase,
  FeatureKey,
} from '@/domain/usecases/CheckFeatureAccessUseCase';
import {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  CreatePortalRequest,
  CreatePortalResponse,
  SubscriptionResponse,
  UsageResponse,
  toSubscriptionResponse,
} from '../dto/BillingDTO';

export class BillingService {
  constructor(
    private readonly createCheckoutUseCase: CreateCheckoutSessionUseCase,
    private readonly createPortalUseCase: CreatePortalSessionUseCase,
    private readonly handleWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly getSubscriptionUseCase: GetSubscriptionUseCase,
    private readonly checkFeatureAccessUseCase: CheckFeatureAccessUseCase,
  ) {}

  async createCheckout(
    userId: string,
    organizationId: string,
    request: CreateCheckoutRequest,
  ): Promise<CreateCheckoutResponse> {
    const result = await this.createCheckoutUseCase.execute({
      userId,
      organizationId,
      plan: request.plan,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
    });
    return { sessionId: result.sessionId, url: result.url };
  }

  async createPortalSession(
    userId: string,
    organizationId: string,
    request: CreatePortalRequest,
  ): Promise<CreatePortalResponse> {
    const result = await this.createPortalUseCase.execute({
      userId,
      organizationId,
      returnUrl: request.returnUrl,
    });
    return { url: result.url };
  }

  async handleWebhook(
    payload: string,
    signature: string,
  ): Promise<{ eventType: string; processed: boolean }> {
    return this.handleWebhookUseCase.execute({ payload, signature });
  }

  async getSubscription(
    organizationId: string,
  ): Promise<SubscriptionResponse> {
    const result = await this.getSubscriptionUseCase.execute({
      organizationId,
    });
    return toSubscriptionResponse(result);
  }

  async getUsage(organizationId: string): Promise<UsageResponse> {
    const features: FeatureKey[] = [
      'maxAdAccounts',
      'maxUsers',
      'hasAutoSync',
      'hasExports',
    ];

    const checks = await Promise.all(
      features.map(async (feature) => {
        const result = await this.checkFeatureAccessUseCase.execute({
          organizationId,
          feature,
        });
        return { feature, ...result };
      }),
    );

    // Get org plan from subscription response
    const subResult = await this.getSubscriptionUseCase.execute({
      organizationId,
    });

    return {
      plan: subResult.plan,
      features: checks,
    };
  }
}
