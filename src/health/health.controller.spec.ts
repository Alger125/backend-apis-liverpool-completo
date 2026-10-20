import { Test, TestingModule } from '@nestjs/testing';
import { HealthController, HealthResponse } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns the API health status', () => {
    const response: HealthResponse = controller.getHealth();

    expect(response).toEqual({ status: 'ok' });
  });
});
